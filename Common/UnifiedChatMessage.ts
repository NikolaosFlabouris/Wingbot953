// Type definitions for unified chat message format
export interface UnifiedChatMessage {
    // Common fields for both platforms
    id?: string
    platform: "youtube" | "twitch" | "all"
    timestamp?: Date
    channel: {
        id?: string
        name?: string
    }
    author: {
        id?: string
        name: string
        displayName: string
        isModerator?: boolean
        isSubscriber?: boolean
        isOwner?: boolean
        profileImageUrl?: string
    }
    message: {
        text: string
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
