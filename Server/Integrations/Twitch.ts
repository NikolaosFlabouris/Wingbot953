import {
  RefreshingAuthProvider,
  exchangeCode,
  AccessToken,
} from "@twurple/auth";
import {
  ChatClient,
  ChatMessage,
  ChatRaidInfo,
  ChatSubGiftInfo,
  ChatSubInfo,
  UserNotice,
} from "@twurple/chat";
import {
  ApiClient,
  CommercialLength,
  HelixCustomReward,
  HelixCustomRewardRedemption,
  HelixUser,
} from "@twurple/api";
import open from "open";
import * as http from "node:http";
import * as fs from "fs";

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
import { EmoteInfo, UnifiedChatMessage } from "../../Common/UnifiedChatMessage";
import { BadgeCache } from "./TwitchBadgeCache";
import { EventBus, EventTypes } from "./EventBus";
import {
  getSubQuizRollThreshold,
  buildSubMessage,
  buildResubMessage,
  buildSubGiftMessage,
  buildRaidMessage,
  parseEmotePosition,
  extractEmoteName,
  buildEmoteUrl,
} from "./TwitchLogic";

/**
 * Twitch OAuth scopes required for the application
 */
const TWITCH_SCOPES = [
  "chat:read",
  "analytics:read:extensions",
  "analytics:read:games",
  "bits:read",
  "channel:edit:commercial",
  "channel:manage:broadcast",
  "channel:manage:extensions",
  "channel:manage:polls",
  "channel:manage:predictions",
  "channel:manage:raids",
  "channel:manage:redemptions",
  "channel:manage:schedule",
  "channel:manage:videos",
  "channel:read:editors",
  "channel:read:goals",
  "channel:read:hype_train",
  "channel:read:polls",
  "channel:read:predictions",
  "channel:read:redemptions",
  "channel:read:stream_key",
  "channel:read:subscriptions",
  "clips:edit",
  "moderation:read",
  "moderator:manage:banned_users",
  "moderator:read:blocked_terms",
  "moderator:manage:blocked_terms",
  "moderator:manage:automod",
  "moderator:read:automod_settings",
  "moderator:manage:automod_settings",
  "moderator:read:chat_settings",
  "moderator:manage:chat_settings",
  "user:edit",
  "user:edit:follows",
  "user:manage:blocked_users",
  "user:read:blocked_users",
  "user:read:broadcast",
  "user:read:email",
  "user:read:follows",
  "user:read:subscriptions",
  "channel:moderate",
  "whispers:edit",
  "chat:edit",
];

/**
 * Interface for Twitch reward handler configuration
 */
interface TwitchRewardHandler {
  reward: HelixCustomReward;
  lastRedemptionTime: number;
  handler: (reward: HelixCustomRewardRedemption) => void | Promise<void>;
}

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
  private botAuthProvider?: RefreshingAuthProvider;
  private streamerAuthProvider?: RefreshingAuthProvider;
  private isAuthenticated: boolean = false;
  private tokenPath: string = "./Data/Tokens/twitch-tokens.json";
  private authStep: "bot" | "streamer" | "complete" = "bot";

  // Chat and API clients
  private chatClient?: ChatClient;
  private apiClient?: ApiClient;
  private streamerUser?: HelixUser;

  // Stream state
  private isLiveState: boolean = false;
  private streamName: string = "";
  private streamGame: string = "";
  private channelName: string = "Wingman953";

  // Intervals and timers
  private quizInterval?: NodeJS.Timeout;
  private periodicMessagesInterval?: NodeJS.Timeout;
  private twitchApiPollingInterval?: NodeJS.Timeout;
  private streamNameAndGameInterval?: NodeJS.Timeout;

  // Reward handling
  private twitchRewards: TwitchRewardHandler[] = [];
  private latestRedemptionDate: number = Date.now();

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
   * @param server HTTP server instance for handling OAuth callback
   */
  public async initialise(server: http.Server): Promise<void> {
    console.log("Twitch Integration Setup");

    try {
      // Check if we have saved tokens
      if (fs.existsSync(this.tokenPath)) {
        console.log("Loading existing Twitch tokens...");
        const storedData = JSON.parse(
          fs.readFileSync(this.tokenPath, "utf-8")
        ) as StoredTokens;

        if (storedData.botTokens && storedData.streamerTokens) {
          this.botTwitchAccessToken = storedData.botTokens;
          this.streamerTwitchAccessToken = storedData.streamerTokens;
          await this.continueSetup();
          return;
        }
      }

      // Start OAuth flow if no tokens exist
      await this.startAuthFlow(server);
    } catch (error) {
      console.error("Error during Twitch initialization:", error);
      throw error;
    }
  }

  /**
   * Starts the OAuth authentication flow using the provided server
   * @private
   * @param server The HTTP server instance to handle OAuth callback
   */
  private async startAuthFlow(server: http.Server): Promise<void> {
    return new Promise((resolve, reject) => {
      // Store original listeners to restore later
      const originalListeners = server.listeners("request");

      // Create our request handler
      const twitchHandler = async (
        req: http.IncomingMessage,
        res: http.ServerResponse
      ) => {
        try {
          const parsedUrl = new URL(req.url || "/", `http://localhost:3000`);
          const pathname = parsedUrl.pathname;

          // Handle the Twitch OAuth callback
          if (pathname === "/twitch/callback") {
            console.log("Twitch Callback received");

            const code = parsedUrl.searchParams.get("code");
            if (!code) {
              res.writeHead(400, { "Content-Type": "text/plain" });
              res.end("Missing authorization code");
              return;
            }

            try {
              if (this.authStep === "bot") {
                // First auth: Bot account
                this.botTwitchAccessToken = await exchangeCode(
                  process.env.TWITCH_CLIENT_ID!,
                  process.env.TWITCH_CLIENT_SECRET!,
                  code,
                  process.env.TWITCH_REDIRECT_URI!
                );

                this.authStep = "streamer";

                // Send intermediate response and open streamer auth
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(this.generateIntermediateResponse());

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
                  process.env.TWITCH_REDIRECT_URI!
                );

                this.authStep = "complete";

                // Save tokens
                this.saveTokens();

                // Send success response
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(this.generateSuccessResponse());

                // Continue setup
                await this.continueSetup();
                resolve();
              }
            } catch (error) {
              console.error("Error during token exchange:", error);
              res.writeHead(500, { "Content-Type": "text/html" });
              res.end(this.generateErrorResponse());
              reject(error instanceof Error ? error : new Error(String(error)));
            }
            return; // We handled this request
          }

          // If it's not a Twitch callback, pass to original handlers
          for (const listener of originalListeners) {
            if (typeof listener === "function") {
              try {
                listener.call(server, req, res);
                return; // Successfully handled by original listener
              } catch {
                continue; // Continue to next listener if this one fails
              }
            }
          }

          // If no original handlers could handle the request
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
      server.removeAllListeners("request");
      server.on("request", (req: http.IncomingMessage, res: http.ServerResponse) => { void twitchHandler(req, res); });

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
            <p>Please wait for the streamer authentication window to open...</p>
          </div>
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
      // Setup bot auth provider
      this.botAuthProvider = new RefreshingAuthProvider({
        clientId: process.env.TWITCH_CLIENT_ID!,
        clientSecret: process.env.TWITCH_CLIENT_SECRET!,
      });

      // Add initial bot user with tokens
      await this.botAuthProvider.addUserForToken(
        {
          accessToken: this.botTwitchAccessToken.accessToken,
          refreshToken: this.botTwitchAccessToken.refreshToken,
          expiresIn: 0, // Will force a refresh on first use
          obtainmentTimestamp: 0,
        },
        ["chat"] // This line fixes the error
      );

      // Set up a handler to save tokens when they refresh
      this.botAuthProvider.onRefresh((userId, newTokenData) => {
        try {
          this.botTwitchAccessToken = newTokenData;
          this.saveTokens();
          console.log(`Bot tokens refreshed for user ${userId}`);
        } catch (error) {
          console.error("Error saving refreshed bot tokens:", error);
        }
      });

      // Setup streamer auth provider
      this.streamerAuthProvider = new RefreshingAuthProvider({
        clientId: process.env.TWITCH_CLIENT_ID!,
        clientSecret: process.env.TWITCH_CLIENT_SECRET!,
      });

      // Add initial streamer user with tokens
      await this.streamerAuthProvider.addUserForToken({
        accessToken: this.streamerTwitchAccessToken.accessToken,
        refreshToken: this.streamerTwitchAccessToken.refreshToken,
        expiresIn: 0, // Will force a refresh on first use
        obtainmentTimestamp: 0,
      });

      // Set up a handler to save tokens when they refresh
      this.streamerAuthProvider.onRefresh((userId, newTokenData) => {
        try {
          this.streamerTwitchAccessToken = newTokenData;
          this.saveTokens();
          console.log(`Streamer tokens refreshed for user ${userId}`);
        } catch (error) {
          console.error("Error saving refreshed streamer tokens:", error);
        }
      });

      // Setup chat client
      this.chatClient = new ChatClient({
        authProvider: this.botAuthProvider,
        channels: [this.channelName],
      });

      this.chatClient.onConnect(() => {
        console.log("* Twitch Chat Connected!");
      });

      // Setup API client
      this.apiClient = new ApiClient({
        authProvider: this.streamerAuthProvider,
      });

      // Find streamer user
      const findStreamer = await this.apiClient.users.getUserByName(
        this.channelName
      );

      if (findStreamer) {
        this.streamerUser = findStreamer;
      } else {
        throw new Error("Failed to find streamer user");
      }

      await this.setupRewards();
      this.setupEventHandlers();

      // Initialize badge cache
      BadgeCache.initialize(this.apiClient);

      // Connect to chat
      this.chatClient.connect();

      // Start API polling
      this.startApiPolling();

      this.isAuthenticated = true;
      console.log("Twitch setup completed successfully");
    } catch (error) {
      console.error("Error during Twitch setup:", error);
      throw error;
    }
  }

  /**
   * Sets up channel point rewards and their handlers
   * @private
   */
  private async setupRewards(): Promise<void> {
    if (!this.apiClient || !this.streamerUser) {
      throw new Error("API client or streamer user not initialized");
    }

    try {
      // Find reward info
      const rewardsWingman953 =
        await this.apiClient.channelPoints.getCustomRewards(
          this.streamerUser.id,
          false
        );

      // Setup reward handlers
      for (const reward of rewardsWingman953) {
        switch (reward.title) {
          case "Start a Quiz Round":
            this.twitchRewards.push({
              reward: reward,
              lastRedemptionTime: Date.now(),
              handler: this.handleQuizStartRedemption.bind(this),
            });
            break;
          case "G'Day Streamer":
            this.twitchRewards.push({
              reward: reward,
              lastRedemptionTime: Date.now(),
              handler: this.handleGDayRedemption.bind(this),
            });
            break;
          case "G'Night Streamer":
            this.twitchRewards.push({
              reward: reward,
              lastRedemptionTime: Date.now(),
              handler: this.handleGNightRedemption.bind(this),
            });
            break;
          case "Add Custom Greeting":
            this.twitchRewards.push({
              reward: reward,
              lastRedemptionTime: Date.now(),
              handler: this.handleAddCustomGreetingRedemption.bind(this),
            });
            break;
        }
      }

      console.log(`Set up ${this.twitchRewards.length} reward handlers`);
    } catch (error) {
      console.error("Error setting up rewards:", error);
      throw error;
    }
  }

  /**
   * Sets up Twitch event handlers for chat, subscriptions, etc.
   * @private
   */
  private setupEventHandlers(): void {
    if (!this.chatClient || !this.streamerUser) {
      throw new Error("Chat client or streamer user not initialized");
    }

    // Chat message handler
    this.chatClient.onMessage(
      (
        channel: string,
        user: string,
        message: string,
        msg: ChatMessage
      ) => { void (async () => {
        const unifiedMessage: UnifiedChatMessage = {
          id: msg.id,
          platform: "twitch",
          timestamp: new Date(),
          channel: {
            id: msg?.channelId || undefined,
            name: channel.replace("#", ""),
          },
          author: {
            id: msg.userInfo.userId,
            colour: msg.userInfo.color || "#FFFFFF",
            name: user,
            displayName: msg.userInfo.displayName || user,
            isModerator: msg.userInfo.isMod || false,
            isSubscriber: msg.userInfo.isSubscriber || false,
            isOwner: msg.userInfo.isBroadcaster || false,
          },
          message: {
            text: message,
            emoteMap: this.parseEmotesFromMessage(message, msg),
          },
          twitchSpecific: {
            bits: msg.bits,
            firstMessage: msg.isFirst,
            returningChatter: msg.isReturningChatter,
            badges: await BadgeCache.getBadgeIcons(
              this.streamerUser!.id,
              msg.userInfo.badges
            ),
            isHighlighted: msg.isHighlight || false,
          },
        };

        handleChatMessage(unifiedMessage);
      })(); }
    );

    // Subscription handler
    this.chatClient.onSub(
      (
        channel: string,
        user: string,
        subInfo: ChatSubInfo,
        msg: UserNotice
      ) => {
        const subMessage: UnifiedChatMessage = structuredClone(Wingbot953Message);
        subMessage.message.text = buildSubMessage(msg.userInfo.displayName, subInfo.months);
        subMessage.platform = "twitch";
        subMessage.twitchSpecific = {
          messageType: "sub",
        };

        void sleep(1000).then(() => {
          sendChatMessage(subMessage);

          if (subInfo.message) {
            subMessage.message.text = `Sub message from ${user}: ${subInfo.message}`;
            subMessage.platform = "twitch";
            subMessage.author.displayName = msg.userInfo.displayName;

            sendChatMessage(subMessage);
          }
        });

        setTimeout(() => {
          QuizManager.getInstance().queueQuiz();
        }, 5000);
      }
    );

    // Resubscription handler
    this.chatClient.onResub(
      (
        channel: string,
        user: string,
        subInfo: ChatSubInfo,
        msg: UserNotice
      ) => {
        const subMessage: UnifiedChatMessage = structuredClone(Wingbot953Message);
        subMessage.message.text = buildResubMessage(user, subInfo.months);
        subMessage.platform = "twitch";
        subMessage.twitchSpecific = {
          messageType: "resub",
        };

        void sleep(1000).then(() => {
          sendChatMessage(subMessage);

          if (subInfo.message) {
            subMessage.message.text = `${subInfo.message}`;
            subMessage.platform = "twitch";
            subMessage.author.displayName = msg.userInfo.displayName;

            sendChatMessage(subMessage);
          }
        });

        setTimeout(() => {
          QuizManager.getInstance().queueQuiz();
        }, 5000);
      }
    );

    // Gift subscription handler
    this.chatClient.onSubGift(
      (
        channel: string,
        user: string,
        subInfo: ChatSubGiftInfo
      ) => {
        const subGiftMessage: UnifiedChatMessage =
          structuredClone(Wingbot953Message);
        subGiftMessage.message.text = buildSubGiftMessage(subInfo.gifter || "Anonymous", user);
        subGiftMessage.platform = "twitch";
        subGiftMessage.twitchSpecific = {
          messageType: "subgift",
        };

        void sleep(1000).then(() => {
          sendChatMessage(subGiftMessage);
        });

        setTimeout(() => {
          QuizManager.getInstance().queueQuiz();
        }, 5000);
      }
    );

    // Raid handler
    this.chatClient.onRaid(
      (
        channel: string,
        user: string,
        raidInfo: ChatRaidInfo
      ) => {
        const raidMessage: UnifiedChatMessage =
          structuredClone(Wingbot953Message);
        raidMessage.message.text = buildRaidMessage(raidInfo.displayName, raidInfo.viewerCount);
        raidMessage.platform = "twitch";
        raidMessage.twitchSpecific = {
          isHighlighted: true,
        };

        void sleep(1000).then(() => {
          sendChatMessage(raidMessage);
        });

        setTimeout(() => {
          QuizManager.getInstance().queueQuiz();
        }, 5000);
      }
    );
  }

  /**
   * Starts API polling for stream status and reward redemptions
   * @private
   */
  private startApiPolling(): void {
    // Start polling immediately
    void this.twitchApiPolling();

    // Set up interval for polling
    this.twitchApiPollingInterval = setInterval(() => {
      void this.twitchApiPolling();
    }, 5000); // 5 seconds
  }

  /**
   * Polls the Twitch API for stream status and reward redemptions
   * @private
   */
  private async twitchApiPolling(): Promise<void> {
    if (!this.apiClient || !this.streamerUser) {
      return;
    }

    try {
      const streamWingman953 = await this.apiClient.streams.getStreamByUserId(
        this.streamerUser.id
      );

      // Check if stream status changed
      if (this.isLiveState && streamWingman953?.startDate == null) {
        // Stream ended
        this.isLiveState = false;
        console.log("Streamer went offline!");

        // Emit stream ended event for other managers
        this.eventBus.safeEmit(EventTypes.TWITCH_STREAM_ENDED);

        this.clearIntervals();
        this.resetSubscriberFirstMessageReceived();

        const endstreamMessage: UnifiedChatMessage =
          structuredClone(Wingbot953Message);
        endstreamMessage.platform = "twitch";
        endstreamMessage.message.text = `wingma14Blush Thanks for the stream!`;
        sendChatMessage(endstreamMessage);
      } else if (
        !this.isLiveState &&
        streamWingman953?.startDate != undefined
      ) {
        // Stream started
        this.isLiveState = true;
        console.log("Streamer went live!");

        // Emit stream started event for other managers
        this.eventBus.safeEmit(EventTypes.TWITCH_STREAM_STARTED);

        this.streamName = streamWingman953.title;
        this.streamGame = streamWingman953.gameName;

        TwitchLivestreamAlert(this.streamName, this.streamGame);
        LoadWelcomeMessages();
        QuizManager.getInstance().resetUsedQuestions();

        // Start automatic timers
        this.quizInterval = setInterval(
          () => QuizManager.getInstance().queueQuiz(),
          Between(2100000, 2700000)
        ); // 35-45mins

        this.periodicMessagesInterval = setInterval(
          PeriodicTwitchMessages,
          3300000
        ); // 55mins
        this.streamNameAndGameInterval = setInterval(
          () => void this.pollStreamNameAndGame(),
          60000
        ); // 1min

        const startStreamMessage: UnifiedChatMessage =
          structuredClone(Wingbot953Message);
        startStreamMessage.platform = "twitch";
        startStreamMessage.message.text = `wingma14Arrive Good Luck Streamer! wingma14Blush`;
        sendChatMessage(startStreamMessage);
      }

      // Check for reward redemptions
      for (const reward of this.twitchRewards) {
        const redemptions =
          await this.apiClient.channelPoints.getRedemptionsForBroadcaster(
            this.streamerUser.id,
            reward.reward.id,
            "UNFULFILLED",
            { newestFirst: true }
          );

        if (
          redemptions.data.length > 0 &&
          redemptions.data[0].redemptionDate.getTime() >
            this.latestRedemptionDate
        ) {
          this.latestRedemptionDate =
            redemptions.data[0].redemptionDate.getTime();
          void reward.handler(redemptions.data[0]);
        }
      }
    } catch (error: unknown) {
      console.log(`* ERROR: Twitch API polling failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

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
        this.streamerUser.id
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
      if (this.chatClient) {
        this.chatClient.say(this.channelName, message).catch((error: unknown) => {
          console.log(`* ERROR: Twitch Message FAILED to send: ${error instanceof Error ? error.message : String(error)}`);
        });
      }
    }, delay);
  }

  /**
   * Handles subscriber first message quiz chance
   * @param msg The unified chat message
   */
  public async subscriberFirstMessageQuiz(
    msg: UnifiedChatMessage
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
            [msg.author.id]
          )
        )[0].tier;
      } catch (error) {
        console.error(
          `Error fetching subscription tier for user ${msg.author.displayName}:`,
          error
        );
      }

      const rollThreshold = getSubQuizRollThreshold(subTier);

      const roll = Between(0, 99);

      if (roll < rollThreshold) {
        console.log(
          `Successful Subscriber Quiz Roll for ${msg.author.displayName} Tier=${subTier} Roll=${roll} Threshold=${rollThreshold}`
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
        msg.author.id
      );

      const followMessage: UnifiedChatMessage =
        structuredClone(Wingbot953Message);
      followMessage.platform = "twitch";

      // Check if the user is following the broadcaster
      if (!followInfo.data.length) {
        console.log(
          `${msg.author.displayName} is not following ${this.streamerUser.displayName}`
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
        (currentTimestamp - followStartTimestamp) / 1000
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
        msg.channel.id!
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
          (currentTimestamp - streamStartTimestamp) / 1000
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
      console.log(`* ERROR: Failed to enable slow mode: ${error instanceof Error ? error.message : String(error)}`);
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
      console.log(`* ERROR: Failed to disable slow mode: ${error instanceof Error ? error.message : String(error)}`);
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
        `ERROR: Invalid ad command format, received: ${originalMessage}`
      );
      return;
    }

    try {
      const duration: CommercialLength = parseInt(
        originalMessage.split(" ")[1].trim()
      ) as CommercialLength;
      console.log("Starting ad break for " + duration + " seconds.");
      await this.apiClient.channels.startChannelCommercial(
        this.streamerUser,
        duration
      );
      QuizManager.getInstance().queueQuiz();
    } catch (error: unknown) {
      console.log(`* ERROR: Failed to start ad break: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Parse emotes from a chat message using Twurple's built-in emote parsing
   * @private
   * @param message The chat message text
   * @param msg The ChatMessage object from Twurple
   * @returns Array of emote information
   */
  private parseEmotesFromMessage(
    message: string,
    msg: ChatMessage
  ): EmoteInfo[] {
    const emotes: EmoteInfo[] = [];

    // Process emotes from the emoteOffsets Map provided by Twurple
    for (const [emoteId, positions] of msg.emoteOffsets.entries()) {
      for (const position of positions) {
        const { start, end } = parseEmotePosition(position);

        emotes.push({
          id: emoteId,
          name: extractEmoteName(message, start, end),
          startIndex: start,
          endIndex: end,
          url: buildEmoteUrl(emoteId),
        });
      }
    }

    // Re-sort emotes by original position
    emotes.sort((a, b) => a.startIndex - b.startIndex);

    return emotes;
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
   * @param reward The reward redemption
   */
  private handleGDayRedemption(
    reward: HelixCustomRewardRedemption
  ): void {
    if (!this.streamerUser) return;

    console.log(`${reward.userDisplayName} redeemed G'Day Streamer!`);

    const gDayMessage: UnifiedChatMessage = structuredClone(Wingbot953Message);
    gDayMessage.platform = "twitch";
    gDayMessage.author.displayName = reward.userDisplayName;
    gDayMessage.author.id = reward.userId;
    gDayMessage.twitchSpecific = {
      isHighlighted: true,
    };
    gDayMessage.message.text = `wingma14Arrive G'Day ${this.streamerUser.displayName}!`;

    sendChatMessage(gDayMessage, true, false);
  }

  /**
   * Handles G'Night Streamer reward redemption
   * @private
   * @param reward The reward redemption
   */
  private handleGNightRedemption(
    reward: HelixCustomRewardRedemption
  ): void {
    if (!this.streamerUser) return;

    console.log(`${reward.userDisplayName} redeemed G'Night Streamer!`);

    const gNightMessage: UnifiedChatMessage = structuredClone(Wingbot953Message);
    gNightMessage.platform = "twitch";
    gNightMessage.author.displayName = reward.userDisplayName;
    gNightMessage.author.id = reward.userId;
    gNightMessage.twitchSpecific = {
      isHighlighted: true,
    };
    gNightMessage.message.text = `wingma14Good Good night, ${this.streamerUser.displayName}!`;

    sendChatMessage(gNightMessage, true, false);
  }

  /**
   * Handles Add Custom Greeting reward redemption
   * @private
   * @param reward The reward redemption
   */
  private async handleAddCustomGreetingRedemption(
    reward: HelixCustomRewardRedemption
  ): Promise<void> {
    const userDisplayName = (await reward.getUser()).displayName;
    console.log(`${userDisplayName} redeemed Add Custom Greeting!`);

    const customGreetingMessage: UnifiedChatMessage =
      structuredClone(Wingbot953Message);
    customGreetingMessage.platform = "system";
    customGreetingMessage.message.text = `Twitch user ${userDisplayName} added a Custom Greeting!`;

    sendChatMessage(customGreetingMessage);

    void AddWelcomeMessage(
      userDisplayName,
      reward.userId,
      "twitch",
      (reward.userInput) || ""
    );

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
    // Clear all intervals
    this.clearIntervals();

    if (this.twitchApiPollingInterval) {
      clearInterval(this.twitchApiPollingInterval);
      this.twitchApiPollingInterval = undefined;
    }

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
