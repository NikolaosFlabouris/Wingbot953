import { EventSubWsListener } from "@twurple/eventsub-ws";
import { ApiClient } from "@twurple/api";
import {
  sendToWebSocketClients,
  Wingbot953Message,
  sendChatMessage,
} from "../MessageHandling";
import { EventBus, EventTypes } from "./EventBus";
import { UnifiedChatMessage } from "../../Common/UnifiedChatMessage";

/**
 * Manages Twitch EventSub WebSocket subscriptions for real-time event notifications.
 *
 * EventSub provides push-based notifications for Twitch events that cannot be captured
 * through IRC chat alone, such as follows, hype trains, predictions, polls, and shoutouts.
 * This supplements the existing polling-based approach with instant event delivery.
 *
 * Uses the WebSocket transport (no public URL required) and handles automatic reconnection.
 *
 * @example
 * ```typescript
 * const eventSub = TwitchEventSubManager.getInstance();
 * await eventSub.initialise(apiClient, authProvider, broadcasterId);
 * ```
 */
export class TwitchEventSubManager {
  private static instance: TwitchEventSubManager;
  private listener?: EventSubWsListener;
  private eventBus: EventBus;
  private isInitialised: boolean = false;

  private constructor() {
    this.eventBus = EventBus.getInstance();
  }

  /**
   * Gets the singleton instance of TwitchEventSubManager
   */
  public static getInstance(): TwitchEventSubManager {
    if (!TwitchEventSubManager.instance) {
      TwitchEventSubManager.instance = new TwitchEventSubManager();
    }
    return TwitchEventSubManager.instance;
  }

  /**
   * Initializes the EventSub WebSocket listener and subscribes to events
   * @param apiClient The Twitch API client (authenticated as the broadcaster)
   * @param broadcasterId The broadcaster's Twitch user ID
   */
  public async initialise(
    apiClient: ApiClient,
    broadcasterId: string
  ): Promise<void> {
    if (this.isInitialised) {
      console.log("TwitchEventSub: Already initialised, skipping.");
      return;
    }

    console.log("TwitchEventSub: Initialising EventSub WebSocket listener...");

    try {
      this.listener = new EventSubWsListener({
        apiClient,
      });

      this.subscribeToFollowEvents(broadcasterId);
      this.subscribeToHypeTrainEvents(broadcasterId);
      this.subscribeToChannelPointRedemptions(broadcasterId);
      this.subscribeToStreamEvents(broadcasterId);
      this.subscribeToPredictionEvents(broadcasterId);
      this.subscribeToPollEvents(broadcasterId);
      this.subscribeToShoutoutEvents(broadcasterId);
      this.subscribeToSubscriptionEvents(broadcasterId);

      this.listener.start();
      this.isInitialised = true;
      console.log("TwitchEventSub: EventSub WebSocket listener started successfully.");
    } catch (error) {
      console.error("TwitchEventSub: Failed to initialise EventSub:", error);
    }
  }

  // ---------------------------------------------------------------------------
  // Follow Events
  // ---------------------------------------------------------------------------

  /**
   * Subscribes to channel.follow events (v2 requires moderator scope)
   */
  private subscribeToFollowEvents(broadcasterId: string): void {
    if (!this.listener) return;

    this.listener.onChannelFollow(broadcasterId, broadcasterId, (event) => {
      console.log(`TwitchEventSub: New follower - ${event.userDisplayName}`);

      const followMessage: UnifiedChatMessage = structuredClone(Wingbot953Message);
      followMessage.platform = "twitch";
      followMessage.message.text = `wingma14Arrive Welcome ${event.userDisplayName}! Thanks for the follow!`;
      followMessage.twitchSpecific = {
        isHighlighted: true,
      };

      sendChatMessage(followMessage, true, false);

      this.broadcastEventToWebSocket("follow", {
        userName: event.userName,
        userDisplayName: event.userDisplayName,
        followDate: event.followDate.toISOString(),
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Hype Train Events
  // ---------------------------------------------------------------------------

  /**
   * Subscribes to hype train begin, progress, and end events
   */
  private subscribeToHypeTrainEvents(broadcasterId: string): void {
    if (!this.listener) return;

    // Hype Train Begin
    this.listener.onChannelHypeTrainBegin(broadcasterId, (event) => {
      console.log(`TwitchEventSub: Hype Train started! Level ${event.level}, Goal: ${event.goal}`);

      const hypeMessage: UnifiedChatMessage = structuredClone(Wingbot953Message);
      hypeMessage.platform = "twitch";
      hypeMessage.message.text = `A Hype Train has started! Level ${event.level} - Let's go!`;
      hypeMessage.twitchSpecific = {
        isHighlighted: true,
      };

      sendChatMessage(hypeMessage, true, false);

      this.broadcastEventToWebSocket("hype_train_begin", {
        level: event.level,
        goal: event.goal,
        total: event.total,
        startDate: event.startDate.toISOString(),
      });
    });

    // Hype Train Progress
    this.listener.onChannelHypeTrainProgress(broadcasterId, (event) => {
      console.log(`TwitchEventSub: Hype Train progress - Level ${event.level}, ${event.total}/${event.goal}`);

      this.broadcastEventToWebSocket("hype_train_progress", {
        level: event.level,
        goal: event.goal,
        total: event.total,
        lastContribution: {
          userName: event.lastContribution.userName,
          type: event.lastContribution.type,
          total: event.lastContribution.total,
        },
        topContributors: event.topContributors.map((c) => ({
          userName: c.userName,
          type: c.type,
          total: c.total,
        })),
      });
    });

    // Hype Train End
    this.listener.onChannelHypeTrainEnd(broadcasterId, (event) => {
      console.log(`TwitchEventSub: Hype Train ended at level ${event.level}!`);

      const hypeEndMessage: UnifiedChatMessage = structuredClone(Wingbot953Message);
      hypeEndMessage.platform = "twitch";
      hypeEndMessage.message.text = `The Hype Train reached level ${event.level}! Great job everyone!`;
      hypeEndMessage.twitchSpecific = {
        isHighlighted: true,
      };

      sendChatMessage(hypeEndMessage, true, false);

      this.broadcastEventToWebSocket("hype_train_end", {
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

  // ---------------------------------------------------------------------------
  // Channel Point Redemptions
  // ---------------------------------------------------------------------------

  /**
   * Subscribes to channel point custom reward redemption events.
   * This supplements the existing polling-based approach with instant delivery.
   */
  private subscribeToChannelPointRedemptions(broadcasterId: string): void {
    if (!this.listener) return;

    this.listener.onChannelRedemptionAdd(broadcasterId, (event) => {
      console.log(
        `TwitchEventSub: Channel point redemption - ${event.userDisplayName} redeemed "${event.rewardTitle}"`
      );

      this.broadcastEventToWebSocket("channel_point_redemption", {
        userName: event.userName,
        userDisplayName: event.userDisplayName,
        rewardId: event.rewardId,
        rewardTitle: event.rewardTitle,
        rewardCost: event.rewardCost,
        userInput: event.input,
        redemptionDate: event.redemptionDate.toISOString(),
      });

      this.eventBus.safeEmit(EventTypes.TWITCH_CHANNEL_POINT_REDEMPTION, {
        userName: event.userName,
        userDisplayName: event.userDisplayName,
        rewardTitle: event.rewardTitle,
        rewardCost: event.rewardCost,
        userInput: event.input,
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Stream Online/Offline Events
  // ---------------------------------------------------------------------------

  /**
   * Subscribes to stream online and offline events.
   * These supplement the existing polling-based stream status detection.
   */
  private subscribeToStreamEvents(broadcasterId: string): void {
    if (!this.listener) return;

    this.listener.onStreamOnline(broadcasterId, (event) => {
      console.log(`TwitchEventSub: Stream went online! Type: ${event.type}`);

      this.broadcastEventToWebSocket("stream_online", {
        broadcasterName: event.broadcasterDisplayName,
        type: event.type,
        startDate: event.startDate.toISOString(),
      });

      this.eventBus.safeEmit(EventTypes.TWITCH_EVENTSUB_STREAM_ONLINE, {
        type: event.type,
        startDate: event.startDate,
      });
    });

    this.listener.onStreamOffline(broadcasterId, (event) => {
      console.log(`TwitchEventSub: Stream went offline.`);

      this.broadcastEventToWebSocket("stream_offline", {
        broadcasterName: event.broadcasterDisplayName,
      });

      this.eventBus.safeEmit(EventTypes.TWITCH_EVENTSUB_STREAM_OFFLINE);
    });
  }

  // ---------------------------------------------------------------------------
  // Prediction Events
  // ---------------------------------------------------------------------------

  /**
   * Subscribes to prediction begin, lock, and end events
   */
  private subscribeToPredictionEvents(broadcasterId: string): void {
    if (!this.listener) return;

    this.listener.onChannelPredictionBegin(broadcasterId, (event) => {
      console.log(`TwitchEventSub: Prediction started - "${event.title}"`);

      const outcomes = event.outcomes.map((o) => ({
        id: o.id,
        title: o.title,
        color: o.color,
      }));

      const predictionMessage: UnifiedChatMessage = structuredClone(Wingbot953Message);
      predictionMessage.platform = "twitch";
      predictionMessage.message.text = `Prediction started: ${event.title} - ${outcomes.map((o) => o.title).join(" vs ")}`;
      predictionMessage.twitchSpecific = {
        isHighlighted: true,
      };

      sendChatMessage(predictionMessage, true, false);

      this.broadcastEventToWebSocket("prediction_begin", {
        id: event.id,
        title: event.title,
        outcomes,
        lockDate: event.lockDate.toISOString(),
      });
    });

    this.listener.onChannelPredictionLock(broadcasterId, (event) => {
      console.log(`TwitchEventSub: Prediction locked - "${event.title}"`);

      const outcomes = event.outcomes.map((o) => ({
        id: o.id,
        title: o.title,
        color: o.color,
        totalUsers: o.users ?? 0,
        totalChannelPoints: o.channelPoints ?? 0,
      }));

      this.broadcastEventToWebSocket("prediction_lock", {
        id: event.id,
        title: event.title,
        outcomes,
      });
    });

    this.listener.onChannelPredictionEnd(broadcasterId, (event) => {
      console.log(`TwitchEventSub: Prediction ended - "${event.title}", Status: ${event.status}`);

      const outcomes = event.outcomes.map((o) => ({
        id: o.id,
        title: o.title,
        color: o.color,
        totalUsers: o.users ?? 0,
        totalChannelPoints: o.channelPoints ?? 0,
      }));

      const winningOutcome = event.winningOutcome;

      if (winningOutcome) {
        const predEndMessage: UnifiedChatMessage = structuredClone(Wingbot953Message);
        predEndMessage.platform = "twitch";
        predEndMessage.message.text = `Prediction "${event.title}" ended! Winner: ${winningOutcome.title}`;
        predEndMessage.twitchSpecific = {
          isHighlighted: true,
        };

        sendChatMessage(predEndMessage, true, false);
      }

      this.broadcastEventToWebSocket("prediction_end", {
        id: event.id,
        title: event.title,
        status: event.status,
        outcomes,
        winningOutcomeId: winningOutcome?.id ?? null,
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Poll Events
  // ---------------------------------------------------------------------------

  /**
   * Subscribes to poll begin, progress, and end events
   */
  private subscribeToPollEvents(broadcasterId: string): void {
    if (!this.listener) return;

    this.listener.onChannelPollBegin(broadcasterId, (event) => {
      console.log(`TwitchEventSub: Poll started - "${event.title}"`);

      const choices = event.choices.map((c) => ({
        id: c.id,
        title: c.title,
      }));

      const pollMessage: UnifiedChatMessage = structuredClone(Wingbot953Message);
      pollMessage.platform = "twitch";
      pollMessage.message.text = `Poll started: ${event.title} - Options: ${choices.map((c) => c.title).join(", ")}`;
      pollMessage.twitchSpecific = {
        isHighlighted: true,
      };

      sendChatMessage(pollMessage, true, false);

      this.broadcastEventToWebSocket("poll_begin", {
        id: event.id,
        title: event.title,
        choices,
        isBitsVotingEnabled: event.isBitsVotingEnabled,
        isChannelPointsVotingEnabled: event.isChannelPointsVotingEnabled,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
      });
    });

    this.listener.onChannelPollProgress(broadcasterId, (event) => {
      console.log(`TwitchEventSub: Poll progress - "${event.title}"`);

      const choices = event.choices.map((c) => ({
        id: c.id,
        title: c.title,
        totalVotes: c.totalVotes,
        channelPointsVotes: c.channelPointsVotes,
      }));

      this.broadcastEventToWebSocket("poll_progress", {
        id: event.id,
        title: event.title,
        choices,
      });
    });

    this.listener.onChannelPollEnd(broadcasterId, (event) => {
      console.log(`TwitchEventSub: Poll ended - "${event.title}", Status: ${event.status}`);

      const choices = event.choices.map((c) => ({
        id: c.id,
        title: c.title,
        totalVotes: c.totalVotes,
        channelPointsVotes: c.channelPointsVotes,
      }));

      // Find the winning choice (most total votes)
      const winningChoice = [...choices].sort(
        (a, b) => b.totalVotes - a.totalVotes
      )[0];

      if (winningChoice && event.status === "completed") {
        const pollEndMessage: UnifiedChatMessage = structuredClone(Wingbot953Message);
        pollEndMessage.platform = "twitch";
        pollEndMessage.message.text = `Poll "${event.title}" ended! Winner: ${winningChoice.title} with ${winningChoice.totalVotes} votes!`;
        pollEndMessage.twitchSpecific = {
          isHighlighted: true,
        };

        sendChatMessage(pollEndMessage, true, false);
      }

      this.broadcastEventToWebSocket("poll_end", {
        id: event.id,
        title: event.title,
        status: event.status,
        choices,
        winningChoiceId: winningChoice?.id ?? null,
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Shoutout Events
  // ---------------------------------------------------------------------------

  /**
   * Subscribes to shoutout create and receive events
   */
  private subscribeToShoutoutEvents(broadcasterId: string): void {
    if (!this.listener) return;

    this.listener.onChannelShoutoutCreate(broadcasterId, broadcasterId, (event) => {
      console.log(
        `TwitchEventSub: Shoutout created for ${event.shoutedOutBroadcasterDisplayName}`
      );

      this.broadcastEventToWebSocket("shoutout_create", {
        shoutedOutUserName: event.shoutedOutBroadcasterName,
        shoutedOutUserDisplayName: event.shoutedOutBroadcasterDisplayName,
        viewerCount: event.viewerCount,
        startDate: event.startDate.toISOString(),
      });
    });

    this.listener.onChannelShoutoutReceive(broadcasterId, broadcasterId, (event) => {
      console.log(
        `TwitchEventSub: Shoutout received from ${event.shoutingOutBroadcasterDisplayName}`
      );

      const shoutoutMessage: UnifiedChatMessage = structuredClone(Wingbot953Message);
      shoutoutMessage.platform = "twitch";
      shoutoutMessage.message.text = `We got a shoutout from ${event.shoutingOutBroadcasterDisplayName}! Thanks for the love!`;
      shoutoutMessage.twitchSpecific = {
        isHighlighted: true,
      };

      sendChatMessage(shoutoutMessage, true, false);

      this.broadcastEventToWebSocket("shoutout_receive", {
        shoutingOutUserName: event.shoutingOutBroadcasterName,
        shoutingOutUserDisplayName: event.shoutingOutBroadcasterDisplayName,
        viewerCount: event.viewerCount,
        startDate: event.startDate.toISOString(),
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Subscription Events
  // ---------------------------------------------------------------------------

  /**
   * Subscribes to subscription and gift subscription events.
   * These supplement the existing IRC-based subscription handlers.
   */
  private subscribeToSubscriptionEvents(broadcasterId: string): void {
    if (!this.listener) return;

    this.listener.onChannelSubscription(broadcasterId, (event) => {
      console.log(
        `TwitchEventSub: Subscription - ${event.userDisplayName} (Tier ${event.tier})`
      );

      this.broadcastEventToWebSocket("subscription", {
        userName: event.userName,
        userDisplayName: event.userDisplayName,
        tier: event.tier,
        isGift: event.isGift,
      });
    });

    this.listener.onChannelSubscriptionGift(broadcasterId, (event) => {
      console.log(
        `TwitchEventSub: Gift Sub - ${event.gifterDisplayName ?? "Anonymous"} gifted ${event.amount} Tier ${event.tier} subs`
      );

      this.broadcastEventToWebSocket("subscription_gift", {
        gifterName: event.gifterName,
        gifterDisplayName: event.gifterDisplayName ?? "Anonymous",
        amount: event.amount,
        tier: event.tier,
        cumulativeAmount: event.cumulativeAmount ?? 0,
        isAnonymous: event.isAnonymous,
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Broadcasts an EventSub event to connected WebSocket clients for the unified chat display.
   * Events are wrapped in a system UnifiedChatMessage so the frontend can display them.
   */
  private broadcastEventToWebSocket(
    eventType: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>
  ): void {
    const eventMessage: UnifiedChatMessage = structuredClone(Wingbot953Message);
    eventMessage.platform = "system";
    eventMessage.message.text = JSON.stringify({
      type: `eventsub:${eventType}`,
      data,
    });

    sendToWebSocketClients(eventMessage);
  }

  /**
   * Clean up resources - stops the EventSub listener
   */
  public dispose(): void {
    if (this.listener) {
      this.listener.stop();
      this.listener = undefined;
    }
    this.isInitialised = false;
    console.log("TwitchEventSub: Disposed.");
  }
}
