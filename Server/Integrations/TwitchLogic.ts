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
