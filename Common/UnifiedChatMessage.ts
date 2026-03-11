// Type definitions for unified chat message format

// Types for emote information
export interface EmoteInfo {
  id: string;
  name: string;
  startIndex: number;
  endIndex: number;
  url: string;
}

export interface BadgeIcon {
  name: string;
  version: string;
  image_url_1x: string;
  image_url_2x: string;
  image_url_4x: string;
  title: string;
  description: string;
  clickAction: string | null;
  clickUrl: string | null;
}

export type TwitchMessageType =
  | { category: "chat"; type: "action" }
  | { category: "subscription"; type: "sub" | "resub" | "subgift" | "communitysub" | "giftpaidupgrade" | "primepaidupgrade" | "payforward" }
  | { category: "moderation"; type: "ban" | "timeout" | "messageremove" }
  | { category: "activity"; type: "prediction" | "poll" | "hypetrain" | "redemption" }
  | { category: "notification"; type: "follow" | "raid" | "raidcancel" | "shoutout" | "announcement" };

export interface UnifiedChatMessage {
  // Common fields for both platforms
  id?: string;
  platform: "youtube" | "twitch" | "system" | "all";
  timestamp?: Date;
  channel: {
    id?: string;
    name: string;
  };
  author: {
    id?: string;
    colour?: string;
    name: string;
    displayName: string;
    isModerator?: boolean;
    isSubscriber?: boolean;
    isOwner?: boolean;
    profileImageUrl?: string;
  };
  message: {
    text: string;
    emoteMap?: EmoteInfo[];
  };
  replyingTo?: UnifiedChatMessage;
  // Platform-specific data can be stored here
  twitchSpecific?: {
    bits?: number;
    badges?: BadgeIcon[];
    isHighlighted?: boolean;
    messageType?: TwitchMessageType;
    announcementColor?: string;
    timeoutDuration?: number;
    giftCount?: number;
    originalGifter?: string;
  };
  youtubeSpecific?: {
    isSuperChat?: boolean;
    superChatDetails?: {
      amount: number;
      currency: string;
      color: string;
    };
  };
}
