/**
 * Returns the quiz roll threshold for a given subscription tier.
 * Higher tiers have better chances of triggering a quiz on first message.
 *
 * Tier 1 (1000): 14% chance
 * Tier 2 (2000): 50% chance
 * Tier 3 (3000): 100% chance (always triggers)
 */
export function getSubQuizRollThreshold(subTier: string): number {
  switch (subTier) {
    case "2000":
      return 50;
    case "3000":
      return 100;
    default:
      return 14; // Tier 1 or unknown
  }
}

/**
 * Formats a subscriber month count with correct pluralization.
 */
export function formatSubMonths(months: number): string {
  return months > 1 ? `${months} months` : `${months} month`;
}

/**
 * Formats a viewer count with correct pluralization.
 */
export function formatViewerCount(count: number): string {
  return count > 1 ? `${count} viewers` : `${count} viewer`;
}

/**
 * Builds the subscription notification message text.
 */
export function buildSubMessage(
  displayName: string,
  months: number
): string {
  return `wingma14Blush Thank you @${displayName} for subscribing to the channel for ${formatSubMonths(months)}! wingma14Blush Let's celebrate with a Quiz!`;
}

/**
 * Builds the resubscription notification message text.
 */
export function buildResubMessage(
  user: string,
  months: number
): string {
  return `wingma14Blush Thank you @${user} for subscribing to the channel for ${formatSubMonths(months)}! wingma14Blush Let's celebrate with a Quiz!`;
}

/**
 * Builds the gift subscription notification message text.
 */
export function buildSubGiftMessage(
  gifter: string,
  recipient: string
): string {
  return `wingma14Blush Thank you ${gifter} for gifting a subscription to ${recipient}! wingma14Blush Let's celebrate with a Quiz!`;
}

/**
 * Builds the raid notification message text.
 */
export function buildRaidMessage(
  displayName: string,
  viewerCount: number
): string {
  return `wingma14Blush Thank you ${displayName} for the raid with ${formatViewerCount(viewerCount)}! wingma14Blush Let's celebrate with a Quiz!`;
}

/**
 * Builds the follow notification message text.
 */
export function buildFollowMessage(displayName: string): string {
  return `wingma14Arrive Welcome ${displayName}! Thanks for the follow!`;
}

/**
 * Builds the hype train begin message text.
 */
export function buildHypeTrainBeginMessage(level: number): string {
  return `A Hype Train has started! Level ${level} - Let's go!`;
}

/**
 * Builds the hype train end message text.
 */
export function buildHypeTrainEndMessage(level: number): string {
  return `The Hype Train reached level ${level}! Great job everyone!`;
}

/**
 * Builds the poll begin message text.
 */
export function buildPollBeginMessage(title: string, choices: string[]): string {
  return `Poll started: ${title} - Options: ${choices.join(", ")}`;
}

/**
 * Builds the poll end message text.
 */
export function buildPollEndMessage(title: string, winner: string, votes: number): string {
  return `Poll "${title}" ended! Winner: ${winner} with ${votes} votes!`;
}

/**
 * Builds the prediction begin message text.
 */
export function buildPredictionBeginMessage(title: string, outcomes: string[]): string {
  return `Prediction started: ${title} - ${outcomes.join(" vs ")}`;
}

/**
 * Builds the prediction end message text.
 */
export function buildPredictionEndMessage(title: string, winner: string): string {
  return `Prediction "${title}" ended! Winner: ${winner}`;
}

/**
 * Builds the shoutout receive message text.
 */
export function buildShoutoutReceiveMessage(broadcasterDisplayName: string): string {
  return `We got a shoutout from ${broadcasterDisplayName}! Thanks for the love!`;
}

/**
 * Builds the community gift subscription (sub bomb) notification message text.
 */
export function buildCommunitySubMessage(
  gifter: string,
  count: number
): string {
  const subWord = count === 1 ? "subscription" : "subscriptions";
  return `wingma14Blush Thank you ${gifter} for gifting ${count} ${subWord} to the community! wingma14Blush Let's celebrate with a Quiz!`;
}

/**
 * Builds the gift-paid-upgrade notification message text.
 */
export function buildGiftPaidUpgradeMessage(
  displayName: string,
  originalGifter: string
): string {
  return `wingma14Blush ${displayName} is continuing their gifted sub from ${originalGifter} with a paid subscription! wingma14Blush`;
}

/**
 * Builds the prime-paid-upgrade notification message text.
 */
export function buildPrimePaidUpgradeMessage(
  displayName: string
): string {
  return `wingma14Blush ${displayName} has upgraded from Prime to a paid subscription! wingma14Blush`;
}

/**
 * Builds the standard pay-forward notification message text.
 */
export function buildStandardPayForwardMessage(
  displayName: string,
  recipientDisplayName: string,
  originalGifterDisplayName?: string
): string {
  const gifterPart = originalGifterDisplayName
    ? ` from ${originalGifterDisplayName}`
    : "";
  return `wingma14Blush ${displayName} is paying forward their gift sub${gifterPart} to ${recipientDisplayName}! wingma14Blush`;
}

/**
 * Builds the community pay-forward notification message text.
 */
export function buildCommunityPayForwardMessage(
  displayName: string,
  originalGifterDisplayName?: string
): string {
  const gifterPart = originalGifterDisplayName
    ? ` from ${originalGifterDisplayName}`
    : "";
  return `wingma14Blush ${displayName} is paying forward their gift sub${gifterPart} to the community! wingma14Blush`;
}

/**
 * Parses emote position strings ("start-end") into numeric start/end pairs.
 */
export function parseEmotePosition(
  positionString: string
): { start: number; end: number } {
  const [start, end] = positionString.split("-").map(Number);
  return { start, end };
}

/**
 * Extracts an emote name from a message given start and end indices.
 */
export function extractEmoteName(
  message: string,
  start: number,
  end: number
): string {
  return message.substring(start, end + 1);
}

/**
 * Builds a Twitch emote CDN URL for a given emote ID.
 */
export function buildEmoteUrl(emoteId: string): string {
  return `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/1.0`;
}

/**
 * Represents a single part of an EventSub chat message.
 * Messages arrive pre-parsed into text, emote, cheermote, and mention segments.
 */
export interface EventSubMessagePart {
  type: "text" | "emote" | "cheermote" | "mention";
  text: string;
  emote?: { id: string; emote_set_id: string; owner_id: string; format: string[] };
  cheermote?: { prefix: string; bits: number; tier: number };
  mention?: { user_id: string; user_name: string; user_login: string };
}

/**
 * Parses EventSub structured message parts into the EmoteInfo[] format
 * used by UnifiedChatMessage.
 */
export function parseEventSubEmotes(
  messageParts: EventSubMessagePart[]
): import("../../Common/UnifiedChatMessage").EmoteInfo[] {
  const emotes: import("../../Common/UnifiedChatMessage").EmoteInfo[] = [];
  let offset = 0;

  for (const part of messageParts) {
    if (part.type === "emote" && part.emote) {
      emotes.push({
        id: part.emote.id,
        name: part.text,
        startIndex: offset,
        endIndex: offset + part.text.length - 1,
        url: buildEmoteUrl(part.emote.id),
      });
    }
    offset += part.text.length;
  }

  return emotes;
}

/**
 * Extracts author role flags from an EventSub badges record.
 * EventSub provides badges as Record<string, string> (e.g. { "moderator": "1", "subscriber": "3012" }).
 */
export function parseEventSubBadgeRoles(badges: Record<string, string>): {
  isModerator: boolean;
  isSubscriber: boolean;
  isOwner: boolean;
} {
  return {
    isModerator: "moderator" in badges,
    isSubscriber: "subscriber" in badges || "founder" in badges,
    isOwner: "broadcaster" in badges,
  };
}

// ---------------------------------------------------------------------------
// EventSub Chat Notification Event Interfaces
// ---------------------------------------------------------------------------
// These describe the subset of properties we use from
// onChannelChatNotification events. The Twurple union type is complex,
// so we define minimal interfaces for the shapes we actually consume.

interface EventSubNotificationBase {
  type: string;
  chatterDisplayName: string;
  chatterName: string;
  chatterId: string;
  messageText?: string;
  messageId?: string;
  badges: Record<string, string>;
  color?: string;
}

export interface EventSubSubNotification extends EventSubNotificationBase {
  durationMonths: number;
}

export interface EventSubResubNotification extends EventSubNotificationBase {
  cumulativeMonths: number;
}

export interface EventSubSubGiftNotification extends EventSubNotificationBase {
  chatterIsAnonymous: boolean;
  recipientDisplayName: string;
}

export interface EventSubCommunitySubGiftNotification extends EventSubNotificationBase {
  chatterIsAnonymous: boolean;
  total: number;
}

export interface EventSubRaidNotification extends EventSubNotificationBase {
  raiderDisplayName: string;
  viewerCount: number;
}

export interface EventSubAnnouncementNotification extends EventSubNotificationBase {
  announcementColor: string;
}

export interface EventSubGiftPaidUpgradeNotification extends EventSubNotificationBase {
  gifterDisplayName: string;
}

export interface EventSubPayItForwardNotification extends EventSubNotificationBase {
  gifterDisplayName?: string;
  recipientDisplayName?: string;
}

// ---------------------------------------------------------------------------
// EventSub Moderation Event Interfaces
// ---------------------------------------------------------------------------

interface EventSubModerationBase {
  moderationAction: string;
  broadcasterId: string;
  broadcasterName: string;
}

export interface EventSubBanModeration extends EventSubModerationBase {
  userId: string;
  userName: string;
  userDisplayName: string;
}

export interface EventSubTimeoutModeration extends EventSubModerationBase {
  userId: string;
  userName: string;
  userDisplayName: string;
  expiryDate: Date;
}

export interface EventSubDeleteModeration extends EventSubModerationBase {
  userId: string;
  userName: string;
  userDisplayName: string;
  messageId: string;
  messageText: string;
}
