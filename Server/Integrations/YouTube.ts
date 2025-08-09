import { google, youtube_v3 } from "googleapis";
import * as dotenv from "dotenv";
import { handleChatMessage, PeriodicYouTubeMessages } from "../MessageHandling";
import { UnifiedChatMessage } from "../../Common/UnifiedChatMessage";
import * as fs from "fs";
import open from "open";
import * as http from "node:http";
import { YoutubeLivestreamAlert } from "./Discord";

// Load environment variables
dotenv.config();

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
  private oAuth2Client?: any;
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

  /**
   * Private constructor to prevent direct instantiation
   * Use getInstance() to get the singleton instance
   */
  private constructor() {}

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
   * Initialises the YouTube integration with OAuth authentication and starts monitoring
   * @param server HTTP server instance for handling OAuth callback
   * @param testMode Whether to run in test mode (generates fake messages instead of connecting to API)
   */
  public async initialise(
    server: http.Server,
    testMode: boolean = false
  ): Promise<void> {
    this.server = server;
    this.isTestMode = testMode;
    if (this.isTestMode) {
      console.log(
        "TESTING: Skipping YouTube integration setup, starting test messages..."
      );

      this.testInterval = setInterval(
        () => this.generateTestYouTubeMessage(),
        3000
      ); // 3secs
      return;
    }

    console.log("YouTube Integration Setup");

    // First ensure the oAuth2Client is properly initialised
    this.oAuth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI
    );

    try {
      // Check if we have saved tokens
      if (fs.existsSync(this.tokenPath)) {
        console.log("Loading existing tokens...");
        const tokens = JSON.parse(fs.readFileSync(this.tokenPath, "utf-8"));

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
        } catch (e) {
          console.log(
            "Existing tokens are invalid. Starting new authentication flow..."
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

    // Start monitoring for livestreams
    await this.youTubeApiPolling();

    // Clear any existing polling interval
    if (this.youTubeApiPollingInterval) {
      clearInterval(this.youTubeApiPollingInterval);
    }

    this.youTubeApiPollingInterval = setInterval(
      () => this.youTubeApiPolling(),
      120000
    ); // 120secs
  }

  /**
   * Start the OAuth2 authentication flow using the provided server
   * @private
   * @param server The HTTP server instance to handle OAuth callback
   * @returns Promise that resolves when authentication is complete
   */
  private async startAuthFlow(): Promise<any> {
    return new Promise((resolve, reject) => {
      // Add request listener to the existing server to handle YouTube OAuth callback
      const originalListeners = this.server!.listeners("request");

      // Create our request handler
      const youtubeHandler = async (
        req: http.IncomingMessage,
        res: http.ServerResponse
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
              const { tokens } = await this.oAuth2Client.getToken(code);

              // Set the credentials
              this.oAuth2Client.setCredentials(tokens);

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

              resolve(tokens);
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
              reject(tokenError);
            }
            return; // We handled this request
          }

          // If it's not a YouTube callback, pass to original handlers
          for (const listener of originalListeners) {
            if (typeof listener === "function") {
              try {
                listener.call(this.server, req, res);
                return; // Successfully handled by original listener
              } catch (err) {
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
          reject(e);
        }
      };

      // Remove all existing listeners and add our handler
      this.server!.removeAllListeners("request");
      this.server!.on("request", youtubeHandler);

      // Generate the auth URL
      const authUrl = this.oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: YOUTUBE_SCOPES,
        prompt: "consent", // Force consent screen to ensure refresh token
      });

      console.log("Opening browser to:", authUrl);

      // Open the auth URL in the default browser
      open(authUrl, { app: { name: "chrome" } }).catch((e) => {
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
  private async refreshToken(): Promise<any> {
    try {
      if (!this.oAuth2Client?.credentials.refresh_token) {
        throw new Error("No refresh token available. Please re-authenticate.");
      }

      const refreshResponse = await this.oAuth2Client.refreshToken(
        this.oAuth2Client.credentials.refresh_token as string
      );

      const newTokens = refreshResponse.tokens;

      // Preserve the refresh token if a new one wasn't provided
      if (
        !newTokens.refresh_token &&
        this.oAuth2Client.credentials.refresh_token
      ) {
        newTokens.refresh_token = this.oAuth2Client.credentials.refresh_token;
      }

      // Update the client with new tokens
      this.oAuth2Client.setCredentials(newTokens);

      // Save the updated tokens
      fs.writeFileSync(this.tokenPath, JSON.stringify(newTokens, null, 2));
      console.log("YouTube Tokens refreshed and saved.");

      this.isAuthenticated = true;
      return newTokens;
    } catch (error) {
      console.error("Error refreshing YouTube token:", error);
      this.isAuthenticated = false;
      throw error;
    }
  }

  /**
   * Polls the YouTube API for active livestreams and connects when found
   * @private
   */
  private async youTubeApiPolling(): Promise<void> {
    try {
      if (!this.isMonitoring) {
        // Search for the channel using the handle as a query
        if (!this.youtubeClient) {
          console.error("YouTube client not initialised");
          return;
        }

        const searchResponse = await this.youtubeClient.search.list({
          q: this.channelHandle,
          type: ["channel"],
          part: ["id", "snippet"],
          maxResults: 1,
        });

        if (searchResponse.data.items && searchResponse.data.items.length > 0) {
          this.channelId = searchResponse.data.items[0].id?.channelId || null;
        }

        if (!this.channelId) {
          console.error(
            `Channel ID not found for handle: ${this.channelHandle}`
          );
          return;
        }

        const streamInfo = await this.getCurrentLivestream(this.channelId);

        if (
          streamInfo.videoId === null ||
          streamInfo.title === null ||
          streamInfo.status === null ||
          streamInfo.status !== "active"
        ) {
          console.log("No active livestream found");
          return;
        }

        // Connect to YouTube livestream
        const connected = await this.connectToYouTubeLivestream(
          streamInfo.videoId
        );

        if (connected) {
          console.log("Connected to YouTube livestream");
          // Start monitoring chat
          await this.startMonitoring();
        } else {
          console.error(`Failed to connect to YouTube Livestream`);
          // Don't exit the entire process - just log error and continue polling
          console.log("Will retry on next polling interval");
        }
      }
    } catch (error: any) {
      console.log(
        "CATCH: Failed to reach YouTube API. Trying to refresh token."
      );
      console.error("API Polling Error:", error.message);

      try {
        await this.refreshToken();
      } catch (refreshError: any) {
        console.error("Token refresh failed:", refreshError.message);
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

      // Method 1: Search for live videos from the channel
      const searchResponse = await this.youtubeClient.search.list({
        channelId: channelId,
        eventType: "live",
        type: ["video"],
        part: ["id", "snippet"],
        maxResults: 1,
      });

      if (searchResponse.data.items && searchResponse.data.items.length > 0) {
        const videoId = searchResponse.data.items[0].id?.videoId || null;
        const title = searchResponse.data.items[0].snippet?.title || null;

        // If found via search, return with active status
        return {
          videoId,
          title,
          status: "active",
        };
      }

      // Method 2: Get all broadcasts for the channel to check for scheduled or recently ended streams
      const broadcastsResponse = await this.youtubeClient.liveBroadcasts.list({
        broadcastStatus: "all", // Check active, completed, and upcoming
        part: ["id", "snippet", "status"],
        maxResults: 10,
      });

      if (
        broadcastsResponse.data.items &&
        broadcastsResponse.data.items.length > 0
      ) {
        // First, check for any active streams
        const activeBroadcast = broadcastsResponse.data.items.find(
          (item) => item.status?.lifeCycleStatus === "live"
        );

        if (activeBroadcast) {
          return {
            videoId: activeBroadcast.id || null,
            title: activeBroadcast.snippet?.title || null,
            status: "active",
          };
        }

        // Next, check for upcoming streams
        const upcomingBroadcast = broadcastsResponse.data.items.find(
          (item) =>
            item.status?.lifeCycleStatus === "ready" ||
            item.status?.lifeCycleStatus === "testStarting" ||
            item.status?.lifeCycleStatus === "testing"
        );

        if (upcomingBroadcast) {
          return {
            videoId: upcomingBroadcast.id || null,
            title: upcomingBroadcast.snippet?.title || null,
            status: "upcoming",
          };
        }

        // Finally, return the most recently completed stream
        const recentBroadcast = broadcastsResponse.data.items.find(
          (item) => item.status?.lifeCycleStatus === "complete"
        );

        if (recentBroadcast) {
          return {
            videoId: recentBroadcast.id || null,
            title: recentBroadcast.snippet?.title || null,
            status: "completed",
          };
        }
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
   * Connect to a YouTube livestream by video ID
   * @private
   * @param videoId The YouTube video ID of the livestream
   * @returns Promise that resolves to true if connection successful
   */
  private async connectToYouTubeLivestream(videoId: string): Promise<boolean> {
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

      this.activeLivestream = videoId;
      this.liveChatId = video.liveStreamingDetails.activeLiveChatId;
      console.log(`Connected to YouTube livestream: ${video.snippet?.title}`);
      console.log(`Live chat ID: ${this.liveChatId}`);

      // const anyVideo = video as any
      // let gameName = ""
      // // Check if video has gameInfo property
      // if ("gameInfo" in anyVideo) {
      //     if ("gameId" in anyVideo.gameInfo) {
      //         console.log(
      //             `YouTube Stream Game Title: ${anyVideo.gameInfo.gameTitle}`
      //         )
      //         gameName = anyVideo.gameInfo.gameTitle
      //     }
      // }

      YoutubeLivestreamAlert(
        video.snippet?.title || "Livestream",
        "",
        `https://www.youtube.com/watch?v=${videoId}`
      );

      return true;
    } catch (error) {
      console.error("Error connecting to YouTube livestream:", error);
      return false;
    }
  }

  /**
   * Start monitoring YouTube livestream chat
   * @private
   */
  private async startMonitoring(): Promise<void> {
    console.log("Starting YouTube chat monitoring");

    if (!this.liveChatId) {
      console.error("No active livestream to monitor");
      return;
    }

    if (this.isMonitoring) {
      console.log("Already monitoring chat");
      return;
    }

    this.isMonitoring = true;
    this.nextPageToken = undefined;

    // Initial poll to get the first page token
    await this.pollLiveChatMessages();

    this.setChatPollingInterval();

    // Clear any existing periodic messages interval
    if (this.periodicMessagesInterval) {
      clearInterval(this.periodicMessagesInterval);
    }
    this.periodicMessagesInterval = setInterval(
      PeriodicYouTubeMessages,
      3300000
    ); // 55mins

    console.log(
      `Started monitoring YouTube chat with ${this.pollingInterval_ms}ms polling interval`
    );
  }

  /**
   * Set the chat polling interval
   * @param interval_ms Polling interval in milliseconds (defaults to current setting)
   */
  public setChatPollingInterval(
    interval_ms: number = this.pollingInterval_ms
  ): void {
    // Set up interval to poll for new messages
    if (this.youTubeChatPollingInterval) {
      clearInterval(this.youTubeChatPollingInterval);
    }
    this.youTubeChatPollingInterval = setInterval(
      () => this.pollLiveChatMessages(),
      interval_ms
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
    console.log("Stopped monitoring YouTube chat");
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

      // Update polling interval if suggested by the API
      if (
        data.pollingIntervalMillis &&
        data.pollingIntervalMillis !== this.pollingInterval_ms
      ) {
        console.log(
          `Updating polling interval to ${data.pollingIntervalMillis}ms (suggested by API)`
        );
        this.pollingInterval_ms = data.pollingIntervalMillis;
        this.setChatPollingInterval(this.pollingInterval_ms);
      }

      // Save the next page token for subsequent requests
      this.nextPageToken = data.nextPageToken || undefined;

      // Process each message
      if (data.items && data.items.length > 0) {
        data.items.forEach((item) => this.processYouTubeMessage(item));
      }
    } catch (error: any) {
      console.error("Error polling live chat messages:", error);

      // Check for specific error conditions that indicate stream ended
      if (
        error.code === 404 ||
        (error.message && error.message.includes("Chat ended")) ||
        (error.message && error.message.includes("disabled"))
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
        name: authorDetails.displayName || "",
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
          amount:
            parseFloat(snippet.superChatDetails.amountMicros || "0") / 1000000,
          currency: snippet.superChatDetails.currency || "USD",
          color: snippet.superChatDetails.tier?.toString() || "", // YouTube uses tiers instead of color directly
        },
      };
    }

    // Pass the message to the handler
    handleChatMessage(unifiedMessage);
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

      const response = await this.youtubeClient.liveChatMessages.insert({
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

      //console.log("Message sent successfully:", response.data)
      return true;
    } catch (error: any) {
      console.error("Error sending chat message:", error);

      // Check for specific error types
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);

        // Handle rate limiting
        if (error.response.status === 403) {
          console.error(
            "Rate limited or permission denied. Check your quota and permissions."
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
  ];

  private readonly testMessages: string[] = [
    "Hello, this is a test message!",
    "This is another test message.",
    "Testing, testing, 1, 2, 3...",
    "Super Chat Test!",
    "This is a very long message that should be truncated in the UI because it exceeds the maximum character limit for a single chat message.",
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
