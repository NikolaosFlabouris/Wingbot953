// Type definitions for unified chat message format

// Types for emote information
export interface EmoteInfo {
    id: string
    name: string
    startIndex: number
    endIndex: number
    url: string
}

export interface UnifiedChatMessage {
    // Common fields for both platforms
    id?: string
    platform: "youtube" | "twitch" | "system" | "all"
    timestamp?: Date
    channel: {
        id?: string
        name?: string
    }
    author: {
        id?: string
        colour?: string
        name: string
        displayName: string
        isModerator?: boolean
        isSubscriber?: boolean
        isOwner?: boolean
        profileImageUrl?: string
    }
    message: {
        text: string
        emoteMap?: EmoteInfo[]
        isHighlighted?: boolean
        isSuperChat?: boolean
        superChatDetails?: {
            amount: number
            currency: string
            color: string
        }
    }
    replyingTo?: UnifiedChatMessage
    // Platform-specific data can be stored here
    platformSpecific?: any
}
