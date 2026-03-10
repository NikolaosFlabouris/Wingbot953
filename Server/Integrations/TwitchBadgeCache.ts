import { ApiClient } from "@twurple/api"
import { HelixChatBadgeSet, HelixChatBadgeVersion } from "@twurple/api"
import { BadgeIcon } from "../../Common/UnifiedChatMessage"

export class BadgeCache {
    private static instance: BadgeCache | null = null
    private apiClient: ApiClient
    private globalBadges: HelixChatBadgeSet[] | null = null
    private channelBadges: Map<string, HelixChatBadgeSet[]> = new Map()

    private constructor(apiClient: ApiClient) {
        this.apiClient = apiClient
    }

    /**
     * Initialize the singleton instance with an ApiClient
     */
    static initialize(apiClient: ApiClient): void {
        if (BadgeCache.instance) {
            throw new Error(
                "BadgeCache is already initialized. Use getInstance() or call destroy() first."
            )
        }
        BadgeCache.instance = new BadgeCache(apiClient)
    }

    /**
     * Get the singleton instance
     */
    private static getInstance(): BadgeCache {
        if (!BadgeCache.instance) {
            throw new Error(
                "BadgeCache must be initialized first. Call BadgeCache.initialize(apiClient)."
            )
        }
        return BadgeCache.instance
    }

    /**
     * Destroy the singleton instance
     */
    static destroy(): void {
        BadgeCache.instance = null
    }

    /**
     * Check if the singleton is initialized
     */
    static isInitialized(): boolean {
        return BadgeCache.instance !== null
    }

    /**
     * Get global badges, caching the result
     */
    static async getGlobalBadges(): Promise<HelixChatBadgeSet[]> {
        const instance = BadgeCache.getInstance()
        if (!instance.globalBadges) {
            instance.globalBadges =
                await instance.apiClient.chat.getGlobalBadges()
        }
        return instance.globalBadges
    }

    /**
     * Get channel-specific badges for a given channel ID, caching the result
     */
    static async getChannelBadges(
        channelId: string
    ): Promise<HelixChatBadgeSet[]> {
        const instance = BadgeCache.getInstance()
        if (!instance.channelBadges.has(channelId)) {
            const badges = await instance.apiClient.chat.getChannelBadges(
                channelId
            )
            instance.channelBadges.set(channelId, badges)
        }
        return instance.channelBadges.get(channelId)!
    }

    /**
     * Get a specific badge icon by channel, name, and version
     */
    static async getBadgeIcon(
        channelId: string,
        badgeName: string,
        badgeVersion: string
    ): Promise<BadgeIcon | null> {
        // Check channel badges first
        const channelBadges = await BadgeCache.getChannelBadges(channelId)
        const channelBadgeSet = channelBadges.find(
            (set) => set.id === badgeName
        )

        if (channelBadgeSet) {
            const versionData = channelBadgeSet.versions.find(
                (v) => v.id === badgeVersion
            )
            if (versionData) {
                return BadgeCache.createBadgeObject(
                    badgeName,
                    badgeVersion,
                    versionData
                )
            }
        }

        // Check global badges
        const globalBadges = await BadgeCache.getGlobalBadges()
        const globalBadgeSet = globalBadges.find((set) => set.id === badgeName)

        if (globalBadgeSet) {
            const versionData = globalBadgeSet.versions.find(
                (v) => v.id === badgeVersion
            )
            if (versionData) {
                return BadgeCache.createBadgeObject(
                    badgeName,
                    badgeVersion,
                    versionData
                )
            }
        }

        return null
    }

    /**
     * Get multiple badge icons from a badges Map (like from IRC chat message)
     */
    static async getBadgeIcons(
        channelId: string,
        badges: Map<string, string>
    ): Promise<BadgeIcon[]> {
        const badgeIcons: BadgeIcon[] = []

        for (const [badgeName, badgeVersion] of badges) {
            const badgeIcon = await BadgeCache.getBadgeIcon(
                channelId,
                badgeName,
                badgeVersion
            )
            if (badgeIcon) {
                badgeIcons.push(badgeIcon)
            }
        }

        return badgeIcons
    }

    /**
     * Get multiple badge icons from a Record (like from EventSub chat events)
     */
    static async getBadgeIconsFromRecord(
        channelId: string,
        badges: Record<string, string>
    ): Promise<BadgeIcon[]> {
        const badgeIcons: BadgeIcon[] = []

        for (const [badgeName, badgeVersion] of Object.entries(badges)) {
            const badgeIcon = await BadgeCache.getBadgeIcon(
                channelId,
                badgeName,
                badgeVersion
            )
            if (badgeIcon) {
                badgeIcons.push(badgeIcon)
            }
        }

        return badgeIcons
    }

    /**
     * Create a BadgeIcon object from Twurple badge version data
     */
    private static createBadgeObject(
        name: string,
        version: string,
        versionData: HelixChatBadgeVersion
    ): BadgeIcon {
        return {
            name,
            version,
            image_url_1x: versionData.getImageUrl(1),
            image_url_2x: versionData.getImageUrl(2),
            image_url_4x: versionData.getImageUrl(4),
            title: versionData.title,
            description: versionData.description,
            clickAction: versionData.clickAction,
            clickUrl: versionData.clickUrl,
        }
    }

    /**
     * Clear the cache (useful for testing or manual refresh)
     */
    static clearCache(): void {
        const instance = BadgeCache.getInstance()
        instance.globalBadges = null
        instance.channelBadges.clear()
    }

    /**
     * Clear cache for a specific channel
     */
    static clearChannelCache(channelId: string): void {
        const instance = BadgeCache.getInstance()
        instance.channelBadges.delete(channelId)
    }

    /**
     * Check if a badge exists in the cache (without making API calls)
     */
    static async hasBadge(
        channelId: string,
        badgeName: string,
        badgeVersion: string
    ): Promise<boolean> {
        const badgeIcon = await BadgeCache.getBadgeIcon(
            channelId,
            badgeName,
            badgeVersion
        )
        return badgeIcon !== null
    }

    /**
     * Get all available badge names for a channel
     */
    static async getAvailableBadgeNames(channelId: string): Promise<string[]> {
        const channelBadges = await BadgeCache.getChannelBadges(channelId)
        const globalBadges = await BadgeCache.getGlobalBadges()

        const badgeNames = new Set<string>()

        channelBadges.forEach((badgeSet) => badgeNames.add(badgeSet.id))
        globalBadges.forEach((badgeSet) => badgeNames.add(badgeSet.id))

        return Array.from(badgeNames)
    }

    /**
     * Get all available versions for a specific badge
     */
    static async getBadgeVersions(
        channelId: string,
        badgeName: string
    ): Promise<string[]> {
        // Check channel badges first
        const channelBadges = await BadgeCache.getChannelBadges(channelId)
        const channelBadgeSet = channelBadges.find(
            (set) => set.id === badgeName
        )

        if (channelBadgeSet) {
            return channelBadgeSet.versions.map((v) => v.id)
        }

        // Check global badges
        const globalBadges = await BadgeCache.getGlobalBadges()
        const globalBadgeSet = globalBadges.find((set) => set.id === badgeName)

        if (globalBadgeSet) {
            return globalBadgeSet.versions.map((v) => v.id)
        }

        return []
    }

    /**
     * Update the ApiClient (useful for token refresh scenarios)
     */
    static updateApiClient(apiClient: ApiClient): void {
        const instance = BadgeCache.getInstance()
        instance.apiClient = apiClient
        // Clear cache when API client changes
        BadgeCache.clearCache()
    }
}
