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
    firstMessage?: boolean;
    returningChatter?: boolean;
    badges?: BadgeIcon[];
    isHighlighted?: boolean;
    messageType?: "sub" | "resub" | "subgift" | "follow" | "hypetrain" | "prediction" | "poll" | "shoutout";
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
