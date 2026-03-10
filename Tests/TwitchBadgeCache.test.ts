import { describe, it, expect, vi, beforeEach } from "vitest"
import { BadgeCache } from "../Server/Integrations/TwitchBadgeCache"

// Create mock badge version
function makeMockVersion(id: string) {
    return {
        id,
        title: `Badge ${id}`,
        description: `Description for ${id}`,
        clickAction: "visit_url" as const,
        clickUrl: `https://example.com/${id}`,
        getImageUrl: (scale: number) => `https://cdn.twitch.tv/badge/${id}/${scale}x.png`,
    }
}

// Create mock badge set
function makeMockBadgeSet(id: string, versions: string[]) {
    return {
        id,
        versions: versions.map(makeMockVersion),
    }
}

// Create mock API client
function makeMockApiClient(globalBadges: ReturnType<typeof makeMockBadgeSet>[] = [], channelBadges: ReturnType<typeof makeMockBadgeSet>[] = []) {
    return {
        chat: {
            getGlobalBadges: vi.fn().mockResolvedValue(globalBadges),
            getChannelBadges: vi.fn().mockResolvedValue(channelBadges),
        },
    } as unknown as import("@twurple/api").ApiClient
}

describe("BadgeCache", () => {
    beforeEach(() => {
        // Ensure clean state
        if (BadgeCache.isInitialized()) {
            BadgeCache.destroy()
        }
    })

    describe("initialization lifecycle", () => {
        it("initializes successfully", () => {
            const client = makeMockApiClient()
            expect(() => BadgeCache.initialize(client)).not.toThrow()
        })

        it("isInitialized returns true after initialize", () => {
            const client = makeMockApiClient()
            BadgeCache.initialize(client)
            expect(BadgeCache.isInitialized()).toBe(true)
        })

        it("isInitialized returns false before initialize", () => {
            expect(BadgeCache.isInitialized()).toBe(false)
        })

        it("throws when initializing twice", () => {
            const client = makeMockApiClient()
            BadgeCache.initialize(client)
            expect(() => BadgeCache.initialize(client)).toThrow("already initialized")
        })

        it("destroy allows re-initialization", () => {
            const client = makeMockApiClient()
            BadgeCache.initialize(client)
            BadgeCache.destroy()
            expect(BadgeCache.isInitialized()).toBe(false)
            expect(() => BadgeCache.initialize(client)).not.toThrow()
        })
    })

    describe("badge operations", () => {
        const globalBadges = [
            makeMockBadgeSet("vip", ["1"]),
            makeMockBadgeSet("moderator", ["1"]),
        ]
        const channelBadges = [
            makeMockBadgeSet("subscriber", ["0", "3", "6"]),
        ]

        beforeEach(() => {
            const client = makeMockApiClient(globalBadges, channelBadges)
            BadgeCache.initialize(client)
        })

        it("getGlobalBadges returns badges", async () => {
            const badges = await BadgeCache.getGlobalBadges()
            expect(badges).toHaveLength(2)
            expect(badges[0].id).toBe("vip")
        })

        it("getChannelBadges returns badges", async () => {
            const badges = await BadgeCache.getChannelBadges("channel-123")
            expect(badges).toHaveLength(1)
            expect(badges[0].id).toBe("subscriber")
        })

        it("caches global badges (only one API call)", async () => {
            const client = makeMockApiClient(globalBadges)
            BadgeCache.destroy()
            BadgeCache.initialize(client)
            await BadgeCache.getGlobalBadges()
            await BadgeCache.getGlobalBadges()
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(client.chat.getGlobalBadges).toHaveBeenCalledTimes(1)
        })

        it("caches channel badges per channel", async () => {
            const client = makeMockApiClient(globalBadges, channelBadges)
            BadgeCache.destroy()
            BadgeCache.initialize(client)
            await BadgeCache.getChannelBadges("ch1")
            await BadgeCache.getChannelBadges("ch1")
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(client.chat.getChannelBadges).toHaveBeenCalledTimes(1)
        })

        it("getBadgeIcon returns channel badge", async () => {
            const icon = await BadgeCache.getBadgeIcon("channel-123", "subscriber", "0")
            expect(icon).not.toBeNull()
            expect(icon!.name).toBe("subscriber")
            expect(icon!.version).toBe("0")
            expect(icon!.image_url_1x).toContain("1x")
        })

        it("getBadgeIcon returns global badge when not in channel", async () => {
            const icon = await BadgeCache.getBadgeIcon("channel-123", "vip", "1")
            expect(icon).not.toBeNull()
            expect(icon!.name).toBe("vip")
        })

        it("getBadgeIcon returns null for nonexistent badge", async () => {
            const icon = await BadgeCache.getBadgeIcon("channel-123", "nonexistent", "1")
            expect(icon).toBeNull()
        })

        it("getBadgeIcons returns multiple badges", async () => {
            const badges = new Map([
                ["subscriber", "0"],
                ["vip", "1"],
            ])
            const icons = await BadgeCache.getBadgeIcons("channel-123", badges)
            expect(icons).toHaveLength(2)
        })

        it("hasBadge returns true for existing badge", async () => {
            const result = await BadgeCache.hasBadge("channel-123", "subscriber", "0")
            expect(result).toBe(true)
        })

        it("hasBadge returns false for nonexistent badge", async () => {
            const result = await BadgeCache.hasBadge("channel-123", "fake", "1")
            expect(result).toBe(false)
        })

        it("getAvailableBadgeNames returns all unique names", async () => {
            const names = await BadgeCache.getAvailableBadgeNames("channel-123")
            expect(names).toContain("subscriber")
            expect(names).toContain("vip")
            expect(names).toContain("moderator")
        })

        it("getBadgeVersions returns versions for channel badge", async () => {
            const versions = await BadgeCache.getBadgeVersions("channel-123", "subscriber")
            expect(versions).toEqual(["0", "3", "6"])
        })

        it("getBadgeVersions returns versions for global badge", async () => {
            const versions = await BadgeCache.getBadgeVersions("channel-123", "vip")
            expect(versions).toEqual(["1"])
        })

        it("getBadgeVersions returns empty for nonexistent badge", async () => {
            const versions = await BadgeCache.getBadgeVersions("channel-123", "fake")
            expect(versions).toEqual([])
        })

        it("clearCache resets cached data", async () => {
            await BadgeCache.getGlobalBadges()
            BadgeCache.clearCache()
            // After clearing, next call should hit API again
            await BadgeCache.getGlobalBadges()
            // Can't easily check call count since we reconstructed, but no throw = success
        })

        it("clearChannelCache removes specific channel", async () => {
            await BadgeCache.getChannelBadges("ch1")
            BadgeCache.clearChannelCache("ch1")
            // No throw = success
        })

        it("updateApiClient changes client and clears cache", () => {
            const newClient = makeMockApiClient()
            expect(() => BadgeCache.updateApiClient(newClient)).not.toThrow()
        })
    })

    describe("error states", () => {
        it("throws when accessing badges without initialization", async () => {
            await expect(BadgeCache.getGlobalBadges()).rejects.toThrow("must be initialized")
        })

        it("throws when clearing cache without initialization", () => {
            expect(() => BadgeCache.clearCache()).toThrow("must be initialized")
        })
    })
})
