import { describe, it, expect } from "vitest"

import {
    getSubQuizRollThreshold,
    formatSubMonths,
    formatViewerCount,
    buildSubMessage,
    buildResubMessage,
    buildSubGiftMessage,
    buildRaidMessage,
    buildFollowMessage,
    buildHypeTrainBeginMessage,
    buildHypeTrainEndMessage,
    buildPollBeginMessage,
    buildPollEndMessage,
    buildPredictionBeginMessage,
    buildPredictionEndMessage,
    buildShoutoutReceiveMessage,
    buildCommunitySubMessage,
    buildGiftPaidUpgradeMessage,
    buildPrimePaidUpgradeMessage,
    buildStandardPayForwardMessage,
    buildCommunityPayForwardMessage,
    parseEmotePosition,
    extractEmoteName,
    buildEmoteUrl,
    parseEventSubEmotes,
    parseEventSubBadgeRoles,
    type EventSubMessagePart,
} from "../Server/Integrations/TwitchLogic"

describe("getSubQuizRollThreshold", () => {
    it("returns 14 for Tier 1 (1000)", () => {
        expect(getSubQuizRollThreshold("1000")).toBe(14)
    })

    it("returns 50 for Tier 2 (2000)", () => {
        expect(getSubQuizRollThreshold("2000")).toBe(50)
    })

    it("returns 100 for Tier 3 (3000)", () => {
        expect(getSubQuizRollThreshold("3000")).toBe(100)
    })

    it("returns 14 for unknown tier", () => {
        expect(getSubQuizRollThreshold("unknown")).toBe(14)
    })

    it("returns 14 for empty string", () => {
        expect(getSubQuizRollThreshold("")).toBe(14)
    })
})

describe("formatSubMonths", () => {
    it("uses singular for 1 month", () => {
        expect(formatSubMonths(1)).toBe("1 month")
    })

    it("uses plural for 2 months", () => {
        expect(formatSubMonths(2)).toBe("2 months")
    })

    it("uses plural for 12 months", () => {
        expect(formatSubMonths(12)).toBe("12 months")
    })

    it("uses singular for 0 months", () => {
        expect(formatSubMonths(0)).toBe("0 month")
    })
})

describe("formatViewerCount", () => {
    it("uses singular for 1 viewer", () => {
        expect(formatViewerCount(1)).toBe("1 viewer")
    })

    it("uses plural for 2 viewers", () => {
        expect(formatViewerCount(2)).toBe("2 viewers")
    })

    it("uses plural for 100 viewers", () => {
        expect(formatViewerCount(100)).toBe("100 viewers")
    })

    it("uses singular for 0 viewers", () => {
        expect(formatViewerCount(0)).toBe("0 viewer")
    })
})

describe("buildSubMessage", () => {
    it("includes display name and month count", () => {
        const msg = buildSubMessage("TestUser", 3)
        expect(msg).toContain("@TestUser")
        expect(msg).toContain("3 months")
        expect(msg).toContain("Quiz")
    })

    it("uses singular for 1 month", () => {
        const msg = buildSubMessage("TestUser", 1)
        expect(msg).toContain("1 month")
        expect(msg).not.toContain("1 months")
    })
})

describe("buildResubMessage", () => {
    it("includes user and month count", () => {
        const msg = buildResubMessage("TestUser", 6)
        expect(msg).toContain("@TestUser")
        expect(msg).toContain("6 months")
    })
})

describe("buildSubGiftMessage", () => {
    it("includes gifter and recipient", () => {
        const msg = buildSubGiftMessage("Gifter", "Recipient")
        expect(msg).toContain("Gifter")
        expect(msg).toContain("Recipient")
        expect(msg).toContain("gifting")
    })
})

describe("buildRaidMessage", () => {
    it("includes display name and viewer count", () => {
        const msg = buildRaidMessage("Raider", 50)
        expect(msg).toContain("Raider")
        expect(msg).toContain("50 viewers")
    })

    it("uses singular for 1 viewer", () => {
        const msg = buildRaidMessage("Raider", 1)
        expect(msg).toContain("1 viewer")
        expect(msg).not.toContain("1 viewers")
    })
})

describe("parseEmotePosition", () => {
    it("parses start-end format", () => {
        const result = parseEmotePosition("0-4")
        expect(result.start).toBe(0)
        expect(result.end).toBe(4)
    })

    it("handles larger indices", () => {
        const result = parseEmotePosition("15-25")
        expect(result.start).toBe(15)
        expect(result.end).toBe(25)
    })

    it("handles same start and end", () => {
        const result = parseEmotePosition("5-5")
        expect(result.start).toBe(5)
        expect(result.end).toBe(5)
    })
})

describe("extractEmoteName", () => {
    it("extracts substring from message", () => {
        expect(extractEmoteName("Hello Kappa World", 6, 10)).toBe("Kappa")
    })

    it("handles start of message", () => {
        expect(extractEmoteName("PogChamp nice play", 0, 7)).toBe("PogChamp")
    })

    it("handles end of message", () => {
        expect(extractEmoteName("nice LUL", 5, 7)).toBe("LUL")
    })
})

describe("buildEmoteUrl", () => {
    it("builds correct CDN URL", () => {
        const url = buildEmoteUrl("25")
        expect(url).toBe("https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/1.0")
    })

    it("handles alphanumeric emote IDs", () => {
        const url = buildEmoteUrl("emotesv2_abc123")
        expect(url).toContain("emotesv2_abc123")
    })
})

describe("buildFollowMessage", () => {
    it("includes the display name", () => {
        const msg = buildFollowMessage("NewFollower")
        expect(msg).toContain("NewFollower")
        expect(msg).toContain("follow")
    })
})

describe("buildHypeTrainBeginMessage", () => {
    it("includes the level", () => {
        const msg = buildHypeTrainBeginMessage(2)
        expect(msg).toContain("Level 2")
        expect(msg).toContain("Hype Train")
    })
})

describe("buildHypeTrainEndMessage", () => {
    it("includes the level", () => {
        const msg = buildHypeTrainEndMessage(5)
        expect(msg).toContain("level 5")
        expect(msg).toContain("Hype Train")
    })
})

describe("buildPollBeginMessage", () => {
    it("includes title and choices", () => {
        const msg = buildPollBeginMessage("Best game?", ["Halo 3", "ODST", "Reach"])
        expect(msg).toContain("Best game?")
        expect(msg).toContain("Halo 3")
        expect(msg).toContain("ODST")
        expect(msg).toContain("Reach")
    })
})

describe("buildPollEndMessage", () => {
    it("includes title, winner, and votes", () => {
        const msg = buildPollEndMessage("Best game?", "ODST", 42)
        expect(msg).toContain("Best game?")
        expect(msg).toContain("ODST")
        expect(msg).toContain("42")
    })
})

describe("buildPredictionBeginMessage", () => {
    it("includes title and outcomes", () => {
        const msg = buildPredictionBeginMessage("Will streamer PB?", ["Yes", "No"])
        expect(msg).toContain("Will streamer PB?")
        expect(msg).toContain("Yes")
        expect(msg).toContain("No")
    })
})

describe("buildPredictionEndMessage", () => {
    it("includes title and winner", () => {
        const msg = buildPredictionEndMessage("Will streamer PB?", "Yes")
        expect(msg).toContain("Will streamer PB?")
        expect(msg).toContain("Yes")
    })
})

describe("buildShoutoutReceiveMessage", () => {
    it("includes the broadcaster name", () => {
        const msg = buildShoutoutReceiveMessage("CoolStreamer")
        expect(msg).toContain("CoolStreamer")
        expect(msg).toContain("shoutout")
    })
})

describe("buildCommunitySubMessage", () => {
    it("includes gifter and count", () => {
        const msg = buildCommunitySubMessage("GenerousUser", 5)
        expect(msg).toContain("GenerousUser")
        expect(msg).toContain("5 subscriptions")
        expect(msg).toContain("Quiz")
    })

    it("uses singular for 1 subscription", () => {
        const msg = buildCommunitySubMessage("GenerousUser", 1)
        expect(msg).toContain("1 subscription")
        expect(msg).not.toContain("1 subscriptions")
    })

    it("uses plural for multiple subscriptions", () => {
        const msg = buildCommunitySubMessage("GenerousUser", 20)
        expect(msg).toContain("20 subscriptions")
    })
})

describe("buildGiftPaidUpgradeMessage", () => {
    it("includes the upgrader and original gifter", () => {
        const msg = buildGiftPaidUpgradeMessage("UpgradeUser", "OriginalGifter")
        expect(msg).toContain("UpgradeUser")
        expect(msg).toContain("OriginalGifter")
        expect(msg).toContain("paid subscription")
    })
})

describe("buildPrimePaidUpgradeMessage", () => {
    it("includes the upgrader", () => {
        const msg = buildPrimePaidUpgradeMessage("PrimeUser")
        expect(msg).toContain("PrimeUser")
        expect(msg).toContain("Prime")
        expect(msg).toContain("paid subscription")
    })
})

describe("buildStandardPayForwardMessage", () => {
    it("includes forwarder, recipient, and original gifter", () => {
        const msg = buildStandardPayForwardMessage("Forwarder", "Recipient", "OriginalGifter")
        expect(msg).toContain("Forwarder")
        expect(msg).toContain("Recipient")
        expect(msg).toContain("OriginalGifter")
    })

    it("handles missing original gifter", () => {
        const msg = buildStandardPayForwardMessage("Forwarder", "Recipient", undefined)
        expect(msg).toContain("Forwarder")
        expect(msg).toContain("Recipient")
        expect(msg).not.toContain("undefined")
    })
})

describe("buildCommunityPayForwardMessage", () => {
    it("includes forwarder and original gifter", () => {
        const msg = buildCommunityPayForwardMessage("Forwarder", "OriginalGifter")
        expect(msg).toContain("Forwarder")
        expect(msg).toContain("OriginalGifter")
        expect(msg).toContain("community")
    })

    it("handles missing original gifter", () => {
        const msg = buildCommunityPayForwardMessage("Forwarder", undefined)
        expect(msg).toContain("Forwarder")
        expect(msg).toContain("community")
        expect(msg).not.toContain("undefined")
    })
})

describe("parseEventSubEmotes", () => {
    const makeEmotePart = (text: string, id: string): EventSubMessagePart => ({
        type: "emote",
        text,
        emote: { id, emote_set_id: "0", owner_id: "0", format: ["static"] },
    })

    const makeTextPart = (text: string): EventSubMessagePart => ({
        type: "text",
        text,
    })

    it("returns empty array for text-only message", () => {
        const parts: EventSubMessagePart[] = [makeTextPart("Hello world")]
        expect(parseEventSubEmotes(parts)).toEqual([])
    })

    it("parses a single emote", () => {
        const parts: EventSubMessagePart[] = [makeEmotePart("Kappa", "25")]
        const result = parseEventSubEmotes(parts)
        expect(result).toHaveLength(1)
        expect(result[0].id).toBe("25")
        expect(result[0].name).toBe("Kappa")
        expect(result[0].startIndex).toBe(0)
        expect(result[0].endIndex).toBe(4)
        expect(result[0].url).toContain("25")
    })

    it("computes correct offsets with text before emote", () => {
        const parts: EventSubMessagePart[] = [
            makeTextPart("Hello "),
            makeEmotePart("Kappa", "25"),
        ]
        const result = parseEventSubEmotes(parts)
        expect(result).toHaveLength(1)
        expect(result[0].startIndex).toBe(6)
        expect(result[0].endIndex).toBe(10)
    })

    it("parses multiple emotes with text between", () => {
        const parts: EventSubMessagePart[] = [
            makeEmotePart("PogChamp", "305954156"),
            makeTextPart(" nice "),
            makeEmotePart("LUL", "425618"),
        ]
        const result = parseEventSubEmotes(parts)
        expect(result).toHaveLength(2)

        expect(result[0].name).toBe("PogChamp")
        expect(result[0].startIndex).toBe(0)
        expect(result[0].endIndex).toBe(7)

        expect(result[1].name).toBe("LUL")
        expect(result[1].startIndex).toBe(14)
        expect(result[1].endIndex).toBe(16)
    })

    it("ignores cheermote and mention parts", () => {
        const parts: EventSubMessagePart[] = [
            { type: "cheermote", text: "Cheer100", cheermote: { prefix: "Cheer", bits: 100, tier: 1 } },
            makeTextPart(" thanks "),
            { type: "mention", text: "@SomeUser", mention: { user_id: "123", user_name: "SomeUser", user_login: "someuser" } },
        ]
        expect(parseEventSubEmotes(parts)).toEqual([])
    })

    it("handles emote part without emote data", () => {
        const parts: EventSubMessagePart[] = [
            { type: "emote", text: "BrokenEmote" },
        ]
        expect(parseEventSubEmotes(parts)).toEqual([])
    })

    it("returns empty array for empty input", () => {
        expect(parseEventSubEmotes([])).toEqual([])
    })

    it("builds correct CDN URL for emote", () => {
        const parts: EventSubMessagePart[] = [makeEmotePart("emotesv2_test", "emotesv2_abc123")]
        const result = parseEventSubEmotes(parts)
        expect(result[0].url).toBe(
            "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_abc123/default/dark/1.0"
        )
    })
})

describe("parseEventSubBadgeRoles", () => {
    it("detects moderator badge", () => {
        const result = parseEventSubBadgeRoles({ moderator: "1" })
        expect(result.isModerator).toBe(true)
        expect(result.isSubscriber).toBe(false)
        expect(result.isOwner).toBe(false)
    })

    it("detects subscriber badge", () => {
        const result = parseEventSubBadgeRoles({ subscriber: "3012" })
        expect(result.isModerator).toBe(false)
        expect(result.isSubscriber).toBe(true)
        expect(result.isOwner).toBe(false)
    })

    it("detects founder badge as subscriber", () => {
        const result = parseEventSubBadgeRoles({ founder: "0" })
        expect(result.isSubscriber).toBe(true)
    })

    it("detects broadcaster badge as owner", () => {
        const result = parseEventSubBadgeRoles({ broadcaster: "1" })
        expect(result.isOwner).toBe(true)
    })

    it("detects multiple roles", () => {
        const result = parseEventSubBadgeRoles({
            moderator: "1",
            subscriber: "24",
            broadcaster: "1",
        })
        expect(result.isModerator).toBe(true)
        expect(result.isSubscriber).toBe(true)
        expect(result.isOwner).toBe(true)
    })

    it("returns all false for empty badges", () => {
        const result = parseEventSubBadgeRoles({})
        expect(result.isModerator).toBe(false)
        expect(result.isSubscriber).toBe(false)
        expect(result.isOwner).toBe(false)
    })

    it("ignores unrelated badges", () => {
        const result = parseEventSubBadgeRoles({
            premium: "1",
            bits: "1000",
            glhf_pledge: "1",
        })
        expect(result.isModerator).toBe(false)
        expect(result.isSubscriber).toBe(false)
        expect(result.isOwner).toBe(false)
    })

    it("handles founder and subscriber together (subscriber wins)", () => {
        const result = parseEventSubBadgeRoles({
            founder: "0",
            subscriber: "12",
        })
        expect(result.isSubscriber).toBe(true)
    })
})
