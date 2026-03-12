import {
  RefreshingAuthProvider,
  exchangeCode,
  AccessToken,
} from "@twurple/auth";
import { ChatClient } from "@twurple/chat";
import { ApiClient, CommercialLength, HelixUser } from "@twurple/api";
import { EventSubWsListener } from "@twurple/eventsub-ws";
import open from "open";
import * as fs from "fs";
import type { Express } from "express";

import { AddWelcomeMessage, LoadWelcomeMessages } from "../Commands/VipWelcome";
import { SecondsToDuration, Between, sleep } from "../Commands/Utils";
import { TwitchLivestreamAlert } from "./Discord";
import {
  handleChatMessage,
  PeriodicTwitchMessages,
  sendChatMessage,
  Wingbot953Message,
} from "../MessageHandling";
import { QuizManager } from "../Commands/Quiz";
import { UnifiedChatMessage } from "../../Common/UnifiedChatMessage";
import { BadgeCache } from "./TwitchBadgeCache";
import { EventBus, EventTypes } from "./EventBus";
import {
  getSubQuizRollThreshold,
  buildSubMessage,
  buildResubMessage,
  buildSubGiftMessage,
  buildRaidMessage,
  buildFollowMessage,
  buildHypeTrainBeginMessage,
  buildHypeTrainEndMessage,
  buildPollBeginMessage,
  buildPollEndMessage,
  buildPredictionBeginMessage,
  buildPredictionEndMessage,
  buildShoutoutReceiveMessage,
  buildCommunitySubMessage,
  buildGiftPaidUpgradeMessage,
  buildPrimePaidUpgradeMessage,
  buildStandardPayForwardMessage,
  buildCommunityPayForwardMessage,
  parseEventSubEmotes,
  parseEventSubBadgeRoles,
  type EventSubMessagePart,
  type EventSubSubNotification,
  type EventSubResubNotification,
  type EventSubSubGiftNotification,
  type EventSubCommunitySubGiftNotification,
  type EventSubRaidNotification,
  type EventSubAnnouncementNotification,
  type EventSubGiftPaidUpgradeNotification,
  type EventSubPayItForwardNotification,
  type EventSubBanModeration,
  type EventSubTimeoutModeration,
  type EventSubDeleteModeration,
} from "./TwitchLogic";

/**
 * Twitch OAuth scopes required for the application
 */
const TWITCH_SCOPES = [
  // Analytics
  "analytics:read:extensions",
  "analytics:read:games",

  // Bits
  "bits:read",

  // Channel
  "channel:edit:commercial",
  "channel:manage:broadcast",
  "channel:manage:extensions",
  "channel:manage:polls",
  "channel:manage:predictions",
  "channel:manage:raids",
  "channel:manage:redemptions",
  "channel:manage:schedule",
  "channel:manage:videos",
  "channel:moderate",
  "channel:read:editors",
  "channel:read:goals",
  "channel:read:hype_train",
  "channel:read:polls",
  "channel:read:predictions",
  "channel:read:redemptions",
  "channel:read:stream_key",
  "channel:read:subscriptions",

  // Chat
  "chat:edit",
  "chat:read",

  // Clips
  "clips:edit",

  // Moderation
  "moderation:read",

  // Moderator
  "moderator:manage:automod",
  "moderator:manage:automod_settings",
  "moderator:manage:banned_users",
  "moderator:manage:blocked_terms",
  "moderator:manage:chat_settings",
  "moderator:manage:unban_requests",
  "moderator:read:automod_settings",
  "moderator:read:blocked_terms",
  "moderator:read:chat_messages",
  "moderator:read:chat_settings",
  "moderator:read:followers",
  "moderator:read:moderators",
  "moderator:read:shoutouts",
  "moderator:read:unban_requests",
  "moderator:read:vips",
  "moderator:read:warnings",

  // User
  "user:edit",
  "user:edit:follows",
  "user:manage:blocked_users",
  "user:read:blocked_users",
  "user:read:broadcast",
  "user:read:chat",
  "user:read:email",
  "user:read:follows",
  "user:read:subscriptions",
  "user:write:chat",

  // Whispers
  "whispers:edit",
];

/**
 * Interface for stored token data
 */
interface StoredTokens {
  botTokens?: AccessToken;
  streamerTokens?: AccessToken;
  lastUpdated: number;
}

/**
 * Singleton manager class for Twitch integration and functionality
 *
 * This class encapsulates all Twitch-related operations including:
 * - OAuth authentication for both bot and streamer accounts
 * - Chat client connection and message handling
 * - API client for stream and user data
 * - Channel point reward management
 * - Stream monitoring and notifications
 * - Subscription and raid handling
 *
 * The class maintains authenticated connections to both bot and streamer
 * Twitch accounts and provides methods for interacting with chat and API.
 * Implemented as a singleton to ensure only one instance manages the connections.
 *
 * @example
 * ```typescript
 * const twitch = TwitchManager.getInstance()
 * await twitch.initialise(server)
 * twitch.sendMessage("Hello chat!")
 * ```
 */
export class TwitchManager {
  private static instance: TwitchManager;

  // Authentication state
  private botTwitchAccessToken?: AccessToken;
  private streamerTwitchAccessToken?: AccessToken;
  private authProvider?: RefreshingAuthProvider;
  private isAuthenticated: boolean = false;
  private tokenPath: string = "./Data/Tokens/twitch-tokens.json";
  private authStep: "bot" | "streamer" | "complete" = "bot";

  // Chat and API clients
  private chatClient?: ChatClient;
  private apiClient?: ApiClient;
  private streamerUser?: HelixUser;
  private botUser?: HelixUser;

  // Stream state
  private isLiveState: boolean = false;
  private streamName: string = "";
  private streamGame: string = "";
  private channelName: string = "Wingman953";

  // Intervals and timers
  private quizInterval?: NodeJS.Timeout;
  private periodicMessagesInterval?: NodeJS.Timeout;
  private streamNameAndGameInterval?: NodeJS.Timeout;

  // Two EventSub listeners: one per user identity to avoid WebSocket transport conflicts.
  // Twitch requires all subscriptions on a single WebSocket to use the same user's token.
  private botEventSubListener?: EventSubWsListener;
  private streamerEventSubListener?: EventSubWsListener;
  private isEventSubInitialised: boolean = false;

  // Subscriber tracking
  private subscriberFirstMessageReceived: string[] = [];

  // Event bus for inter-manager communication
  private eventBus: EventBus;

  /**
   * Private constructor to prevent direct instantiation
   * Use getInstance() to get the singleton instance
   */
  private constructor() {
    // Initialize event bus for inter-manager communication
    this.eventBus = EventBus.getInstance();
  }

  /**
   * Gets the singleton instance of TwitchManager
   * @returns The singleton instance of TwitchManager
   */
  public static getInstance(): TwitchManager {
    if (!TwitchManager.instance) {
      TwitchManager.instance = new TwitchManager();
    }
    return TwitchManager.instance;
  }

  /**
   * Gets the current live status
   * @returns Whether the stream is currently live
   */
  public get live(): boolean {
    return this.isLiveState;
  }

  /**
   * Gets the API client instance
   * @returns The Twitch API client
   */
  public get api(): ApiClient | undefined {
    return this.apiClient;
  }

  /**
   * Gets the streamer user object
   * @returns The streamer user object
   */
  public get streamer(): HelixUser | undefined {
    return this.streamerUser;
  }

  /**
   * Generates the Twitch OAuth authorization URL
   * @private
   * @returns The OAuth authorization URL
   */
  private generateAuthUrl(): string {
    const baseUrl = "https://id.twitch.tv/oauth2/authorize";
    const params = new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID!,
      redirect_uri: process.env.TWITCH_REDIRECT_URI!,
      response_type: "code",
      scope: TWITCH_SCOPES.join(" "),
    });
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Initializes the Twitch integration with OAuth authentication
   * @param expressApp Express app instance for handling OAuth callback
   */
  public async initialise(expressApp: Express): Promise<void> {
    console.log("Twitch Integration Setup");

    try {
      // Check if we have saved tokens
      if (fs.existsSync(this.tokenPath)) {
        console.log("Loading existing Twitch tokens...");
        const storedData = JSON.parse(
          fs.readFileSync(this.tokenPath, "utf-8"),
        ) as StoredTokens;

        if (storedData.botTokens && storedData.streamerTokens) {
          this.botTwitchAccessToken = storedData.botTokens;
          this.streamerTwitchAccessToken = storedData.streamerTokens;
          await this.continueSetup();
          return;
        }
      }

      // Start OAuth flow if no tokens exist
      await this.startAuthFlow(expressApp);
    } catch (error) {
      console.error("Error during Twitch initialization:", error);
      throw error;
    }
  }

  /**
   * Starts the OAuth authentication flow using Express routes
   * @private
   * @param expressApp The Express app instance to register OAuth callback route
   */
  private async startAuthFlow(expressApp: Express): Promise<void> {
    return new Promise((resolve, reject) => {
      // Register the Twitch OAuth callback route
      expressApp.get("/twitch/callback", (req, res) => {
        void (async () => {
          try {
            console.log("Twitch Callback received");

            const code = req.query.code as string | undefined;
            if (!code) {
              res
                .status(400)
                .type("text/plain")
                .send("Missing authorization code");
              return;
            }

            try {
              if (this.authStep === "bot") {
                // First auth: Bot account
                this.botTwitchAccessToken = await exchangeCode(
                  process.env.TWITCH_CLIENT_ID!,
                  process.env.TWITCH_CLIENT_SECRET!,
                  code,
                  process.env.TWITCH_REDIRECT_URI!,
                );

                this.authStep = "streamer";

                // Send intermediate response and open streamer auth
                res
                  .status(200)
                  .type("text/html")
                  .send(this.generateIntermediateResponse());

                // Open streamer auth in different browser
                setTimeout(() => {
                  open(this.generateAuthUrl(), {
                    app: { name: process.env.STREAMERBROWSER! },
                  }).catch(console.error);
                }, 2000);
              } else if (this.authStep === "streamer") {
                // Second auth: Streamer account
                this.streamerTwitchAccessToken = await exchangeCode(
                  process.env.TWITCH_CLIENT_ID!,
                  process.env.TWITCH_CLIENT_SECRET!,
                  code,
                  process.env.TWITCH_REDIRECT_URI!,
                );

                this.authStep = "complete";

                // Save tokens
                this.saveTokens();

                // Send success response
                res
                  .status(200)
                  .type("text/html")
                  .send(this.generateSuccessResponse());

                // Continue setup
                await this.continueSetup();
                resolve();
              }
            } catch (error) {
              console.error("Error during token exchange:", error);
              res
                .status(500)
                .type("text/html")
                .send(this.generateErrorResponse());
              reject(error instanceof Error ? error : new Error(String(error)));
            }
          } catch (e) {
            console.error("Server error:", e);
            if (!res.headersSent) {
              res.status(500).type("text/plain").send("Server error");
            }
            reject(e instanceof Error ? e : new Error(String(e)));
          }
        })();
      });

      // Start the auth flow by opening bot auth
      open(this.generateAuthUrl(), {
        app: { name: process.env.BOTBROWSER! },
      }).catch(console.error);
    });
  }

  /**
   * Generates intermediate response HTML for bot auth completion
   * @private
   */
  private generateIntermediateResponse(): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Twitch Bot Authentication Complete</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px;
              background: linear-gradient(135deg, #9146FF, #6441A4);
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
              color: #9146FF; 
              font-size: 2.5em;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✓</div>
            <h2>Bot Authentication Complete</h2>
            <p>The streamer authentication window will open shortly.</p>
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
                    '<div class="success">✓</div><h2>Please close this tab manually</h2><p>Bot authentication completed successfully!</p>';
                }, 500);
              }
            }, 1000);
          </script>
        </body>
      </html>
    `;
  }

  /**
   * Generates success response HTML with auto-closing functionality
   * @private
   */
  private generateSuccessResponse(): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Twitch Authentication Complete</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px;
              background: linear-gradient(135deg, #9146FF, #6441A4);
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
              color: #9146FF; 
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
              color: #9146FF;
              font-size: 1.3em;
            }
            button {
              background: #9146FF;
              color: white;
              border: none;
              padding: 15px 30px;
              font-size: 1.1em;
              border-radius: 25px;
              cursor: pointer;
              transition: background 0.3s;
            }
            button:hover {
              background: #6441A4;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✓</div>
            <h2>Twitch Authentication Successful</h2>
            <p>Wingbot953 is now connected to Twitch!</p>
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
    `;
  }

  /**
   * Generates error response HTML
   * @private
   */
  private generateErrorResponse(): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Twitch Authentication Failed</title>
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
            <h2>Twitch Authentication Failed</h2>
            <p>Please try again.</p>
            <button onclick="window.close()">Close Window</button>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Saves tokens to disk for persistence
   * @private
   */
  private saveTokens(): void {
    if (!this.botTwitchAccessToken || !this.streamerTwitchAccessToken) {
      return;
    }

    const tokenData: StoredTokens = {
      botTokens: this.botTwitchAccessToken,
      streamerTokens: this.streamerTwitchAccessToken,
      lastUpdated: Date.now(),
    };

    try {
      // Ensure directory exists
      const dir = this.tokenPath.substring(0, this.tokenPath.lastIndexOf("/"));
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.tokenPath, JSON.stringify(tokenData, null, 2));
      console.log("Twitch tokens saved to:", this.tokenPath);
    } catch (error) {
      console.error("Error saving Twitch tokens:", error);
    }
  }

  /**
   * Continues setup after successful authentication
   * @private
   */
  private async continueSetup(): Promise<void> {
    console.log("Continuing Twitch Setup");

    if (!this.botTwitchAccessToken || !this.streamerTwitchAccessToken) {
      throw new Error("Missing required tokens for setup");
    }

    try {
      // Setup unified auth provider with both bot and streamer users
      this.authProvider = new RefreshingAuthProvider({
        clientId: process.env.TWITCH_CLIENT_ID!,
        clientSecret: process.env.TWITCH_CLIENT_SECRET!,
      });

      // Add streamer user tokens (used for broadcaster-condition EventSub subscriptions and API calls)
      const streamerUserId = await this.authProvider.addUserForToken({
        accessToken: this.streamerTwitchAccessToken.accessToken,
        refreshToken: this.streamerTwitchAccessToken.refreshToken,
        expiresIn: 0, // Will force a refresh on first use
        obtainmentTimestamp: 0,
      });
      console.log(
        `Auth provider registered streamer with user ID: ${streamerUserId}`,
      );

      // Add bot user tokens with "chat" intent (used for chat EventSub subscriptions and sending messages)
      const botUserId = await this.authProvider.addUserForToken(
        {
          accessToken: this.botTwitchAccessToken.accessToken,
          refreshToken: this.botTwitchAccessToken.refreshToken,
          expiresIn: 0, // Will force a refresh on first use
          obtainmentTimestamp: 0,
        },
        ["chat"],
      );
      console.log(`Auth provider registered bot with user ID: ${botUserId}`);

      // Verify tokens resolved to different users (critical for EventSub multi-user sockets)
      if (streamerUserId === botUserId) {
        throw new Error(
          `Both tokens resolved to the same user ID (${streamerUserId}). ` +
            "The streamer and bot must use different Twitch accounts. " +
            "Delete the token file and re-authenticate with the correct accounts.",
        );
      }

      // Save initial refreshed tokens (addUserForToken refreshes expired tokens internally,
      // but the onRefresh callback wasn't registered yet, so we save manually)
      const refreshedStreamerToken =
        await this.authProvider.getAccessTokenForUser(streamerUserId);
      if (refreshedStreamerToken)
        this.streamerTwitchAccessToken = refreshedStreamerToken;
      const refreshedBotToken =
        await this.authProvider.getAccessTokenForUser(botUserId);
      if (refreshedBotToken) this.botTwitchAccessToken = refreshedBotToken;
      this.saveTokens();

      // Save tokens when either user refreshes (subsequent refreshes during the session)
      this.authProvider.onRefresh((userId, newTokenData) => {
        try {
          if (userId === botUserId) {
            this.botTwitchAccessToken = newTokenData;
          } else if (userId === streamerUserId) {
            this.streamerTwitchAccessToken = newTokenData;
          }
          this.saveTokens();
          console.log(`Tokens refreshed for user ${userId}`);
        } catch (error) {
          console.error("Error saving refreshed tokens:", error);
        }
      });

      // Setup chat client (retained during migration, will be removed once EventSub chat is fully wired)
      this.chatClient = new ChatClient({
        authProvider: this.authProvider,
        channels: [this.channelName],
      });

      this.chatClient.onConnect(() => {
        console.log("* Twitch Chat Connected!");
      });

      // Setup API client with unified auth provider
      this.apiClient = new ApiClient({
        authProvider: this.authProvider,
      });

      // Find streamer user
      const findStreamer = await this.apiClient.users.getUserByName(
        this.channelName,
      );

      if (findStreamer) {
        this.streamerUser = findStreamer;
      } else {
        throw new Error("Failed to find streamer user");
      }

      // Find bot user
      const findBot = await this.apiClient.users.getUserByName("Wingbot953");

      if (findBot) {
        this.botUser = findBot;
      } else {
        throw new Error("Failed to find bot user");
      }

      // Initialize badge cache
      BadgeCache.initialize(this.apiClient);

      // Connect to chat
      this.chatClient.connect();

      // Initialize EventSub for real-time event notifications
      this.initialiseEventSub();

      // Check if stream is already live (EventSub only fires on transitions)
      await this.checkInitialStreamState();

      this.isAuthenticated = true;
      console.log("Twitch setup completed successfully");
    } catch (error) {
      console.error("Error during Twitch setup:", error);
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // EventSub WebSocket Integration
  // ---------------------------------------------------------------------------

  /**
   * Initializes the EventSub WebSocket listener and subscribes to events.
   * EventSub provides push-based notifications that replace the polling approach.
   * @private
   */
  private initialiseEventSub(): void {
    if (
      this.isEventSubInitialised ||
      !this.apiClient ||
      !this.streamerUser ||
      !this.botUser
    ) {
      return;
    }

    console.log("TwitchEventSub: Initialising EventSub WebSocket listeners...");

    try {
      this.botEventSubListener = new EventSubWsListener({
        apiClient: this.apiClient,
      });
      this.streamerEventSubListener = new EventSubWsListener({
        apiClient: this.apiClient,
      });

      const broadcasterId = this.streamerUser.id;
      const botId = this.botUser.id;

      // --- Bot listener: subscriptions that use the bot's token ---

      try {
        this.subscribeToChatMessages(
          this.botEventSubListener,
          broadcasterId,
          botId,
        );
      } catch (error) {
        console.error(
          "TwitchEventSub: Failed to subscribe to chat messages:",
          error,
        );
      }

      try {
        this.subscribeToChatNotifications(
          this.botEventSubListener,
          broadcasterId,
          botId,
        );
      } catch (error) {
        console.error(
          "TwitchEventSub: Failed to subscribe to chat notifications:",
          error,
        );
      }

      try {
        this.subscribeToFollowEvents(
          this.botEventSubListener,
          broadcasterId,
          botId,
        );
      } catch (error) {
        console.error(
          "TwitchEventSub: Failed to subscribe to follow events:",
          error,
        );
      }

      try {
        this.subscribeToShoutoutEvents(
          this.botEventSubListener,
          broadcasterId,
          botId,
        );
      } catch (error) {
        console.error(
          "TwitchEventSub: Failed to subscribe to shoutout events:",
          error,
        );
      }

      // --- Streamer listener: subscriptions that use the streamer's token ---

      try {
        this.subscribeToModerationEvents(
          this.streamerEventSubListener,
          broadcasterId,
          broadcasterId,
        );
      } catch (error) {
        console.error(
          "TwitchEventSub: Failed to subscribe to moderation events:",
          error,
        );
      }

      try {
        this.subscribeToHypeTrainEvents(
          this.streamerEventSubListener,
          broadcasterId,
        );
      } catch (error) {
        console.error(
          "TwitchEventSub: Failed to subscribe to hype train events:",
          error,
        );
      }

      try {
        this.subscribeToChannelPointRedemptions(
          this.streamerEventSubListener,
          broadcasterId,
        );
      } catch (error) {
        console.error(
          "TwitchEventSub: Failed to subscribe to channel point events:",
          error,
        );
      }

      try {
        this.subscribeToStreamEvents(
          this.streamerEventSubListener,
          broadcasterId,
        );
      } catch (error) {
        console.error(
          "TwitchEventSub: Failed to subscribe to stream events:",
          error,
        );
      }

      try {
        this.subscribeToPredictionEvents(
          this.streamerEventSubListener,
          broadcasterId,
        );
      } catch (error) {
        console.error(
          "TwitchEventSub: Failed to subscribe to prediction events:",
          error,
        );
      }

      try {
        this.subscribeToPollEvents(
          this.streamerEventSubListener,
          broadcasterId,
        );
      } catch (error) {
        console.error(
          "TwitchEventSub: Failed to subscribe to poll events:",
          error,
        );
      }

      this.botEventSubListener.start();
      this.streamerEventSubListener.start();
      this.isEventSubInitialised = true;
      console.log(
        "TwitchEventSub: EventSub WebSocket listeners started successfully.",
      );
    } catch (error) {
      console.error("TwitchEventSub: Failed to initialise EventSub:", error);
    }
  }

  /**
   * Checks the initial stream state on startup via API.
   * EventSub only fires on transitions, so we need this for when
   * the bot starts while the stream is already live.
   * @private
   */
  private async checkInitialStreamState(): Promise<void> {
    if (!this.apiClient || !this.streamerUser) return;

    try {
      const stream = await this.apiClient.streams.getStreamByUserId(
        this.streamerUser.id,
      );

      if (stream?.startDate) {
        console.log("Stream already live - initializing live state.");
        this.handleStreamOnline(stream.title, stream.gameName);
      }
    } catch (error) {
      console.error("Failed to check initial stream state:", error);
    }
  }

  // ---------------------------------------------------------------------------
  // Stream State Helpers
  // ---------------------------------------------------------------------------

  /**
   * Handles stream going online - shared between EventSub handler and initial state check
   * @private
   */
  private handleStreamOnline(title: string, game: string): void {
    if (this.isLiveState) return; // Already live, avoid duplicate triggers

    this.isLiveState = true;
    console.log("Streamer went live!");

    this.eventBus.safeEmit(EventTypes.TWITCH_STREAM_STARTED);

    this.streamName = title;
    this.streamGame = game;

    TwitchLivestreamAlert(this.streamName, this.streamGame);
    LoadWelcomeMessages();
    QuizManager.getInstance().resetUsedQuestions();

    // Start automatic timers
    this.quizInterval = setInterval(
      () => QuizManager.getInstance().queueQuiz(),
      Between(2100000, 2700000),
    ); // 35-45mins

    this.periodicMessagesInterval = setInterval(
      PeriodicTwitchMessages,
      3300000,
    ); // 55mins
    this.streamNameAndGameInterval = setInterval(
      () => void this.pollStreamNameAndGame(),
      60000,
    ); // 1min

    const startStreamMessage: UnifiedChatMessage =
      structuredClone(Wingbot953Message);
    startStreamMessage.platform = "twitch";
    startStreamMessage.message.text = `wingma14Arrive Good Luck Streamer! wingma14Blush`;
    sendChatMessage(startStreamMessage);
  }

  /**
   * Handles stream going offline - shared between EventSub handler
   * @private
   */
  private handleStreamOffline(): void {
    if (!this.isLiveState) return; // Already offline, avoid duplicate triggers

    this.isLiveState = false;
    console.log("Streamer went offline!");

    this.eventBus.safeEmit(EventTypes.TWITCH_STREAM_ENDED);

    this.clearIntervals();
    this.resetSubscriberFirstMessageReceived();

    const endstreamMessage: UnifiedChatMessage =
      structuredClone(Wingbot953Message);
    endstreamMessage.platform = "twitch";
    endstreamMessage.message.text = `wingma14Blush Thanks for the stream!`;
    sendChatMessage(endstreamMessage);
  }

  // ---------------------------------------------------------------------------
  // EventSub Chat Subscriptions
  // ---------------------------------------------------------------------------

  /**
   * Subscribes to chat messages via EventSub, replacing IRC onMessage and onAction.
   * Messages are converted to UnifiedChatMessage and routed through handleChatMessage.
   */
  private subscribeToChatMessages(
    listener: EventSubWsListener,
    broadcasterId: string,
    botId: string,
  ): void {
    listener.onChannelChatMessage(broadcasterId, botId, (event) => {
      const badges = event.badges;
      const roles = parseEventSubBadgeRoles(badges);
      const messageParts =
        event.messageParts as unknown as EventSubMessagePart[];

      void (async () => {
        const unifiedMessage: UnifiedChatMessage = {
          id: event.messageId,
          platform: "twitch",
          timestamp: new Date(),
          channel: {
            id: broadcasterId,
            name: this.channelName,
          },
          author: {
            id: event.chatterId,
            colour: event.color || "#FFFFFF",
            name: event.chatterName,
            displayName: event.chatterDisplayName,
            isModerator: roles.isModerator,
            isSubscriber: roles.isSubscriber,
            isOwner: roles.isOwner,
          },
          message: {
            text: event.messageText,
            emoteMap: parseEventSubEmotes(messageParts),
          },
          twitchSpecific: {
            bits: event.isCheer ? event.bits : undefined,
            badges: await BadgeCache.getBadgeIconsFromRecord(
              broadcasterId,
              badges,
            ),
            isHighlighted: event.messageType === "highlight",
            ...(event.messageType === "action"
              ? {
                  messageType: {
                    category: "chat" as const,
                    type: "action" as const,
                  },
                }
              : {}),
          },
        };

        handleChatMessage(unifiedMessage);
      })();
    });
  }

  /**
   * Subscribes to chat notifications via EventSub, replacing IRC onSub, onResub,
   * onSubGift, onCommunitySub, onRaid, onAnnouncement, onGiftPaidUpgrade,
   * onPrimePaidUpgrade, onStandardPayForward, onCommunityPayForward, and onRaidCancel.
   */
  private subscribeToChatNotifications(
    listener: EventSubWsListener,
    broadcasterId: string,
    botId: string,
  ): void {
    listener.onChannelChatNotification(broadcasterId, botId, (event) => {
      // Twurple provides a complex union type; we cast to our minimal interfaces per case
      const e = event as unknown as { type: string };
      switch (e.type) {
        case "sub":
          this.handleSubNotification(
            event as unknown as EventSubSubNotification,
          );
          break;
        case "resub":
          this.handleResubNotification(
            event as unknown as EventSubResubNotification,
          );
          break;
        case "sub_gift":
          this.handleSubGiftNotification(
            event as unknown as EventSubSubGiftNotification,
          );
          break;
        case "community_sub_gift":
          this.handleCommunitySubGiftNotification(
            event as unknown as EventSubCommunitySubGiftNotification,
          );
          break;
        case "raid":
          this.handleRaidNotification(
            event as unknown as EventSubRaidNotification,
          );
          break;
        case "announcement":
          this.handleAnnouncementNotification(
            broadcasterId,
            event as unknown as EventSubAnnouncementNotification,
          );
          break;
        case "gift_paid_upgrade":
          this.handleGiftPaidUpgradeNotification(
            event as unknown as EventSubGiftPaidUpgradeNotification,
          );
          break;
        case "prime_paid_upgrade":
          this.handlePrimePaidUpgradeNotification(
            event as unknown as EventSubGiftPaidUpgradeNotification,
          );
          break;
        case "pay_it_forward":
          this.handlePayItForwardNotification(
            event as unknown as EventSubPayItForwardNotification,
          );
          break;
        case "unraid":
          this.handleUnraidNotification(
            event as unknown as EventSubSubNotification,
          );
          break;
      }
    });
  }

  private handleSubNotification(event: EventSubSubNotification): void {
    const subMessage: UnifiedChatMessage = structuredClone(Wingbot953Message);
    subMessage.message.text = buildSubMessage(
      event.chatterDisplayName,
      event.durationMonths,
    );
    subMessage.platform = "twitch";
    subMessage.twitchSpecific = {
      messageType: { category: "subscription", type: "sub" },
      isHighlighted: true,
    };

    void sleep(1000).then(() => {
      sendChatMessage(subMessage);

      if (event.messageText) {
        const userSubMessage: UnifiedChatMessage =
          structuredClone(Wingbot953Message);
        userSubMessage.platform = "twitch";
        userSubMessage.message.text = `Sub message from ${event.chatterName}: ${event.messageText}`;
        userSubMessage.author.displayName = event.chatterDisplayName;
        userSubMessage.twitchSpecific = {
          messageType: { category: "subscription", type: "sub" },
          isHighlighted: true,
        };
        sendChatMessage(userSubMessage);
      }
    });

    setTimeout(() => {
      QuizManager.getInstance().queueQuiz();
    }, 5000);
  }

  private handleResubNotification(event: EventSubResubNotification): void {
    const subMessage: UnifiedChatMessage = structuredClone(Wingbot953Message);
    subMessage.message.text = buildResubMessage(
      event.chatterName,
      event.cumulativeMonths,
    );
    subMessage.platform = "twitch";
    subMessage.twitchSpecific = {
      messageType: { category: "subscription", type: "resub" },
      isHighlighted: true,
    };

    void sleep(1000).then(() => {
      sendChatMessage(subMessage);

      if (event.messageText) {
        const userResubMessage: UnifiedChatMessage =
          structuredClone(Wingbot953Message);
        userResubMessage.platform = "twitch";
        userResubMessage.message.text = `${event.messageText}`;
        userResubMessage.author.displayName = event.chatterDisplayName;
        userResubMessage.twitchSpecific = {
          messageType: { category: "subscription", type: "resub" },
          isHighlighted: true,
        };
        sendChatMessage(userResubMessage);
      }
    });

    setTimeout(() => {
      QuizManager.getInstance().queueQuiz();
    }, 5000);
  }

  private handleSubGiftNotification(event: EventSubSubGiftNotification): void {
    const subGiftMessage: UnifiedChatMessage =
      structuredClone(Wingbot953Message);
    subGiftMessage.message.text = buildSubGiftMessage(
      event.chatterIsAnonymous ? "Anonymous" : event.chatterDisplayName,
      event.recipientDisplayName,
    );
    subGiftMessage.platform = "twitch";
    subGiftMessage.twitchSpecific = {
      messageType: { category: "subscription", type: "subgift" },
      isHighlighted: true,
    };

    void sleep(1000).then(() => {
      sendChatMessage(subGiftMessage);
    });

    setTimeout(() => {
      QuizManager.getInstance().queueQuiz();
    }, 5000);
  }

  private handleCommunitySubGiftNotification(
    event: EventSubCommunitySubGiftNotification,
  ): void {
    const gifterName = event.chatterIsAnonymous
      ? "Anonymous"
      : event.chatterDisplayName;

    console.log(`Community sub bomb from ${gifterName}: ${event.total} subs`);

    const communitySubMessage: UnifiedChatMessage =
      structuredClone(Wingbot953Message);
    communitySubMessage.message.text = buildCommunitySubMessage(
      gifterName,
      event.total,
    );
    communitySubMessage.platform = "twitch";
    communitySubMessage.twitchSpecific = {
      messageType: { category: "subscription", type: "communitysub" },
      isHighlighted: true,
      giftCount: event.total,
    };

    void sleep(1000).then(() => {
      sendChatMessage(communitySubMessage);

      if (event.messageText) {
        const gifterMessage: UnifiedChatMessage =
          structuredClone(Wingbot953Message);
        gifterMessage.platform = "twitch";
        gifterMessage.message.text = `${event.messageText}`;
        gifterMessage.author.displayName = gifterName;
        gifterMessage.twitchSpecific = {
          messageType: { category: "subscription", type: "communitysub" },
          isHighlighted: true,
        };
        sendChatMessage(gifterMessage);
      }
    });

    setTimeout(() => {
      QuizManager.getInstance().queueQuiz();
    }, 5000);
  }

  private handleRaidNotification(event: EventSubRaidNotification): void {
    const raidMessage: UnifiedChatMessage = structuredClone(Wingbot953Message);
    raidMessage.message.text = buildRaidMessage(
      event.raiderDisplayName,
      event.viewerCount,
    );
    raidMessage.platform = "twitch";
    raidMessage.twitchSpecific = {
      isHighlighted: true,
      messageType: { category: "notification", type: "raid" },
    };

    void sleep(1000).then(() => {
      sendChatMessage(raidMessage);
    });

    setTimeout(() => {
      QuizManager.getInstance().queueQuiz();
    }, 5000);
  }

  private handleAnnouncementNotification(
    broadcasterId: string,
    event: EventSubAnnouncementNotification,
  ): void {
    console.log(
      `Announcement from ${event.chatterDisplayName}: ${event.messageText ?? ""}`,
    );

    const roles = parseEventSubBadgeRoles(event.badges);

    const announcementMessage: UnifiedChatMessage = {
      id: event.messageId,
      platform: "twitch",
      timestamp: new Date(),
      channel: {
        id: broadcasterId,
        name: this.channelName,
      },
      author: {
        id: event.chatterId,
        colour: event.color || "#FFFFFF",
        name: event.chatterName,
        displayName: event.chatterDisplayName,
        isModerator: roles.isModerator,
        isSubscriber: roles.isSubscriber,
        isOwner: roles.isOwner,
      },
      message: {
        text: event.messageText || "",
      },
      twitchSpecific: {
        messageType: { category: "notification", type: "announcement" },
        announcementColor: event.announcementColor,
        isHighlighted: true,
      },
    };

    sendChatMessage(announcementMessage, true, false);
  }

  private handleGiftPaidUpgradeNotification(
    event: EventSubGiftPaidUpgradeNotification,
  ): void {
    console.log(
      `${event.chatterDisplayName} upgraded their gift sub from ${event.gifterDisplayName} to a paid sub`,
    );

    const upgradeMessage: UnifiedChatMessage =
      structuredClone(Wingbot953Message);
    upgradeMessage.message.text = buildGiftPaidUpgradeMessage(
      event.chatterDisplayName,
      event.gifterDisplayName,
    );
    upgradeMessage.platform = "twitch";
    upgradeMessage.twitchSpecific = {
      messageType: { category: "subscription", type: "giftpaidupgrade" },
      isHighlighted: true,
      originalGifter: event.gifterDisplayName,
    };

    void sleep(1000).then(() => {
      sendChatMessage(upgradeMessage);

      if (event.messageText) {
        const userUpgradeMessage: UnifiedChatMessage =
          structuredClone(Wingbot953Message);
        userUpgradeMessage.platform = "twitch";
        userUpgradeMessage.message.text = `${event.messageText}`;
        userUpgradeMessage.author.displayName = event.chatterDisplayName;
        userUpgradeMessage.twitchSpecific = {
          messageType: { category: "subscription", type: "giftpaidupgrade" },
          isHighlighted: true,
        };
        sendChatMessage(userUpgradeMessage);
      }
    });
  }

  private handlePrimePaidUpgradeNotification(
    event: EventSubGiftPaidUpgradeNotification,
  ): void {
    console.log(
      `${event.chatterDisplayName} upgraded from Prime to a paid sub`,
    );

    const upgradeMessage: UnifiedChatMessage =
      structuredClone(Wingbot953Message);
    upgradeMessage.message.text = buildPrimePaidUpgradeMessage(
      event.chatterDisplayName,
    );
    upgradeMessage.platform = "twitch";
    upgradeMessage.twitchSpecific = {
      messageType: { category: "subscription", type: "primepaidupgrade" },
      isHighlighted: true,
    };

    void sleep(1000).then(() => {
      sendChatMessage(upgradeMessage);

      if (event.messageText) {
        const userPrimeMessage: UnifiedChatMessage =
          structuredClone(Wingbot953Message);
        userPrimeMessage.platform = "twitch";
        userPrimeMessage.message.text = `${event.messageText}`;
        userPrimeMessage.author.displayName = event.chatterDisplayName;
        userPrimeMessage.twitchSpecific = {
          messageType: { category: "subscription", type: "primepaidupgrade" },
          isHighlighted: true,
        };
        sendChatMessage(userPrimeMessage);
      }
    });
  }

  private handlePayItForwardNotification(
    event: EventSubPayItForwardNotification,
  ): void {
    console.log(`${event.chatterDisplayName} is paying forward a gift sub`);

    // Determine if this is a standard (specific recipient) or community (no recipient) pay-forward
    const gifterName = event.gifterDisplayName ?? "someone";
    let messageText: string;

    if (event.recipientDisplayName) {
      messageText = buildStandardPayForwardMessage(
        event.chatterDisplayName,
        event.recipientDisplayName,
        gifterName,
      );
    } else {
      messageText = buildCommunityPayForwardMessage(
        event.chatterDisplayName,
        gifterName,
      );
    }

    const payForwardMessage: UnifiedChatMessage =
      structuredClone(Wingbot953Message);
    payForwardMessage.message.text = messageText;
    payForwardMessage.platform = "twitch";
    payForwardMessage.twitchSpecific = {
      messageType: { category: "subscription", type: "payforward" },
      isHighlighted: true,
      originalGifter: gifterName,
    };

    void sleep(1000).then(() => {
      sendChatMessage(payForwardMessage);

      if (event.messageText) {
        const userPayForwardMessage: UnifiedChatMessage =
          structuredClone(Wingbot953Message);
        userPayForwardMessage.platform = "twitch";
        userPayForwardMessage.message.text = `${event.messageText}`;
        userPayForwardMessage.author.displayName = event.chatterDisplayName;
        userPayForwardMessage.twitchSpecific = {
          messageType: { category: "subscription", type: "payforward" },
          isHighlighted: true,
        };
        sendChatMessage(userPayForwardMessage);
      }
    });
  }

  private handleUnraidNotification(event: EventSubSubNotification): void {
    console.log(`Raid cancelled by ${event.chatterDisplayName}`);

    const raidCancelMessage: UnifiedChatMessage = {
      platform: "twitch",
      timestamp: new Date(),
      channel: {
        name: "Admin",
      },
      author: {
        name: event.chatterName,
        displayName: event.chatterDisplayName,
      },
      message: {
        text: `Raid from ${event.chatterDisplayName} was cancelled.`,
      },
      twitchSpecific: {
        messageType: { category: "notification", type: "raidcancel" },
      },
    };

    sendChatMessage(raidCancelMessage, true, false);
  }

  // ---------------------------------------------------------------------------
  // EventSub Subscriptions
  // ---------------------------------------------------------------------------

  /**
   * Subscribes to channel.moderate EventSub events.
   * Replaces IRC onBan, onTimeout, and onMessageRemove handlers.
   * Uses moderator condition (bot is a moderator in the channel).
   */
  private subscribeToModerationEvents(
    listener: EventSubWsListener,
    broadcasterId: string,
    moderatorId: string,
  ): void {
    listener.onChannelModerate(broadcasterId, moderatorId, (event) => {
      switch (event.moderationAction) {
        case "ban":
          this.handleBanModeration(event as unknown as EventSubBanModeration);
          break;
        case "timeout":
          this.handleTimeoutModeration(
            event as unknown as EventSubTimeoutModeration,
          );
          break;
        case "delete":
          this.handleDeleteModeration(
            event as unknown as EventSubDeleteModeration,
          );
          break;
        default:
          // Other moderation actions (unban, untimeout, slow, etc.) - no handling needed
          break;
      }
    });
  }

  private handleBanModeration(event: EventSubBanModeration): void {
    console.log(
      `User ${event.userDisplayName} was banned in ${event.broadcasterName}`,
    );

    const banMessage: UnifiedChatMessage = {
      platform: "twitch",
      timestamp: new Date(),
      channel: {
        id: event.broadcasterId,
        name: "Admin",
      },
      author: {
        id: event.userId,
        name: event.userName,
        displayName: event.userDisplayName,
      },
      message: {
        text: `${event.userDisplayName} has been banned.`,
      },
      twitchSpecific: {
        messageType: { category: "moderation", type: "ban" },
      },
    };

    sendChatMessage(banMessage, true, false);
  }

  private handleTimeoutModeration(event: EventSubTimeoutModeration): void {
    const expiryDate: Date = event.expiryDate;
    const duration = Math.max(
      0,
      Math.round((expiryDate.getTime() - Date.now()) / 1000),
    );

    console.log(
      `User ${event.userDisplayName} was timed out for ${duration}s in ${event.broadcasterName}`,
    );

    const timeoutMessage: UnifiedChatMessage = {
      platform: "twitch",
      timestamp: new Date(),
      channel: {
        id: event.broadcasterId,
        name: "Admin",
      },
      author: {
        id: event.userId,
        name: event.userName,
        displayName: event.userDisplayName,
      },
      message: {
        text: `${event.userDisplayName} has been timed out for ${duration} seconds.`,
      },
      twitchSpecific: {
        messageType: { category: "moderation", type: "timeout" },
        timeoutDuration: duration,
      },
    };

    sendChatMessage(timeoutMessage, true, false);
  }

  private handleDeleteModeration(event: EventSubDeleteModeration): void {
    console.log(
      `Message ${event.messageId} from ${event.userDisplayName} was deleted in ${event.broadcasterName}`,
    );

    const removeMessage: UnifiedChatMessage = {
      id: event.messageId,
      platform: "twitch",
      timestamp: new Date(),
      channel: {
        id: event.broadcasterId,
        name: "Admin",
      },
      author: {
        id: event.userId,
        name: event.userName,
        displayName: event.userDisplayName,
      },
      message: {
        text: event.messageText,
      },
      twitchSpecific: {
        messageType: { category: "moderation", type: "messageremove" },
      },
    };

    sendChatMessage(removeMessage, true, false);
  }

  private subscribeToFollowEvents(
    listener: EventSubWsListener,
    broadcasterId: string,
    moderatorId: string,
  ): void {
    listener.onChannelFollow(broadcasterId, moderatorId, (event) => {
      console.log(`TwitchEventSub: New follower - ${event.userDisplayName}`);

      const followMessage: UnifiedChatMessage =
        structuredClone(Wingbot953Message);
      followMessage.platform = "twitch";
      followMessage.message.text = buildFollowMessage(event.userDisplayName);
      followMessage.twitchSpecific = {
        isHighlighted: true,
        messageType: { category: "notification", type: "follow" },
      };

      // INTENTIONALLY DISABLED: Electing to not show follow event for now.
      // sendChatMessage(followMessage, true, false);

      this.eventBus.safeEmit(EventTypes.TWITCH_FOLLOW, {
        userName: event.userName,
        userDisplayName: event.userDisplayName,
        followDate: event.followDate.toISOString(),
      });
    });
  }

  private subscribeToHypeTrainEvents(
    listener: EventSubWsListener,
    broadcasterId: string,
  ): void {
    listener.onChannelHypeTrainBeginV2(broadcasterId, (event) => {
      console.log(
        `TwitchEventSub: Hype Train started! Level ${event.level}, Goal: ${event.goal}`,
      );

      const hypeMessage: UnifiedChatMessage =
        structuredClone(Wingbot953Message);
      hypeMessage.platform = "twitch";
      hypeMessage.message.text = buildHypeTrainBeginMessage(event.level);
      hypeMessage.twitchSpecific = {
        isHighlighted: true,
        messageType: { category: "activity", type: "hypetrain" },
      };

      sendChatMessage(hypeMessage, true, false);

      this.eventBus.safeEmit(EventTypes.TWITCH_HYPE_TRAIN_BEGIN, {
        level: event.level,
        goal: event.goal,
        total: event.total,
        startDate: event.startDate.toISOString(),
      });
    });

    listener.onChannelHypeTrainProgressV2(broadcasterId, (event) => {
      console.log(
        `TwitchEventSub: Hype Train progress - Level ${event.level}, ${event.total}/${event.goal}`,
      );

      const progressMessage: UnifiedChatMessage =
        structuredClone(Wingbot953Message);
      progressMessage.platform = "twitch";
      progressMessage.channel = { name: "Admin" };
      progressMessage.message.text = `Hype Train progress - Level ${event.level}, ${event.total}/${event.goal}`;
      progressMessage.twitchSpecific = {
        messageType: { category: "activity", type: "hypetrain" },
        isHighlighted: true,
      };

      sendChatMessage(progressMessage, true, false);
    });

    listener.onChannelHypeTrainEndV2(broadcasterId, (event) => {
      console.log(`TwitchEventSub: Hype Train ended at level ${event.level}!`);

      const hypeEndMessage: UnifiedChatMessage =
        structuredClone(Wingbot953Message);
      hypeEndMessage.platform = "twitch";
      hypeEndMessage.message.text = buildHypeTrainEndMessage(event.level);
      hypeEndMessage.twitchSpecific = {
        isHighlighted: true,
        messageType: { category: "activity", type: "hypetrain" },
      };

      sendChatMessage(hypeEndMessage, true, false);

      this.eventBus.safeEmit(EventTypes.TWITCH_HYPE_TRAIN_END, {
        level: event.level,
        total: event.total,
        topContributors: event.topContributors.map((c) => ({
          userName: c.userName,
          type: c.type,
          total: c.total,
        })),
        endDate: event.endDate.toISOString(),
      });
    });
  }

  /**
   * Subscribes to channel point custom reward redemption events.
   * Replaces the previous polling-based redemption detection.
   */
  private subscribeToChannelPointRedemptions(
    listener: EventSubWsListener,
    broadcasterId: string,
  ): void {
    listener.onChannelRedemptionAdd(broadcasterId, (event) => {
      console.log(
        `TwitchEventSub: Channel point redemption - ${event.userDisplayName} redeemed "${event.rewardTitle}"`,
      );

      // Route to specific reward handlers
      switch (event.rewardTitle) {
        case "Start a Quiz Round":
          this.handleQuizStartRedemption();
          break;
        case "G'Day Streamer":
          this.handleGDayRedemption(event.userDisplayName, event.userId);
          break;
        case "G'Night Streamer":
          this.handleGNightRedemption(event.userDisplayName, event.userId);
          break;
        case "Add Custom Greeting":
          void this.handleAddCustomGreetingRedemption(
            event.userDisplayName,
            event.userId,
            event.input,
          );
          break;
      }

      this.eventBus.safeEmit(EventTypes.TWITCH_CHANNEL_POINT_REDEMPTION, {
        userName: event.userName,
        userDisplayName: event.userDisplayName,
        rewardTitle: event.rewardTitle,
        rewardCost: event.rewardCost,
        userInput: event.input,
      });

      const redemptionMessage: UnifiedChatMessage =
        structuredClone(Wingbot953Message);
      redemptionMessage.platform = "twitch";
      redemptionMessage.channel = { name: "Admin" };
      redemptionMessage.message.text = `${event.userDisplayName} redeemed "${event.rewardTitle}" (${event.rewardCost} points)`;
      redemptionMessage.twitchSpecific = {
        messageType: { category: "activity", type: "redemption" },
      };

      sendChatMessage(redemptionMessage, true, false);
    });
  }

  /**
   * Subscribes to stream online and offline events.
   * Replaces the previous polling-based stream status detection.
   */
  private subscribeToStreamEvents(
    listener: EventSubWsListener,
    broadcasterId: string,
  ): void {
    listener.onStreamOnline(broadcasterId, (event) => {
      console.log(`TwitchEventSub: Stream went online! Type: ${event.type}`);

      // Fetch stream data for title and game (not included in the event)
      void (async () => {
        let title = "";
        let game = "";
        try {
          const stream = await this.apiClient!.streams.getStreamByUserId(
            this.streamerUser!.id,
          );
          title = stream?.title || "";
          game = stream?.gameName || "";
        } catch {
          console.log(
            "TwitchEventSub: Failed to fetch stream data for title/game.",
          );
        }

        this.handleStreamOnline(title, game);
      })();
    });

    listener.onStreamOffline(broadcasterId, () => {
      console.log("TwitchEventSub: Stream went offline.");

      this.handleStreamOffline();
    });
  }

  private subscribeToPredictionEvents(
    listener: EventSubWsListener,
    broadcasterId: string,
  ): void {
    listener.onChannelPredictionBegin(broadcasterId, (event) => {
      console.log(`TwitchEventSub: Prediction started - "${event.title}"`);

      const outcomes = event.outcomes.map((o) => ({
        id: o.id,
        title: o.title,
        color: o.color,
      }));

      const predictionMessage: UnifiedChatMessage =
        structuredClone(Wingbot953Message);
      predictionMessage.platform = "twitch";
      predictionMessage.message.text = buildPredictionBeginMessage(
        event.title,
        outcomes.map((o) => o.title),
      );
      predictionMessage.twitchSpecific = {
        isHighlighted: true,
        messageType: { category: "activity", type: "prediction" },
      };

      sendChatMessage(predictionMessage, true, false);

      this.eventBus.safeEmit(EventTypes.TWITCH_PREDICTION_BEGIN, {
        id: event.id,
        title: event.title,
        outcomes,
        lockDate: event.lockDate.toISOString(),
      });
    });

    listener.onChannelPredictionLock(broadcasterId, (event) => {
      console.log(`TwitchEventSub: Prediction locked - "${event.title}"`);

      const lockMessage: UnifiedChatMessage =
        structuredClone(Wingbot953Message);
      lockMessage.platform = "twitch";
      lockMessage.channel = { name: "Admin" };
      lockMessage.message.text = `Prediction locked: "${event.title}"`;
      lockMessage.twitchSpecific = {
        messageType: { category: "activity", type: "prediction" },
        isHighlighted: true,
      };

      sendChatMessage(lockMessage, true, false);
    });

    listener.onChannelPredictionEnd(broadcasterId, (event) => {
      console.log(
        `TwitchEventSub: Prediction ended - "${event.title}", Status: ${event.status}`,
      );

      const winningOutcome = event.winningOutcome;

      if (winningOutcome) {
        const predEndMessage: UnifiedChatMessage =
          structuredClone(Wingbot953Message);
        predEndMessage.platform = "twitch";
        predEndMessage.message.text = buildPredictionEndMessage(
          event.title,
          winningOutcome.title,
        );
        predEndMessage.twitchSpecific = {
          isHighlighted: true,
          messageType: { category: "activity", type: "prediction" },
        };

        sendChatMessage(predEndMessage, true, false);
      }

      this.eventBus.safeEmit(EventTypes.TWITCH_PREDICTION_END, {
        id: event.id,
        title: event.title,
        status: event.status,
        winningOutcomeId: winningOutcome?.id ?? null,
      });
    });
  }

  private subscribeToPollEvents(
    listener: EventSubWsListener,
    broadcasterId: string,
  ): void {
    listener.onChannelPollBegin(broadcasterId, (event) => {
      console.log(`TwitchEventSub: Poll started - "${event.title}"`);

      const choices = event.choices.map((c) => ({
        id: c.id,
        title: c.title,
      }));

      const pollMessage: UnifiedChatMessage =
        structuredClone(Wingbot953Message);
      pollMessage.platform = "twitch";
      pollMessage.message.text = buildPollBeginMessage(
        event.title,
        choices.map((c) => c.title),
      );
      pollMessage.twitchSpecific = {
        isHighlighted: true,
        messageType: { category: "activity", type: "poll" },
      };

      sendChatMessage(pollMessage, true, false);

      this.eventBus.safeEmit(EventTypes.TWITCH_POLL_BEGIN, {
        id: event.id,
        title: event.title,
        choices,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
      });
    });

    listener.onChannelPollProgress(broadcasterId, (event) => {
      console.log(`TwitchEventSub: Poll progress - "${event.title}"`);

      const progressMessage: UnifiedChatMessage =
        structuredClone(Wingbot953Message);
      progressMessage.platform = "twitch";
      progressMessage.channel = { name: "Admin" };
      progressMessage.message.text = `Poll progress: "${event.title}" - ${event.choices.map((c) => `${c.title}: ${c.totalVotes}`).join(", ")}`;
      progressMessage.twitchSpecific = {
        messageType: { category: "activity", type: "poll" },
      };

      sendChatMessage(progressMessage, true, false);
    });

    listener.onChannelPollEnd(broadcasterId, (event) => {
      console.log(
        `TwitchEventSub: Poll ended - "${event.title}", Status: ${event.status}`,
      );

      const choices = event.choices.map((c) => ({
        id: c.id,
        title: c.title,
        totalVotes: c.totalVotes,
        channelPointsVotes: c.channelPointsVotes,
      }));

      // Find the winning choice (most total votes)
      const winningChoice = [...choices].sort(
        (a, b) => b.totalVotes - a.totalVotes,
      )[0];

      if (winningChoice && event.status === "completed") {
        const pollEndMessage: UnifiedChatMessage =
          structuredClone(Wingbot953Message);
        pollEndMessage.platform = "twitch";
        pollEndMessage.message.text = buildPollEndMessage(
          event.title,
          winningChoice.title,
          winningChoice.totalVotes,
        );
        pollEndMessage.twitchSpecific = {
          isHighlighted: true,
          messageType: { category: "activity", type: "poll" },
        };

        sendChatMessage(pollEndMessage, true, false);
      }

      this.eventBus.safeEmit(EventTypes.TWITCH_POLL_END, {
        id: event.id,
        title: event.title,
        status: event.status,
        choices,
        winningChoiceId: winningChoice?.id ?? null,
      });
    });
  }

  private subscribeToShoutoutEvents(
    listener: EventSubWsListener,
    broadcasterId: string,
    moderatorId: string,
  ): void {
    listener.onChannelShoutoutCreate(broadcasterId, moderatorId, (event) => {
      console.log(
        `TwitchEventSub: Shoutout created for ${event.shoutedOutBroadcasterDisplayName}`,
      );

      const shoutoutCreateMessage: UnifiedChatMessage =
        structuredClone(Wingbot953Message);
      shoutoutCreateMessage.platform = "twitch";
      shoutoutCreateMessage.channel = { name: "Admin" };
      shoutoutCreateMessage.message.text = `Shoutout sent to ${event.shoutedOutBroadcasterDisplayName}`;
      shoutoutCreateMessage.twitchSpecific = {
        messageType: { category: "notification", type: "shoutout" },
      };

      sendChatMessage(shoutoutCreateMessage, true, false);
    });

    listener.onChannelShoutoutReceive(broadcasterId, moderatorId, (event) => {
      console.log(
        `TwitchEventSub: Shoutout received from ${event.shoutingOutBroadcasterDisplayName}`,
      );

      const shoutoutMessage: UnifiedChatMessage =
        structuredClone(Wingbot953Message);
      shoutoutMessage.platform = "twitch";
      shoutoutMessage.message.text = buildShoutoutReceiveMessage(
        event.shoutingOutBroadcasterDisplayName,
      );
      shoutoutMessage.twitchSpecific = {
        isHighlighted: true,
        messageType: { category: "notification", type: "shoutout" },
      };

      sendChatMessage(shoutoutMessage, true, false);

      this.eventBus.safeEmit(EventTypes.TWITCH_SHOUTOUT_RECEIVE, {
        shoutingOutUserName: event.shoutingOutBroadcasterName,
        shoutingOutUserDisplayName: event.shoutingOutBroadcasterDisplayName,
        viewerCount: event.viewerCount,
        startDate: event.startDate.toISOString(),
      });
    });
  }

  /**
   * Subscribes to subscription and gift subscription events.
   * These supplement the existing IRC-based subscription handlers.
   */

  /**
   * Polls for stream title and game changes
   * @private
   */
  private async pollStreamNameAndGame(): Promise<void> {
    if (!this.apiClient || !this.streamerUser) {
      return;
    }

    try {
      const streamWingman953 = await this.apiClient.streams.getStreamByUserId(
        this.streamerUser.id,
      );

      if (
        streamWingman953?.title !== this.streamName ||
        streamWingman953?.gameName !== this.streamGame
      ) {
        this.streamName = streamWingman953?.title || "";
        this.streamGame = streamWingman953?.gameName || "";
        TwitchLivestreamAlert(this.streamName, this.streamGame);
      }
    } catch {
      console.log("CATCH: Failed to reach Twitch API.");
    }
  }

  /**
   * Clears all active intervals
   * @private
   */
  private clearIntervals(): void {
    if (this.quizInterval) {
      clearInterval(this.quizInterval);
      this.quizInterval = undefined;
    }
    if (this.periodicMessagesInterval) {
      clearInterval(this.periodicMessagesInterval);
      this.periodicMessagesInterval = undefined;
    }
    if (this.streamNameAndGameInterval) {
      clearInterval(this.streamNameAndGameInterval);
      this.streamNameAndGameInterval = undefined;
    }
  }

  /**
   * Resets the subscriber first message tracking list
   * @private
   */
  private resetSubscriberFirstMessageReceived(): void {
    this.subscriberFirstMessageReceived.length = 0;
    console.log("Subscriber first message quiz list reset.");
  }

  /**
   * Sends a message to Twitch chat
   * @param message The message to send
   * @param minDelay Minimum delay before sending (ms)
   * @param maxDelay Maximum delay before sending (ms)
   */
  public sendMessage(message: string, minDelay = 0, maxDelay = 0): void {
    let delay = minDelay;

    if (minDelay > 0 && maxDelay > 0) {
      delay = Between(minDelay, maxDelay);
    }

    setTimeout(() => {
      if (this.apiClient && this.streamerUser && this.botUser) {
        this.apiClient
          .asUser(this.botUser.id, async (ctx) => {
            await ctx.chat.sendChatMessage(this.streamerUser!.id, message);
          })
          .catch((error: unknown) => {
            console.log(
              `* ERROR: Twitch Message FAILED to send via API: ${error instanceof Error ? error.message : String(error)}`,
            );
            // Attempt IRC fallback on API failure
            if (this.chatClient) {
              console.log("Twitch: Retrying message via IRC fallback...");
              this.chatClient
                .say(this.channelName, message)
                .catch((ircError: unknown) => {
                  console.log(
                    `* ERROR: Twitch Message FAILED to send via IRC fallback: ${ircError instanceof Error ? ircError.message : String(ircError)}`,
                  );
                });
            }
          });
      } else if (this.chatClient) {
        console.log(
          "Twitch: Sending message via IRC fallback (API client not available).",
        );
        this.chatClient
          .say(this.channelName, message)
          .catch((error: unknown) => {
            console.log(
              `* ERROR: Twitch Message FAILED to send via IRC fallback: ${error instanceof Error ? error.message : String(error)}`,
            );
          });
      } else {
        console.log(
          "* ERROR: No Twitch send method available (neither API nor IRC).",
        );
      }
    }, delay);
  }

  /**
   * Handles subscriber first message quiz chance
   * @param msg The unified chat message
   */
  public async subscriberFirstMessageQuiz(
    msg: UnifiedChatMessage,
  ): Promise<void> {
    if (!this.apiClient || !this.streamerUser) {
      return;
    }

    if (
      msg.platform === "twitch" &&
      msg.author.isSubscriber &&
      msg.author.id &&
      !this.subscriberFirstMessageReceived.includes(msg.author.id) &&
      msg.author.id !== this.streamerUser.id
    ) {
      this.subscriberFirstMessageReceived.push(msg.author.id);

      let subTier: string = "1000"; // Default to Tier 1
      try {
        subTier = (
          await this.apiClient.subscriptions.getSubscriptionsForUsers(
            this.streamerUser,
            [msg.author.id],
          )
        )[0].tier;
      } catch (error) {
        console.error(
          `Error fetching subscription tier for user ${msg.author.displayName}:`,
          error,
        );
      }

      const rollThreshold = getSubQuizRollThreshold(subTier);

      const roll = Between(0, 99);

      if (roll < rollThreshold) {
        console.log(
          `Successful Subscriber Quiz Roll for ${msg.author.displayName} Tier=${subTier} Roll=${roll} Threshold=${rollThreshold}`,
        );

        await sleep(1000);

        const subQuizTwitchMessage = structuredClone(Wingbot953Message);
        subQuizTwitchMessage.platform = "twitch";
        subQuizTwitchMessage.message.text = `wingma14Think ${msg.author.displayName}'s sheer presence has started a quiz! wingma14Think`;

        sendChatMessage(subQuizTwitchMessage);

        await sleep(2000);

        QuizManager.getInstance().queueQuiz();
      }
    }
  }

  /**
   * Handles follow age command
   * @param msg The unified chat message
   */
  public async handleFollowAge(msg: UnifiedChatMessage): Promise<void> {
    if (!this.apiClient || !this.streamerUser) {
      return;
    }

    try {
      const followInfo = await this.apiClient.channels.getChannelFollowers(
        this.streamerUser.id,
        msg.author.id,
      );

      const followMessage: UnifiedChatMessage =
        structuredClone(Wingbot953Message);
      followMessage.platform = "twitch";

      // Check if the user is following the broadcaster
      if (!followInfo.data.length) {
        console.log(
          `${msg.author.displayName} is not following ${this.streamerUser.displayName}`,
        );

        followMessage.message.text = `@${msg.author.displayName} You are not following!`;

        sendChatMessage(followMessage);
        return;
      }

      const followData = followInfo.data[0];
      const followDate = new Date(followData.followDate);
      const currentTimestamp = Date.now();
      const followStartTimestamp = followDate.getTime();

      followMessage.message.text = `@${
        msg.author.displayName
      } You have been following for ${SecondsToDuration(
        (currentTimestamp - followStartTimestamp) / 1000,
      )}!`;

      sendChatMessage(followMessage);
    } catch {
      console.log("CATCH: Failed to retrieve follow age.");
    }
  }

  /**
   * Handles uptime command
   * @param msg The unified chat message
   */
  public async handleUptime(msg: UnifiedChatMessage): Promise<void> {
    if (!this.apiClient) {
      return;
    }

    try {
      const channel = await this.apiClient.channels.getChannelInfoById(
        msg.channel.id!,
      );
      const stream = channel?.displayName
        ? await this.apiClient.streams.getStreamByUserName(channel.displayName)
        : null;

      if (stream) {
        const currentTimestamp = Date.now();
        const streamStartTimestamp = stream.startDate.getTime();

        const uptimeMessage = structuredClone(Wingbot953Message);
        uptimeMessage.message.text = `@${
          msg.author.displayName
        } Stream uptime: ${SecondsToDuration(
          (currentTimestamp - streamStartTimestamp) / 1000,
        )}`;
        uptimeMessage.platform = "twitch";

        sendChatMessage(uptimeMessage);
      } else {
        console.log("* ERROR Failed to get stream uptime.");
      }
    } catch {
      console.log("CATCH: Failed to reach Twitch API.");
    }
  }

  /**
   * Enables slow mode in chat
   * @param delay_seconds Delay in seconds between messages
   */
  public async enableSlowMode(delay_seconds: number): Promise<void> {
    if (!this.apiClient || !this.streamerUser) {
      return;
    }

    try {
      await this.apiClient.chat.updateSettings(this.streamerUser.id, {
        slowModeEnabled: true,
        slowModeDelay: delay_seconds,
      });
      console.log(`* Slow mode enabled for ${delay_seconds} seconds.`);
    } catch (error: unknown) {
      console.log(
        `* ERROR: Failed to enable slow mode: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Disables slow mode in chat
   */
  public async disableSlowMode(): Promise<void> {
    if (!this.apiClient || !this.streamerUser) {
      return;
    }

    try {
      await this.apiClient.chat.updateSettings(this.streamerUser.id, {
        slowModeEnabled: false,
        slowModeDelay: 0,
      });
      console.log("* Slow mode disabled.");
    } catch (error: unknown) {
      console.log(
        `* ERROR: Failed to disable slow mode: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Runs an ad break
   * @param msg The unified chat message containing duration
   */
  public async runAd(msg: UnifiedChatMessage): Promise<void> {
    if (!this.apiClient || !this.streamerUser) {
      return;
    }

    const originalMessage = msg.message.text;

    if (originalMessage.split(" ").length != 2) {
      console.log(
        `ERROR: Invalid ad command format, received: ${originalMessage}`,
      );
      return;
    }

    try {
      const duration: CommercialLength = parseInt(
        originalMessage.split(" ")[1].trim(),
      ) as CommercialLength;
      console.log("Starting ad break for " + duration + " seconds.");
      await this.apiClient.channels.startChannelCommercial(
        this.streamerUser,
        duration,
      );
      QuizManager.getInstance().queueQuiz();
    } catch (error: unknown) {
      console.log(
        `* ERROR: Failed to start ad break: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Handles Quiz Start reward redemption
   * @private
   * @param reward The reward redemption
   */
  private handleQuizStartRedemption(): void {
    QuizManager.getInstance().queueQuiz();
  }

  /**
   * Handles G'Day Streamer reward redemption
   * @private
   */
  private handleGDayRedemption(userDisplayName: string, userId: string): void {
    if (!this.streamerUser) return;

    console.log(`${userDisplayName} redeemed G'Day Streamer!`);

    const gDayMessage: UnifiedChatMessage = structuredClone(Wingbot953Message);
    gDayMessage.platform = "twitch";
    gDayMessage.author.displayName = userDisplayName;
    gDayMessage.author.id = userId;
    gDayMessage.twitchSpecific = {
      isHighlighted: true,
    };
    gDayMessage.message.text = `wingma14Arrive G'Day ${this.streamerUser.displayName}!`;

    sendChatMessage(gDayMessage, true, false);
  }

  /**
   * Handles G'Night Streamer reward redemption
   * @private
   */
  private handleGNightRedemption(
    userDisplayName: string,
    userId: string,
  ): void {
    if (!this.streamerUser) return;

    console.log(`${userDisplayName} redeemed G'Night Streamer!`);

    const gNightMessage: UnifiedChatMessage =
      structuredClone(Wingbot953Message);
    gNightMessage.platform = "twitch";
    gNightMessage.author.displayName = userDisplayName;
    gNightMessage.author.id = userId;
    gNightMessage.twitchSpecific = {
      isHighlighted: true,
    };
    gNightMessage.message.text = `wingma14Good Good night, ${this.streamerUser.displayName}!`;

    sendChatMessage(gNightMessage, true, false);
  }

  /**
   * Handles Add Custom Greeting reward redemption
   * @private
   */
  private handleAddCustomGreetingRedemption(
    userDisplayName: string,
    userId: string,
    userInput: string,
  ): void {
    console.log(`${userDisplayName} redeemed Add Custom Greeting!`);

    const customGreetingMessage: UnifiedChatMessage =
      structuredClone(Wingbot953Message);
    customGreetingMessage.platform = "system";
    customGreetingMessage.message.text = `Twitch user ${userDisplayName} added a Custom Greeting!`;

    sendChatMessage(customGreetingMessage);

    void AddWelcomeMessage(userDisplayName, userId, "twitch", userInput || "");

    console.log("Custom Greeting added!");

    const customGreetingResponseMessage: UnifiedChatMessage =
      structuredClone(Wingbot953Message);
    customGreetingResponseMessage.platform = "twitch";
    customGreetingResponseMessage.message.text = `@${userDisplayName}, your custom greeting has been added for future streams!`;

    void sleep(1000).then(() => {
      sendChatMessage(customGreetingResponseMessage, false);
    });
  }

  /**
   * Clean up resources when manager is no longer needed
   */
  public dispose(): void {
    // Stop EventSub listener
    if (this.botEventSubListener) {
      this.botEventSubListener.stop();
      this.botEventSubListener = undefined;
    }
    if (this.streamerEventSubListener) {
      this.streamerEventSubListener.stop();
      this.streamerEventSubListener = undefined;
    }
    this.isEventSubInitialised = false;

    // Clear all intervals
    this.clearIntervals();

    // Disconnect chat client
    if (this.chatClient) {
      this.chatClient.quit();
      this.chatClient = undefined;
    }

    // Reset state
    this.isAuthenticated = false;
    this.isLiveState = false;
    this.resetSubscriberFirstMessageReceived();
  }
}
