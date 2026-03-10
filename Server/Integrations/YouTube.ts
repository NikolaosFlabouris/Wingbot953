import { google, youtube_v3, Auth } from "googleapis";
import * as dotenv from "dotenv";
import {
  handleChatMessage,
  PeriodicYouTubeMessages,
  sendChatMessage,
  Wingbot953Message,
} from "../MessageHandling";
import { UnifiedChatMessage } from "../../Common/UnifiedChatMessage";
import * as fs from "fs";
import open from "open";
import * as http from "node:http";
import { YoutubeLivestreamAlert } from "./Discord";
import { EventBus, EventTypes } from "./EventBus";
import {
  shouldStartPolling as shouldStartPollingLogic,
  shouldSkipApiPolling as shouldSkipApiPollingLogic,
  shouldUpdatePollingInterval,
  microsToAmount,
  stripAtPrefix,
} from "./YouTubeLogic";

// Load environment variables
dotenv.config({ quiet: true });

/**
 * YouTube OAuth scopes required for the application
 */
const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/youtube.force-ssl",
];

/**
 * Interface representing livestream information
 */
interface StreamInfo {
  videoId: string | null;
  title: string | null;
  status: string | null;
}

/**
 * Singleton manager class for YouTube live streaming integration
 *
 * This class manages:
 * - OAuth authentication with YouTube API
 * - Polling for active livestreams from a specific channel
 * - Connecting to and monitoring livestream chat
 * - Processing chat messages into unified format
 * - Automatic reconnection when streams end/start
 *
 * The singleton pattern ensures only one YouTube connection is active
 * and provides centralized state management for the integration.
 *
 * @example
 * ```typescript
 * const youtube = YouTubeManager.getInstance()
 * await youtube.initialise()
 * await youtube.sendMessage("Hello chat!")
 * ```
 */
export class YouTubeManager {
  private static instance: YouTubeManager;

  private server?: http.Server;

  // Authentication state
  private youtubeClient?: youtube_v3.Youtube;
  private oAuth2Client?: Auth.OAuth2Client;
  private isAuthenticated: boolean = false;
  private tokenPath: string = "./Data/Tokens/youtube-tokens.json";

  // Stream state
  private channelId: string | null = null;
  private channelHandle: string = "@Wingman953";
  private activeLivestream?: string;
  private liveChatId?: string;
  private nextPageToken?: string;
  private isMonitoring: boolean = false;

  // Intervals and timers
  private youTubeApiPollingInterval?: NodeJS.Timeout;
  private youTubeChatPollingInterval?: NodeJS.Timeout;
  private periodicMessagesInterval?: NodeJS.Timeout;
  private testInterval?: NodeJS.Timeout;

  // Configuration
  private pollingInterval_ms: number = 30000; // 30 seconds
  private isTestMode: boolean = false;

  // Event bus for inter-manager communication
  private eventBus: EventBus;

  // Twitch stream state tracking
  private isTwitchLive: boolean = false;

  // YouTube polling override state
  private youtubePollingOverride: null | "force_on" | "force_off" = null;

  /**
   * Private constructor to prevent direct instantiation
   * Use getInstance() to get the singleton instance
   */
  private constructor() {
    // Initialize event bus and set up Twitch stream event listeners
    this.eventBus = EventBus.getInstance();
    this.setupTwitchEventListeners();
  }

  /**
   * Gets the singleton instance of YouTubeManager
   * @returns The singleton instance of YouTubeManager
   */
  public static getInstance(): YouTubeManager {
    if (!YouTubeManager.instance) {
      YouTubeManager.instance = new YouTubeManager();
    }
    return YouTubeManager.instance;
  }

  /**
   * Sets up event listeners for Twitch stream state changes
   * YouTube will only poll for active livestreams when Twitch is live
   * @private
   */
  private setupTwitchEventListeners(): void {
    // Listen for Twitch stream started events
    this.eventBus.on(EventTypes.TWITCH_STREAM_STARTED, () => {
      console.log("YouTube: Received Twitch stream started event");
      this.isTwitchLive = true;

      // Start YouTube API polling now that Twitch is live
      if (!this.isMonitoring) {
        this.startApiPollingIfNeeded();
      }
    });

    // Listen for Twitch stream ended events
    this.eventBus.on(EventTypes.TWITCH_STREAM_ENDED, () => {
      console.log("YouTube: Received Twitch stream ended event");
      this.isTwitchLive = false;

      // Stop YouTube API polling since Twitch is no longer live
      if (this.youTubeApiPollingInterval) {
        clearInterval(this.youTubeApiPollingInterval);
        this.youTubeApiPollingInterval = undefined;
        console.log("YouTube: Stopped API polling - Twitch stream ended");
      }
    });
  }

  /**
   * Initialises the YouTube integration with OAuth authentication and starts monitoring
   * @param server HTTP server instance for handling OAuth callback
   * @param testMode Whether to run in test mode (generates fake messages instead of connecting to API)
   */
  public async initialise(
    server: http.Server,
    testMode: boolean = false,
  ): Promise<void> {
    this.server = server;
    this.isTestMode = testMode;
    if (this.isTestMode) {
      // Prevent writes to production data files (e.g. QuizLeaderboards.json)
      process.env.DEBUG = "TRUE";

      console.log(
        "TESTING: Skipping YouTube integration setup, starting test messages...",
      );

      this.testInterval = setInterval(
        () => this.generateTestYouTubeMessage(),
        3000,
      ); // 3secs
      return;
    }

    console.log("YouTube Integration Setup");

    // First ensure the oAuth2Client is properly initialised
    this.oAuth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI,
    );

    try {
      // Check if we have saved tokens
      if (fs.existsSync(this.tokenPath)) {
        console.log("Loading existing tokens...");
        const tokens = JSON.parse(
          fs.readFileSync(this.tokenPath, "utf-8"),
        ) as Auth.Credentials;

        // Set credentials
        this.oAuth2Client.setCredentials(tokens);

        // Verify tokens are still valid by making a test request
        try {
          this.youtubeClient = google.youtube({
            version: "v3",
            auth: this.oAuth2Client,
          });
          await this.youtubeClient.channels.list({
            part: ["snippet"],
            mine: true,
          });
          console.log("Existing tokens are valid.");
          this.isAuthenticated = true;
        } catch {
          console.log(
            "Existing tokens are invalid. Starting new authentication flow...",
          );
          // Continue with new auth flow
          await this.startAuthFlow();
        }
      } else {
        await this.startAuthFlow();
      }
    } catch (error) {
      console.error("Authentication error:", error);
      throw error;
    }

    // Initial check for livestreams
    await this.youTubeApiPolling();

    // Only start polling interval if not already connected to a livestream and Twitch is live
    this.startApiPollingIfNeeded();
  }

  /**
   * Start the OAuth2 authentication flow using the provided server
   * @private
   * @param server The HTTP server instance to handle OAuth callback
   * @returns Promise that resolves when authentication is complete
   */
  private async startAuthFlow(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Add request listener to the existing server to handle YouTube OAuth callback
      const originalListeners = this.server!.listeners("request");

      // Create our request handler
      const youtubeHandler = async (
        req: http.IncomingMessage,
        res: http.ServerResponse,
      ) => {
        try {
          const parsedUrl = new URL(req.url || "/", `http://localhost:3000`);
          const pathname = parsedUrl.pathname;

          // Handle the OAuth2 callback
          if (pathname === "/youtube/callback") {
            // Extract the authorization code from query parameters
            const code = parsedUrl.searchParams.get("code");

            if (!code) {
              res.writeHead(400, { "Content-Type": "text/plain" });
              res.end("Missing authorization code");
              return;
            }

            try {
              // Exchange the authorization code for tokens
              const { tokens } = await this.oAuth2Client!.getToken(code);

              // Set the credentials
              this.oAuth2Client!.setCredentials(tokens);

              this.youtubeClient = google.youtube({
                version: "v3",
                auth: this.oAuth2Client,
              });

              // Save tokens to file
              fs.writeFileSync(this.tokenPath, JSON.stringify(tokens, null, 2));
              console.log("Tokens saved to:", this.tokenPath);

              this.isAuthenticated = true;

              // Send success response
              res.writeHead(200, { "Content-Type": "text/html" });
              res.end(`
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>YouTube Authentication Complete</title>
                    <style>
                      body { 
                        font-family: Arial, sans-serif; 
                        text-align: center; 
                        padding: 50px;
                        background: linear-gradient(135deg, #FF0000, #CC0000);
                        color: white;
                        margin: 0;
                      }
                      .container {
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 15px;
                        padding: 40px;
                        max-width: 500px;
                        margin: 0 auto;
                        backdrop-filter: blur(10px);
                      }
                      .success { 
                        color: #FF0000; 
                        font-size: 2.5em;
                        margin-bottom: 20px;
                      }
                      h2 { 
                        margin-bottom: 30px; 
                        font-size: 1.5em;
                      }
                      p { 
                        font-size: 1.2em; 
                        margin-bottom: 30px;
                      }
                      #countdown { 
                        font-weight: bold; 
                        color: #FF0000;
                        font-size: 1.3em;
                      }
                      button {
                        background: #FF0000;
                        color: white;
                        border: none;
                        padding: 15px 30px;
                        font-size: 1.1em;
                        border-radius: 25px;
                        cursor: pointer;
                        transition: background 0.3s;
                      }
                      button:hover {
                        background: #CC0000;
                      }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="success">✓</div>
                      <h2>YouTube Authentication Successful</h2>
                      <p>Wingbot953 is now connected to YouTube!</p>
                      <p>This window will close in <span id="countdown">3</span> seconds...</p>
                      <button onclick="window.close()">Close Now</button>
                    </div>
                    
                    <script>
                      let count = 3;
                      const countdown = document.getElementById('countdown');
                      
                      const timer = setInterval(() => {
                        count--;
                        countdown.textContent = count;
                        
                        if (count <= 0) {
                          clearInterval(timer);
                          window.close();
                          setTimeout(() => {
                            document.querySelector('.container').innerHTML = 
                              '<div class="success">✓</div><h2>Please close this tab manually</h2><p>Authentication completed successfully!</p>';
                          }, 500);
                        }
                      }, 1000);
                    </script>
                  </body>
                </html>
              `);

              resolve();
            } catch (tokenError) {
              console.error("Error getting tokens:", tokenError);
              res.writeHead(500, { "Content-Type": "text/html" });
              res.end(`
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>YouTube Authentication Failed</title>
                    <style>
                      body { 
                        font-family: Arial, sans-serif; 
                        text-align: center; 
                        padding: 50px;
                        background: linear-gradient(135deg, #FF4444, #AA0000);
                        color: white;
                        margin: 0;
                      }
                      .container {
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 15px;
                        padding: 40px;
                        max-width: 500px;
                        margin: 0 auto;
                        backdrop-filter: blur(10px);
                      }
                      .error { 
                        color: #FF4444; 
                        font-size: 2.5em;
                        margin-bottom: 20px;
                      }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="error">✗</div>
                      <h2>YouTube Authentication Failed</h2>
                      <p>Please try again.</p>
                      <button onclick="window.close()">Close Window</button>
                    </div>
                  </body>
                </html>
              `);
              reject(
                tokenError instanceof Error
                  ? tokenError
                  : new Error(String(tokenError)),
              );
            }
            return; // We handled this request
          }

          // If it's not a YouTube callback, pass to original handlers
          for (const listener of originalListeners) {
            if (typeof listener === "function") {
              try {
                listener.call(this.server, req, res);
                return; // Successfully handled by original listener
              } catch {
                // Continue to next listener if this one fails
                continue;
              }
            }
          }

          // If no original handlers could handle the request and response isn't sent yet
          if (!res.headersSent) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not Found");
          }
        } catch (e) {
          console.error("Server error:", e);
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Server error");
          }
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      };

      // Remove all existing listeners and add our handler
      this.server!.removeAllListeners("request");
      this.server!.on(
        "request",
        (...args: Parameters<typeof youtubeHandler>) =>
          void youtubeHandler(...args),
      );

      // Generate the auth URL
      const authUrl = this.oAuth2Client!.generateAuthUrl({
        access_type: "offline",
        scope: YOUTUBE_SCOPES,
        prompt: "consent", // Force consent screen to ensure refresh token
      });

      console.log("Opening browser to:", authUrl);

      // Open the auth URL in the default browser
      open(authUrl, { app: { name: "chrome" } }).catch(() => {
        console.error("Failed to open browser automatically.");
        console.log("Please open this URL manually:", authUrl);
      });
    });
  }

  /**
   * Refresh the access token using the refresh token
   * @private
   * @returns Promise that resolves with new tokens
   */
  private async refreshToken(): Promise<void> {
    try {
      if (!this.oAuth2Client?.credentials.refresh_token) {
        throw new Error("No refresh token available. Please re-authenticate.");
      }

      const { credentials } = await this.oAuth2Client.refreshAccessToken();

      // Preserve the refresh token if a new one wasn't provided
      if (
        !credentials.refresh_token &&
        this.oAuth2Client.credentials.refresh_token
      ) {
        credentials.refresh_token = this.oAuth2Client.credentials.refresh_token;
      }

      // Update the client with new tokens
      this.oAuth2Client.setCredentials(credentials);

      // Save the updated tokens
      fs.writeFileSync(this.tokenPath, JSON.stringify(credentials, null, 2));
      console.log("YouTube Tokens refreshed and saved.");

      this.isAuthenticated = true;
    } catch (error) {
      console.error("Error refreshing YouTube token:", error);
      this.isAuthenticated = false;
      throw error;
    }
  }

  /**
   * Start API polling interval based on override state or Twitch status
   * @private
   */
  private startApiPollingIfNeeded(): void {
    // Clear any existing polling interval
    if (this.youTubeApiPollingInterval) {
      clearInterval(this.youTubeApiPollingInterval);
      this.youTubeApiPollingInterval = undefined;
    }

    const shouldStart = shouldStartPollingLogic(
      this.youtubePollingOverride,
      this.isTwitchLive,
      this.isMonitoring,
    );

    if (this.youtubePollingOverride === "force_on") {
      console.log("YouTube: Polling override set to ON");
    } else if (this.youtubePollingOverride === "force_off") {
      console.log("YouTube: Polling override set to OFF");
    } else {
      console.log(
        `YouTube: Auto mode - Twitch is ${
          this.isTwitchLive ? "live" : "not live"
        }`,
      );
    }

    if (shouldStart) {
      this.youTubeApiPollingInterval = setInterval(
        () => void this.youTubeApiPolling(),
        120000,
      ); // 120secs
      console.log("YouTube: Started API polling interval");
    } else if (this.isMonitoring) {
      console.log(
        "YouTube: Already monitoring a livestream, discovery polling not needed",
      );
    } else {
      console.log("YouTube: Stream discovery polling not started");
    }
  }

  /**
   * Polls the YouTube API for active livestreams and connects when found
   * Only polls when Twitch stream is active to reduce unnecessary API calls
   * @private
   */
  private async youTubeApiPolling(): Promise<void> {
    try {
      // Skip polling if already monitoring a livestream
      if (this.isMonitoring) {
        console.log(
          "YouTube: Skipping API polling - already monitoring livestream",
        );
        return;
      }

      const shouldSkip = shouldSkipApiPollingLogic(
        this.youtubePollingOverride,
        this.isTwitchLive,
        this.isMonitoring,
        !!this.youTubeApiPollingInterval,
      );

      if (shouldSkip) {
        if (this.youtubePollingOverride === "force_off") {
          console.log("YouTube: Skipping API polling - forced OFF by override");
        } else if (!this.isTwitchLive) {
          console.log(
            "YouTube: Skipping API polling - Twitch stream is not live (auto mode)",
          );
        }
      }

      if (shouldSkip) {
        return;
      }

      if (!this.isMonitoring) {
        // Search for the channel using the handle as a query
        if (!this.youtubeClient) {
          console.error("YouTube client not initialised");
          return;
        }

        if (!this.channelId) {
          const searchResponse = await this.youtubeClient.search.list({
            q: this.channelHandle,
            type: ["channel"],
            part: ["id", "snippet"],
            maxResults: 1,
          });

          if (
            searchResponse.data.items &&
            searchResponse.data.items.length > 0
          ) {
            this.channelId = searchResponse.data.items[0].id?.channelId || null;
            console.log(
              `Found channel ID for handle ${this.channelHandle}: ${this.channelId}`,
            );
          }

          if (!this.channelId) {
            console.error(
              `Channel ID not found for handle: ${this.channelHandle}`,
            );
            return;
          }
        }

        const streamInfo = await this.getCurrentLivestream(this.channelId);

        if (
          streamInfo.videoId === null ||
          streamInfo.title === null ||
          streamInfo.status === null ||
          streamInfo.status !== "active"
        ) {
          console.log("YouTube: No active livestream found");
          return;
        }

        // Connect to YouTube livestream and start monitoring
        const connected = await this.connectAndStartMonitoring(
          streamInfo.videoId,
        );

        if (!connected) {
          console.error(`Failed to connect to YouTube Livestream`);
          // Don't exit the entire process - just log error and continue polling
          console.log("Will retry on next polling interval");
        }
      }
    } catch (error: unknown) {
      console.log(
        "YouTube: CATCH: Failed to reach YouTube API. Trying to refresh token.",
      );
      console.error(
        "YouTube API Polling Error:",
        error instanceof Error ? error.message : error,
      );

      try {
        await this.refreshToken();
      } catch (refreshError: unknown) {
        console.error(
          "YouTube token refresh failed:",
          refreshError instanceof Error ? refreshError.message : refreshError,
        );
        this.isAuthenticated = false;
      }
    }
  }

  /**
   * Get the current active livestream ID for a channel
   * @private
   * @param channelId YouTube channel ID
   * @returns Promise with stream information
   */
  private async getCurrentLivestream(channelId: string): Promise<StreamInfo> {
    try {
      if (!this.youtubeClient) {
        throw new Error("YouTube client not initialised");
      }

      // Use Search API to find live videos for the specific channel (100 quota units)
      // This is necessary because liveBroadcasts.list only works for authenticated user's own broadcasts
      const searchResponse = await this.youtubeClient.search.list({
        channelId: channelId,
        eventType: "live", // Only live broadcasts
        type: ["video"],
        part: ["id", "snippet"],
        maxResults: 5,
        order: "date",
      });

      if (searchResponse.data.items && searchResponse.data.items.length > 0) {
        // Found live broadcasts - return the first one (most recent)
        const liveVideo = searchResponse.data.items[0];
        return {
          videoId: liveVideo.id?.videoId || null,
          title: liveVideo.snippet?.title || null,
          status: "active",
        };
      }

      // No livestreams found
      return {
        videoId: null,
        title: null,
        status: null,
      };
    } catch (error) {
      console.error("Error getting livestream ID:", error);

      return {
        videoId: null,
        title: null,
        status: null,
      };
    }
  }

  /**
   * Connect to a YouTube livestream and start monitoring chat
   * @private
   * @param videoId The YouTube video ID of the livestream
   * @returns Promise that resolves to true if connection and monitoring started successfully
   */
  private async connectAndStartMonitoring(videoId: string): Promise<boolean> {
    try {
      if (!this.youtubeClient) {
        console.error("YouTube client not initialised");
        return false;
      }

      // First, verify that the video is actually a live broadcast
      const videoResponse = await this.youtubeClient.videos.list({
        id: [videoId],
        part: [
          "snippet",
          "liveStreamingDetails",
          "contentDetails" /*, "gameInfo"*/,
        ],
      });

      // Check if video exists
      if (!videoResponse.data.items || videoResponse.data.items.length === 0) {
        throw new Error(`Video with ID ${videoId} not found`);
      }

      const video = videoResponse.data.items[0];

      if (
        !video.liveStreamingDetails ||
        !video.liveStreamingDetails.activeLiveChatId
      ) {
        console.error(`No active livestream found for video ID ${videoId}`);
        return false;
      }

      // Set connection state
      this.activeLivestream = videoId;
      this.liveChatId = video.liveStreamingDetails.activeLiveChatId;
      this.isMonitoring = true;
      this.nextPageToken = undefined;

      console.log(`Connected to YouTube livestream: ${video.snippet?.title}`);
      console.log(`Live chat ID: ${this.liveChatId}`);

      // Stop API polling since we're now connected to a livestream
      if (this.youTubeApiPollingInterval) {
        clearInterval(this.youTubeApiPollingInterval);
        this.youTubeApiPollingInterval = undefined;
        console.log("Stopped YouTube API polling - connected to livestream");
      }

      // Start chat monitoring
      await this.pollLiveChatMessages();
      this.setChatPollingInterval();

      // Start periodic messages
      if (this.periodicMessagesInterval) {
        clearInterval(this.periodicMessagesInterval);
      }
      this.periodicMessagesInterval = setInterval(
        PeriodicYouTubeMessages,
        3300000,
      ); // 55mins

      // Send Discord notification
      YoutubeLivestreamAlert(
        video.snippet?.title || "Livestream",
        "",
        `https://www.youtube.com/watch?v=${videoId}`,
      );

      const startStreamMessage: UnifiedChatMessage =
        structuredClone(Wingbot953Message);
      startStreamMessage.platform = "youtube";
      startStreamMessage.message.text = `Good luck and have fun Streamer!`;
      sendChatMessage(startStreamMessage);

      console.log(`Started monitoring YouTube chat.`);

      return true;
    } catch (error) {
      console.error("Error connecting to YouTube livestream:", error);
      return false;
    }
  }

  /**
   * Set the chat polling interval
   * @param interval_ms Polling interval in milliseconds (defaults to current setting)
   */
  public setChatPollingInterval(interval_ms: number = 30000): void {
    this.pollingInterval_ms = interval_ms;
    // Set up interval to poll for new messages
    if (this.youTubeChatPollingInterval) {
      clearInterval(this.youTubeChatPollingInterval);
    }
    this.youTubeChatPollingInterval = setInterval(
      () => void this.pollLiveChatMessages(),
      interval_ms,
    );
  }

  /**
   * Stop monitoring YouTube livestream chat
   * @private
   */
  private stopMonitoring(): void {
    if (this.youTubeChatPollingInterval) {
      clearInterval(this.youTubeChatPollingInterval);
      this.youTubeChatPollingInterval = undefined;
    }

    if (this.periodicMessagesInterval) {
      clearInterval(this.periodicMessagesInterval);
      this.periodicMessagesInterval = undefined;
    }

    this.isMonitoring = false;
    this.liveChatId = undefined;
    this.nextPageToken = undefined;
    console.log("YouTube: Stopped monitoring chat");

    // Restart API polling to look for new livestreams (only if Twitch is still live)
    this.startApiPollingIfNeeded();
  }

  /**
   * Poll for new YouTube livestream chat messages
   * @private
   */
  private async pollLiveChatMessages(): Promise<void> {
    if (!this.liveChatId) return;

    try {
      if (!this.youtubeClient) {
        console.error("YouTube client not initialised");
        return;
      }

      const response = await this.youtubeClient.liveChatMessages.list({
        liveChatId: this.liveChatId,
        part: ["snippet", "authorDetails"],
        pageToken: this.nextPageToken,
      });

      const { data } = response;
      const recommendedPollingInterval: number | null | undefined =
        data.pollingIntervalMillis;

      // Update polling interval if recommended differs significantly from current
      if (
        shouldUpdatePollingInterval(
          recommendedPollingInterval,
          this.pollingInterval_ms,
        )
      ) {
        console.log(
          `Updating polling interval to ${recommendedPollingInterval}ms (suggested by API)`,
        );
        this.setChatPollingInterval(recommendedPollingInterval!);
      }

      // Save the next page token for subsequent requests
      this.nextPageToken = data.nextPageToken || undefined;

      // Process each message
      if (data.items && data.items.length > 0) {
        data.items.forEach((item) => this.processYouTubeMessage(item));
      }
    } catch (error: unknown) {
      console.error("Error polling live chat messages:", error);

      // Check for specific error conditions that indicate stream ended
      const errMsg = error instanceof Error ? error.message : "";
      const errCode = (error as { code?: number }).code;
      if (
        errCode === 404 ||
        errMsg.includes("Chat ended") ||
        errMsg.includes("disabled")
      ) {
        console.log("Stream chat has ended, stopping monitoring");
        this.stopMonitoring();
      }
    }
  }

  /**
   * Process a single YouTube chat message and convert to unified format
   * @private
   * @param item The YouTube chat message item
   */
  private processYouTubeMessage(item: youtube_v3.Schema$LiveChatMessage): void {
    if (!item.snippet || !item.authorDetails) return;

    const snippet = item.snippet;
    const authorDetails = item.authorDetails;

    const unifiedMessage: UnifiedChatMessage = {
      id: item.id || "",
      platform: "youtube",
      timestamp: new Date(snippet.publishedAt || ""),
      channel: {
        id: authorDetails.channelId || "",
        name: authorDetails.displayName || "",
      },
      author: {
        id: authorDetails.channelId || "",
        name: stripAtPrefix(authorDetails.displayName || ""),
        displayName: authorDetails.displayName || "",
        isModerator: authorDetails.isChatModerator || false,
        isSubscriber: authorDetails.isChatSponsor || false,
        isOwner: authorDetails.isChatOwner || false,
      },
      message: {
        text: "",
      },
    };

    // Handle different message types
    if (snippet.type === "textMessageEvent" && snippet.textMessageDetails) {
      unifiedMessage.message.text =
        snippet.textMessageDetails.messageText || "";
    } else if (snippet.type === "superChatEvent" && snippet.superChatDetails) {
      unifiedMessage.message.text = snippet.superChatDetails.userComment || "";
      unifiedMessage.youtubeSpecific = {
        isSuperChat: true,
        superChatDetails: {
          amount: microsToAmount(snippet.superChatDetails.amountMicros || "0"),
          currency: snippet.superChatDetails.currency || "USD",
          color: snippet.superChatDetails.tier?.toString() || "", // YouTube uses tiers instead of color directly
        },
      };
    }

    // Pass the message to the handler
    handleChatMessage(unifiedMessage);
  }

  /**
   * Set the YouTube polling override mode
   * @param mode Override mode: 'force_on', 'force_off', or null for auto mode
   */
  public setPollingOverride(mode: null | "force_on" | "force_off"): void {
    const oldMode = this.youtubePollingOverride;
    this.youtubePollingOverride = mode;

    console.log(`YouTube: Polling override changed from ${oldMode} to ${mode}`);

    // Restart polling logic with new override
    this.startApiPollingIfNeeded();
  }

  /**
   * Get the current YouTube polling status
   * @returns Object with override mode and current polling state
   */
  public getPollingStatus(): {
    overrideMode: null | "force_on" | "force_off";
    isPolling: boolean;
    isMonitoring: boolean;
    isTwitchLive: boolean;
  } {
    return {
      overrideMode: this.youtubePollingOverride,
      isPolling: !!this.youTubeApiPollingInterval,
      isMonitoring: this.isMonitoring,
      isTwitchLive: this.isTwitchLive,
    };
  }

  /**
   * Send a message to the currently active YouTube livestream chat
   * @param message The message text to send
   * @returns Promise that resolves to true if message was sent successfully
   */
  public async sendMessage(message: string): Promise<boolean> {
    try {
      if (!this.youtubeClient) {
        console.error("YouTube client not initialised");
        return false;
      }

      if (!this.liveChatId) {
        //console.error("No active livestream chat to send message to");
        return false;
      }

      await this.youtubeClient.liveChatMessages.insert({
        part: ["snippet"],
        requestBody: {
          snippet: {
            liveChatId: this.liveChatId,
            type: "textMessageEvent",
            textMessageDetails: {
              messageText: message,
            },
          },
        },
      });

      return true;
    } catch (error: unknown) {
      console.error("Error sending chat message:", error);

      // Check for specific error types
      const errResponse = (
        error as { response?: { status: number; data: unknown } }
      ).response;
      if (errResponse) {
        console.error("Response status:", errResponse.status);
        console.error("Response data:", errResponse.data);

        // Handle rate limiting
        if (errResponse.status === 403) {
          console.error(
            "Rate limited or permission denied. Check your quota and permissions.",
          );
        }
      }

      return false;
    }
  }

  /**
   * Test data for generating fake YouTube messages
   */
  private readonly testUsernames: string[] = [
    "Short",
    "LoooooongUserName",
    "ThisIsAReallyLongUserNameThatIsInfactQuiteLongAndShouldBeTested",
    "SimulatedViewer",
    "HaloFan2024",
    "SpeedrunWatcher",
    "QuizChamp",
    "CasualChatter",
  ];

  private readonly testMessages: string[] = [
    "Hello, this is a test message!",
    "This is another test message.",
    "Testing, testing, 1, 2, 3...",
    "Super Chat Test!",
    "This is a very long message that should be truncated in the UI because it exceeds the maximum character limit for a single chat message.",
    "!quiz",
    "!discord",
    "!faq",
    "!lurk",
    "!odst",
    "!quote",
    "GG streamer!",
    "This run is looking good",
    "is this a PB pace?",
    "lol nice one",
  ];

  /**
   * Generate a test YouTube message for testing purposes
   * @private
   */
  private generateTestYouTubeMessage(): void {
    const name =
      this.testUsernames[Math.floor(Math.random() * this.testUsernames.length)];
    const messageText =
      this.testMessages[Math.floor(Math.random() * this.testMessages.length)];

    const unifiedMessage: UnifiedChatMessage = {
      id: `test-${Date.now()}-${Math.random()}`,
      platform: "youtube",
      timestamp: new Date(),
      channel: {
        id: "test-channel-id",
        name: "Wingman953",
      },
      author: {
        id: `test-user-${Math.random()}`,
        name: name,
        displayName: name,
        isModerator: Math.random() < 0.1, // 10% chance to be moderator
        isSubscriber: Math.random() < 0.3, // 30% chance to be subscriber
        isOwner: false,
      },
      message: {
        text: messageText,
      },
    };

    // Pass the message to the handler
    handleChatMessage(unifiedMessage);
  }

  /**
   * Clean up resources when manager is no longer needed
   */
  public dispose(): void {
    // Clear all intervals
    if (this.youTubeApiPollingInterval) {
      clearInterval(this.youTubeApiPollingInterval);
      this.youTubeApiPollingInterval = undefined;
    }

    if (this.youTubeChatPollingInterval) {
      clearInterval(this.youTubeChatPollingInterval);
      this.youTubeChatPollingInterval = undefined;
    }

    if (this.periodicMessagesInterval) {
      clearInterval(this.periodicMessagesInterval);
      this.periodicMessagesInterval = undefined;
    }

    if (this.testInterval) {
      clearInterval(this.testInterval);
      this.testInterval = undefined;
    }

    // Reset state
    this.stopMonitoring();
    this.isAuthenticated = false;
    this.channelId = null;
    this.activeLivestream = undefined;
  }
}
