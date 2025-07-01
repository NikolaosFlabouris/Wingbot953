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

import { AddVipWelcome, LoadWelcomeMessages } from "../Commands/VipWelcome";
import { SecondsToDuration, Between, sleep } from "../Commands/Utils";

import { TwitchLivestreamAlert } from "./Discord";

import express = require("express");
import {
  HaloRunsSetup,
  HandleHaloRunsWr,
  HandleWingman953Pb,
} from "./HaloRuns";
import {
  handleChatMessage,
  PeriodicTwitchMessages,
  sendChatMessage,
  Wingbot953Message,
} from "../MessageHandling";
import { ResetUsedQuestions, StartQuiz } from "../Commands/Quiz";
import { AddTracksFromPlaylistToQueue } from "./Spotify";
import { EmoteInfo, UnifiedChatMessage } from "../../Common/UnifiedChatMessage";
import { BadgeCache } from "./TwitchBadgeCache";
import util from "util";

export let Wingman953: HelixUser;

let botTwitchAccessToken: AccessToken;
let streamerTwitchAccessToken: AccessToken;
let botAuthProvider;
let streamerAuthProvider;
let server: express.Application;
let chatClient: ChatClient;
export let apiClient: ApiClient;

// Intervals
let quizInterval: NodeJS.Timeout;
//var didYouKnowInterval
let periodicMessagesInterval: NodeJS.Timeout;
let twitchApiPollingInterval: NodeJS.Timeout;
let streamNameAndGameInterval: NodeJS.Timeout;

// Flags
export let isLive = false;
let streamName: string = "";
let streamGame: string = "";
let isFirstAuth = true;
type TwitchRewardHandler = {
  reward: HelixCustomReward;
  lastRedemptionTime: number;
  handler: (reward: HelixCustomRewardRedemption) => void;
};
let twitchRewards: TwitchRewardHandler[] = [];
let latestRedemptionDate: number = Date.now();

const subscriberFirstMessageReceived: string[] = [];

const authorizeURL =
  `https://id.twitch.tv/oauth2/authorize?` +
  `client_id=${process.env.TWITCH_CLIENT_ID}` +
  `&redirect_uri=${process.env.TWITCH_REDIRECT_URI}` +
  `&response_type=code` +
  `&scope=chat:read+` +
  `analytics:read:extensions+` +
  `analytics:read:games+` +
  `bits:read+` +
  `channel:edit:commercial+` +
  `channel:manage:broadcast+` +
  `channel:manage:extensions+` +
  `channel:manage:polls+` +
  `channel:manage:predictions+` +
  `channel:manage:raids+` +
  `channel:manage:redemptions+` +
  `channel:manage:schedule+` +
  `channel:manage:videos+` +
  `channel:read:editors+` +
  `channel:read:goals+` +
  `channel:read:hype_train+` +
  `channel:read:polls+` +
  `channel:read:predictions+` +
  `channel:read:redemptions+` +
  `channel:read:stream_key+` +
  `channel:read:subscriptions+` +
  `clips:edit+` +
  `moderation:read+` +
  `moderator:manage:banned_users+` +
  `moderator:read:blocked_terms+` +
  `moderator:manage:blocked_terms+` +
  `moderator:manage:automod+` +
  `moderator:read:automod_settings+` +
  `moderator:manage:automod_settings+` +
  `moderator:read:chat_settings+` +
  `moderator:manage:chat_settings+` +
  `user:edit+` +
  `user:edit:follows+` +
  `user:manage:blocked_users+` +
  `user:read:blocked_users+` +
  `user:read:broadcast+` +
  `user:read:email+` +
  `user:read:follows+` +
  `user:read:subscriptions+` +
  `channel:moderate+` +
  `whispers:edit+` +
  `chat:edit`;

export async function TwitchSetup(app: express.Application): Promise<void> {
  server = app;

  server.get(
    "/twitch/callback",
    async function (req: express.Request, res: express.Response) {
      console.log("Twitch Callback received");
      if (isFirstAuth) {
        isFirstAuth = false;
        botTwitchAccessToken = await exchangeCode(
          process.env.TWITCH_CLIENT_ID!,
          process.env.TWITCH_CLIENT_SECRET!,
          req.query.code as string,
          process.env.TWITCH_REDIRECT_URI!
        );
        const streamerAuthWindow = open(authorizeURL, {
          app: { name: process.env.STREAMERBROWSER! },
        });
      } else {
        streamerTwitchAccessToken = await exchangeCode(
          process.env.TWITCH_CLIENT_ID!,
          process.env.TWITCH_CLIENT_SECRET!,
          req.query.code as string,
          process.env.TWITCH_REDIRECT_URI!
        );
        ContinueTwitchSetup();
      }
    }
  );

  open(authorizeURL, { app: { name: process.env.BOTBROWSER! } });

  return;
}

async function ContinueTwitchSetup() {
  console.log("Continuing Twitch Setup");

  botAuthProvider = new RefreshingAuthProvider({
    clientId: process.env.TWITCH_CLIENT_ID!,
    clientSecret: process.env.TWITCH_CLIENT_SECRET!,
  });

  // Add initial user with tokens from environment
  await botAuthProvider.addUserForToken(
    {
      accessToken: botTwitchAccessToken.accessToken,
      refreshToken: botTwitchAccessToken.refreshToken,
      expiresIn: 0, // Will force a refresh on first use
      obtainmentTimestamp: 0,
    },
    ["chat"] // This line fixes the error
  );

  // Set up a handler to save tokens when they refresh
  botAuthProvider.onRefresh(async (userId, newTokenData) => {
    try {
      // Update the tokens for this user
      botTwitchAccessToken = newTokenData;
      console.log(`Tokens refreshed for user ${userId}`);
    } catch (error) {
      console.error("Error saving refreshed tokens:", error);
    }
  });

  streamerAuthProvider = new RefreshingAuthProvider({
    clientId: process.env.TWITCH_CLIENT_ID!,
    clientSecret: process.env.TWITCH_CLIENT_SECRET!,
  });

  // Add initial user with tokens from environment
  await streamerAuthProvider.addUserForToken({
    accessToken: streamerTwitchAccessToken.accessToken,
    refreshToken: streamerTwitchAccessToken.refreshToken,
    expiresIn: 0, // Will force a refresh on first use
    obtainmentTimestamp: 0,
  });

  // Set up a handler to save tokens when they refresh
  streamerAuthProvider.onRefresh(async (userId, newTokenData) => {
    try {
      // Update the tokens for this user
      streamerTwitchAccessToken = newTokenData;
      console.log(`Tokens refreshed for user ${userId}`);
    } catch (error) {
      console.error("Error saving refreshed tokens:", error);
    }
  });

  chatClient = new ChatClient({
    authProvider: botAuthProvider,
    channels: ["Wingman953"],
  });

  chatClient.onConnect(() => {
    console.log("* Connected!");
  });

  apiClient = new ApiClient({
    authProvider: streamerAuthProvider,
  });

  let findWingman953 = await apiClient.users.getUserByName("Wingman953");

  if (findWingman953 != null) {
    Wingman953 = findWingman953;
  } else {
    console.log("ERROR: Failed to find streamer user.");
    return;
  }

  //Find Reward Info
  const rewardsWingman953 = await apiClient.channelPoints.getCustomRewards(
    Wingman953?.id!,
    false
  );

  for (let reward = 0; reward < rewardsWingman953.length; reward++) {
    if (rewardsWingman953[reward].title == "Start a Quiz Round") {
      twitchRewards.push({
        reward: rewardsWingman953[reward],
        lastRedemptionTime: Date.now(),
        handler: HandleQuizStartRedemption,
      });
    }
    if (rewardsWingman953[reward].title == "G'Day Streamer") {
      twitchRewards.push({
        reward: rewardsWingman953[reward],
        lastRedemptionTime: Date.now(),
        handler: HandleGDayRedemption,
      });
    }
    if (rewardsWingman953[reward].title == "G'Night Streamer") {
      twitchRewards.push({
        reward: rewardsWingman953[reward],
        lastRedemptionTime: Date.now(),
        handler: HandleGNightRedemption,
      });
    }
    if (rewardsWingman953[reward].title == "Add Custom Greeting") {
      twitchRewards.push({
        reward: rewardsWingman953[reward],
        lastRedemptionTime: Date.now(),
        handler: HandleAddCustomGreetingRedemption,
      });
    }
  }

  BadgeCache.initialize(apiClient);

  await chatClient.connect();

  twitchApiPollingInterval = setInterval(TwitchApiPolling, 5000); // 5secs

  chatClient.onMessage(
    async (
      channel: string,
      user: string,
      message: string,
      msg: ChatMessage
    ) => {
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
          emoteMap: parseEmotesFromMessage(message, msg),
        },
        twitchSpecific: {
          bits: msg.bits,
          firstMessage: msg.isFirst,
          returningChatter: msg.isReturningChatter,
          badges: await BadgeCache.getBadgeIcons(
            Wingman953.id,
            msg.userInfo.badges
          ),
          isHighlighted: msg.isHighlight || false,
        },
      };

      console.log(
        util.inspect(unifiedMessage, {
          showHidden: false,
          depth: null,
          colors: true,
        })
      );

      handleChatMessage(unifiedMessage);
    }
  );

  chatClient.onSub(
    (channel: string, user: string, subInfo: ChatSubInfo, msg: UserNotice) => {
      const monthsSubbed =
        subInfo.months > 1
          ? `${subInfo.months} months`
          : `${subInfo.months} month`;

      let subMessage: UnifiedChatMessage = structuredClone(Wingbot953Message);
      subMessage.message.text = `wingma14Blush Thank you @${msg.userInfo.displayName} for subscribing to the channel for ${monthsSubbed}! wingma14Blush Let's celebrate with a Quiz!`;
      subMessage.platform = "twitch";
      subMessage.twitchSpecific = {
        messageType: "sub",
      };

      sleep(1000).then(() => {
        sendChatMessage(subMessage);

        if (subInfo.message) {
          subMessage.message.text = `Sub message from ${user}: ${subInfo.message}`;
          subMessage.platform = "twitch";
          subMessage.author.displayName = msg.userInfo.displayName;

          sendChatMessage(subMessage);
        }
      });

      setTimeout(() => {
        StartQuiz();
      }, 5000);
    }
  );

  chatClient.onResub(
    (channel: string, user: string, subInfo: ChatSubInfo, msg: UserNotice) => {
      const monthsSubbed =
        subInfo.months > 1
          ? `${subInfo.months} months`
          : `${subInfo.months} month`;

      let subMessage: UnifiedChatMessage = structuredClone(Wingbot953Message);
      subMessage.message.text = `wingma14Blush Thank you @${user} for subscribing to the channel for ${monthsSubbed}! wingma14Blush Let's celebrate with a Quiz!`;
      subMessage.platform = "twitch";
      subMessage.twitchSpecific = {
        messageType: "resub",
      };

      sleep(1000).then(() => {
        sendChatMessage(subMessage);

        if (subInfo.message) {
          subMessage.message.text = `${subInfo.message}`;
          subMessage.platform = "twitch";
          subMessage.author.displayName = msg.userInfo.displayName;

          sendChatMessage(subMessage);
        }
      });

      setTimeout(() => {
        StartQuiz();
      }, 5000);
    }
  );

  chatClient.onSubGift(
    (
      channel: string,
      user: string,
      subInfo: ChatSubGiftInfo,
      msg: UserNotice
    ) => {
      let subGiftMessage: UnifiedChatMessage =
        structuredClone(Wingbot953Message);
      subGiftMessage.message.text = `wingma14Blush Thank you ${subInfo.gifter} for gifting a subscription to ${user}! wingma14Blush Let's celebrate with a Quiz!`;
      subGiftMessage.platform = "twitch";
      subGiftMessage.twitchSpecific = {
        messageType: "subgift",
      };

      sleep(1000).then(() => {
        sendChatMessage(subGiftMessage);
      });

      setTimeout(() => {
        StartQuiz();
      }, 5000);
    }
  );

  chatClient.onRaid(
    (
      channel: string,
      user: string,
      raidInfo: ChatRaidInfo,
      msg: UserNotice
    ) => {
      let viewCount =
        raidInfo.viewerCount > 1
          ? `${raidInfo.viewerCount} viewers`
          : `${raidInfo.viewerCount} viewer`;

      let raidMessage: UnifiedChatMessage = structuredClone(Wingbot953Message);
      raidMessage.message.text = `wingma14Blush Thank you ${raidInfo.displayName} for the raid with ${viewCount}! wingma14Blush Let's celebrate with a Quiz!`;
      raidMessage.platform = "twitch";
      raidMessage.twitchSpecific = {
        isHighlighted: true,
      };

      sleep(1000).then(() => {
        sendChatMessage(raidMessage);
      });

      setTimeout(() => {
        StartQuiz();
      }, 5000);
    }
  );
}

async function TwitchApiPolling() {
  try {
    const streamWingman953 = await apiClient.streams.getStreamByUserId(
      Wingman953?.id as string
    );

    // Gone Live!
    const currentTimestamp = Date.now();
    if (isLive && streamWingman953?.startDate == null) {
      isLive = false;
      console.log("Streamer went offline!");

      clearInterval(quizInterval);
      ResetSubscriberFirstMessageReceived();
      //clearInterval(didYouKnowInterval)
      clearInterval(periodicMessagesInterval);
      clearInterval(streamNameAndGameInterval);

      let endstreamMessage: UnifiedChatMessage =
        structuredClone(Wingbot953Message);
      endstreamMessage.platform = "twitch";
      endstreamMessage.message.text = `wingma14Blush Thanks for the stream!`;
      sendChatMessage(endstreamMessage);
    } else if (
      !isLive &&
      streamWingman953?.startDate != undefined /* &&
        streamWingman953?.startDate.getTime() > currentTimestamp*/
    ) {
      isLive = true;
      console.log("Streamer went live!");

      streamName = streamWingman953.title;
      streamGame = streamWingman953.gameName;

      TwitchLivestreamAlert(streamName, streamGame);
      LoadWelcomeMessages();
      ResetUsedQuestions();
      HaloRunsSetup();

      // Automatic messages on timers
      quizInterval = setInterval(StartQuiz, Between(2100000, 2700000)); // 35-45mins
      //didYouKnowInterval = setInterval(SendDidYouKnowFact, 2580000) // 43mins
      periodicMessagesInterval = setInterval(PeriodicTwitchMessages, 3300000); // 55mins
      streamNameAndGameInterval = setInterval(PollStreamNameAndGame, 60000); // 1min

      let startStreamMessage: UnifiedChatMessage =
        structuredClone(Wingbot953Message);
      startStreamMessage.platform = "twitch";
      startStreamMessage.message.text = `wingma14Arrive Good Luck Streamer! wingma14Blush`;
      sendChatMessage(startStreamMessage);
    }

    for (const reward of twitchRewards) {
      const redemptions =
        await apiClient.channelPoints.getRedemptionsForBroadcaster(
          Wingman953?.id as string,
          reward.reward.id,
          "UNFULFILLED",
          { newestFirst: true }
        );

      if (
        redemptions.data.length > 0 &&
        redemptions.data[0].redemptionDate.getTime() > latestRedemptionDate
      ) {
        latestRedemptionDate = redemptions.data[0].redemptionDate.getTime();
        reward.handler(redemptions.data[0]);
      }
    }
  } catch (error: any) {
    console.log(`* ERROR: Twitch API polling failed: ${error.message}`);
  }
}

export function sendTwitchMessage(message: string, minDelay = 0, maxDelay = 0) {
  let delay = minDelay;

  if (minDelay > 0 && maxDelay > 0) {
    delay = Between(minDelay, maxDelay);
  }

  setTimeout(() => {
    try {
      chatClient.say("Wingman953", message);
    } catch (error: any) {
      console.log(`* ERROR: Twitch Message FAILED to send: ${error.message}`);
    }
  }, delay);
}

async function PollStreamNameAndGame() {
  try {
    const streamWingman953 = await apiClient.streams.getStreamByUserId(
      Wingman953?.id as string
    );

    if (
      streamWingman953?.title !== streamName ||
      streamWingman953?.gameName !== streamGame
    ) {
      streamName = streamWingman953?.title!;
      streamGame = streamWingman953?.gameName!;
      TwitchLivestreamAlert(streamName, streamGame);
    }
  } catch {
    console.log("CATCH: Failed to reach Twitch API.");
  }
}

export async function SubscriberFirstMessageQuiz(msg: UnifiedChatMessage) {
  if (
    msg.platform === "twitch" &&
    msg.author.isSubscriber &&
    msg.author.id &&
    !subscriberFirstMessageReceived.includes(msg.author.id) &&
    msg.author.id !== Wingman953.id
  ) {
    subscriberFirstMessageReceived.push(msg.author.id);

    let subTier: string = "1000"; // Default to Tier 1
    try {
      subTier = (
        await apiClient.subscriptions.getSubscriptionsForUsers(Wingman953, [
          msg.author.id,
        ])
      )[0].tier;
    } catch (error) {
      console.error(
        `Error fetching subscription tier for user ${msg.author.displayName}:`,
        error
      );
    }

    let rollThreshold = 7; // Tier 1

    if (subTier === "2000") {
      // Tier 2
      rollThreshold = 35;
    } else if (subTier === "3000") {
      // Tier 3
      rollThreshold = 100;
    }

    const roll = Between(0, 99);

    if (roll < rollThreshold) {
      console.log(
        `Successful Subscriber Quiz Roll for ${msg.author.displayName} Tier=${subTier} Roll=${roll} Threshold=${rollThreshold}`
      );

      await sleep(1000);

      let subQuizTwitchMessage = structuredClone(Wingbot953Message);
      subQuizTwitchMessage.platform = "twitch";
      subQuizTwitchMessage.message.text = `wingma14Think TWITCH SUBSCRIBER QUIZ! LET'S GO! wingma14Think`;

      sendChatMessage(subQuizTwitchMessage);

      await sleep(2000);

      StartQuiz();
    }
  }
}

export function ResetSubscriberFirstMessageReceived() {
  while (subscriberFirstMessageReceived.length > 0) {
    subscriberFirstMessageReceived.pop();
  }
  console.log("Subscriber first message quiz list reset.");
}

function HandleQuizStartRedemption(reward: HelixCustomRewardRedemption) {
  const rewardTitle = reward.rewardTitle;

  if (rewardTitle === "Start a Quiz Round") {
    StartQuiz();
  }
}

async function HandleGDayRedemption(reward: HelixCustomRewardRedemption) {
  console.log(`${reward.userDisplayName} redeemed G'Day Streamer!`);

  let gDayMessage: UnifiedChatMessage = structuredClone(Wingbot953Message);
  gDayMessage.platform = "twitch";
  gDayMessage.author.displayName = reward.userDisplayName;
  gDayMessage.author.id = reward.userId;
  gDayMessage.twitchSpecific = {
    isHighlighted: true,
  };
  gDayMessage.message.text = `wingma14Arrive G'Day ${Wingman953.displayName}!`;

  sendChatMessage(gDayMessage);
}

async function HandleGNightRedemption(reward: HelixCustomRewardRedemption) {
  console.log(`${reward.userDisplayName} redeemed G'Night Streamer!`);

  let gNightMessage: UnifiedChatMessage = structuredClone(Wingbot953Message);
  gNightMessage.platform = "twitch";
  gNightMessage.author.displayName = reward.userDisplayName;
  gNightMessage.author.id = reward.userId;
  gNightMessage.twitchSpecific = {
    isHighlighted: true,
  };
  gNightMessage.message.text = `wingma14Good Good night, ${Wingman953.displayName}!`;

  sendChatMessage(gNightMessage);
}

async function HandleAddCustomGreetingRedemption(
  reward: HelixCustomRewardRedemption
) {
  let userDisplayName = (await reward.getUser()).displayName;
  console.log(`${userDisplayName} redeemed Add Custom Greeting!`);

  let customGreetingMessage: UnifiedChatMessage =
    structuredClone(Wingbot953Message);
  customGreetingMessage.platform = "system";
  customGreetingMessage.message.text = `Twitch user ${userDisplayName} added a Custom Greeting!`;

  sendChatMessage(customGreetingMessage);

  AddVipWelcome(
    userDisplayName,
    reward.userId,
    "twitch",
    (reward.userInput as string) || ""
  );

  console.log("Custom Greeting added!");

  let customGreetingResponseMessage: UnifiedChatMessage =
    structuredClone(Wingbot953Message);
  customGreetingResponseMessage.platform = "twitch";
  customGreetingResponseMessage.message.text = `@${userDisplayName}, your custom greeting has been added for future streams!`;

  sleep(1000).then(() => {
    sendChatMessage(customGreetingResponseMessage, false);
  });
}

// function HandlePlaylistRedemption(reward: HelixCustomRewardRedemption) {
//         AddTracksFromPlaylistToQueue("", 7)
// }

export async function HandleFollowAge(msg: UnifiedChatMessage) {
  try {
    const followInfo = await apiClient.channels.getChannelFollowers(
      Wingman953.id,
      msg.author.id
    );

    let followMessage: UnifiedChatMessage = structuredClone(Wingbot953Message);
    followMessage.platform = "twitch";

    // Check if the user is following the broadcaster
    if (!followInfo.data.length) {
      console.log(
        `${msg.author.displayName} is not following ${Wingman953.displayName}`
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

export async function HandleUptime(msg: UnifiedChatMessage) {
  try {
    const channel = await apiClient.channels.getChannelInfoById(
      msg.channel.id!
    );
    const stream = await apiClient.streams.getStreamByUserName(
      channel?.displayName!
    );

    if (stream) {
      const currentTimestamp = Date.now();
      const streamStartTimestamp = stream.startDate.getTime();

      let uptimeMessage = structuredClone(Wingbot953Message);
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

export async function TwitchEnableSlowMode(delay_seconds: number) {
  try {
    await apiClient.chat.updateSettings(Wingman953.id, {
      slowModeEnabled: true,
      slowModeDelay: delay_seconds,
    });
    console.log(`* Slow mode enabled for ${delay_seconds} seconds.`);
  } catch (error: any) {
    console.log(`* ERROR: Failed to enable slow mode: ${error.message}`);
  }
}

export async function TwitchDisableSlowMode() {
  try {
    await apiClient.chat.updateSettings(Wingman953.id, {
      slowModeEnabled: false,
      slowModeDelay: 0,
    });
    console.log("* Slow mode disabled.");
  } catch (error: any) {
    console.log(`* ERROR: Failed to disable slow mode: ${error.message}`);
  }
}

export async function TwitchRunAd(msg: UnifiedChatMessage) {
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
    await apiClient.channels.startChannelCommercial(Wingman953, duration);
    StartQuiz();
  } catch (error: any) {
    console.log(`* ERROR: Failed to start ad break: ${error.message}`);
  }
}

/**
 * Parse emotes from a chat message using Twurple's built-in emote parsing
 */
function parseEmotesFromMessage(
  message: string,
  msg: ChatMessage
): EmoteInfo[] {
  const emotes: EmoteInfo[] = [];

  // Process emotes from the emoteOffsets Map provided by Twurple
  for (const [emoteId, positions] of msg.emoteOffsets.entries()) {
    for (const position of positions) {
      const [start, end] = position.split("-").map(Number);
      const emoteName = message.substring(start, end + 1);

      emotes.push({
        id: emoteId,
        name: emoteName,
        startIndex: start,
        endIndex: end,
        url: `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/1.0`,
      });
    }
  }

  // Re-sort emotes by original position
  emotes.sort((a, b) => a.startIndex - b.startIndex);

  return emotes;
}

async function CreateReward() {
  await apiClient.channelPoints.createCustomReward(Wingman953?.id as string, {
    autoFulfill: false,
    backgroundColor: "#6aaafe",
    cost: 1000,
    isEnabled: true,
    title: "Add Custom Greeting",
    userInputRequired: false,
  });

  // let playlists: string[] = [
  //     "[P] Capital Cities", // To Do
  //     "[P] Empire of the Sun", // To Do
  //     "[P] Bad Suns", // To Do
  //     "[P] The Naked and Famous", // To Do
  //     "[P] Great Good Fine Ok",
  //     "[P] XY&O", // To Do
  //     "[P] STARSET",
  //     "[P] Cold War Kids",
  //     "[P] Penguin Prison",
  //     "[P] NCS (NoCopyrightSounds)", // To Do
  //     "[P] KOLIDESCOPES",
  //     "[P] Moxie",
  // ]
  // // "[P] Foster the People", "[P] Phoenix", "[P] The Killers", "[P] Two Door Cinema Club", "[P] Walk the Moon",

  // for (let i = 0; i < playlists.length; i++) {
  //     await apiClient.channelPoints.createCustomReward(
  //         Wingman953?.id as string,
  //         {
  //             autoFulfill: false,
  //             backgroundColor: "#392e5c",
  //             cost: 1800,
  //             globalCooldown: 60,
  //             isEnabled: true,
  //             title: "Start a Quiz Round",
  //             userInputRequired: false,
  //         }
  //     )
  //     console.log("Reward created!")
  // }
}
