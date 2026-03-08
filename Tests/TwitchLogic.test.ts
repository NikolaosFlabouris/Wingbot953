import { describe, it, expect } from "vitest"

import {
    getSubQuizRollThreshold,
    formatSubMonths,
    formatViewerCount,
    buildSubMessage,
    buildResubMessage,
    buildSubGiftMessage,
    buildRaidMessage,
    buildCommunitySubMessage,
    buildGiftPaidUpgradeMessage,
    buildPrimePaidUpgradeMessage,
    buildStandardPayForwardMessage,
    buildCommunityPayForwardMessage,
    parseEmotePosition,
    extractEmoteName,
    buildEmoteUrl,
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
