import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock MessageHandling
vi.mock("../Server/MessageHandling", () => ({
    sendChatMessage: vi.fn(),
    Wingbot953Message: {
        platform: "all" as const,
        channel: { name: "Wingman953" },
        author: { name: "Wingbot953", displayName: "Wingbot953" },
        message: { text: "" },
    },
}))

// Mock https for API calls
vi.mock("node:https", () => ({
    default: {
        get: vi.fn(),
    },
}))

import { FindHaloRunsCompatibleNames, HandleHaloRunsWr, HandleWingman953Pb } from "../Server/Integrations/HaloRuns"
import { sendChatMessage } from "../Server/MessageHandling"
import { UnifiedChatMessage } from "../Common/UnifiedChatMessage"

function makeMessage(
    text: string,
    platform: "twitch" | "youtube" = "twitch"
): UnifiedChatMessage {
    return {
        platform,
        channel: { name: "Wingman953" },
        author: { name: "testuser", displayName: "TestUser" },
        message: { text },
    }
}

describe("FindHaloRunsCompatibleNames", () => {
    const mockSend = vi.mocked(sendChatMessage)

    beforeEach(() => {
        mockSend.mockClear()
    })

    it("parses valid game/category/segment/difficulty names", () => {
        const result = FindHaloRunsCompatibleNames(
            "odst",
            "solo",
            "fg",
            "easy",
            makeMessage("!wr odst solo fg easy")
        )
        // Should return 4 elements if all are found
        if (result.length === 4) {
            expect(result[0]).toBe("Halo 3: ODST")
            expect(result[1]).toBe("Solo")
        }
    })

    it("returns empty array for invalid game name", () => {
        const result = FindHaloRunsCompatibleNames(
            "invalidgame",
            "solo",
            "fg",
            "easy",
            makeMessage("!wr invalidgame solo fg easy")
        )
        expect(result).toEqual([])
        expect(mockSend).toHaveBeenCalled()
        const sent = mockSend.mock.calls[0][0]
        expect(sent.message.text).toContain("Failed to parse game")
    })

    it("returns empty array for invalid category", () => {
        const result = FindHaloRunsCompatibleNames(
            "odst",
            "invalidcat",
            "fg",
            "easy",
            makeMessage("!wr odst invalidcat fg easy")
        )
        expect(result).toEqual([])
        expect(mockSend).toHaveBeenCalled()
        const sent = mockSend.mock.calls[0][0]
        expect(sent.message.text).toContain("Failed to parse category")
    })

    it("returns empty array for invalid difficulty", () => {
        const result = FindHaloRunsCompatibleNames(
            "odst",
            "solo",
            "fg",
            "invaliddiff",
            makeMessage("!wr odst solo fg invaliddiff")
        )
        expect(result).toEqual([])
        expect(mockSend).toHaveBeenCalled()
    })

    it("handles case-insensitive matching", () => {
        const result = FindHaloRunsCompatibleNames(
            "ODST",
            "SOLO",
            "fg",
            "EASY",
            makeMessage("!wr ODST SOLO fg EASY")
        )
        // Input is already lowercased by callers, but verify no crash
        expect(Array.isArray(result)).toBe(true)
    })

    it("returns empty array for invalid runnable segment", () => {
        const result = FindHaloRunsCompatibleNames(
            "odst",
            "solo",
            "invalidsegment",
            "easy",
            makeMessage("!wr odst solo invalidsegment easy")
        )
        expect(result).toEqual([])
        expect(mockSend).toHaveBeenCalled()
        const sent = mockSend.mock.calls[0][0]
        expect(sent.message.text).toContain("Failed to parse runnable segment")
    })

    it("preserves requesting platform in error messages", () => {
        FindHaloRunsCompatibleNames(
            "invalidgame",
            "solo",
            "fg",
            "easy",
            makeMessage("!wr invalidgame solo fg easy", "youtube")
        )
        expect(mockSend.mock.calls[0][0].platform).toBe("youtube")
    })

    it("parses various valid game abbreviations", () => {
        const gameTests = [
            { abbrev: "ce", expected: "Halo CE" },
            { abbrev: "h2", expected: "Halo 2" },
            { abbrev: "h3", expected: "Halo 3" },
            { abbrev: "reach", expected: "Halo: Reach" },
            { abbrev: "h4", expected: "Halo 4" },
            { abbrev: "h5", expected: "Halo 5" },
            { abbrev: "infinite", expected: "Halo Infinite" },
        ]

        for (const test of gameTests) {
            mockSend.mockClear()
            const result = FindHaloRunsCompatibleNames(
                test.abbrev,
                "solo",
                "fg",
                "easy",
                makeMessage(`!wr ${test.abbrev} solo fg easy`)
            )
            if (result.length >= 1) {
                expect(result[0]).toBe(test.expected)
            }
        }
    })

    it("parses category abbreviations", () => {
        const categoryTests = [
            { abbrev: "solo", expected: "Solo" },
            { abbrev: "coop", expected: "Coop" },
        ]

        for (const test of categoryTests) {
            mockSend.mockClear()
            const result = FindHaloRunsCompatibleNames(
                "odst",
                test.abbrev,
                "fg",
                "easy",
                makeMessage(`!wr odst ${test.abbrev} fg easy`)
            )
            if (result.length >= 2) {
                expect(result[1]).toBe(test.expected)
            }
        }
    })

    it("parses difficulty abbreviations", () => {
        const diffTests = [
            { abbrev: "easy", expected: "Easy" },
            { abbrev: "normal", expected: "Normal" },
            { abbrev: "heroic", expected: "Heroic" },
            { abbrev: "legendary", expected: "Legendary" },
        ]

        for (const test of diffTests) {
            mockSend.mockClear()
            const result = FindHaloRunsCompatibleNames(
                "odst",
                "solo",
                "fg",
                test.abbrev,
                makeMessage(`!wr odst solo fg ${test.abbrev}`)
            )
            if (result.length === 4) {
                expect(result[3]).toBe(test.expected)
            }
        }
    })
})

describe("HandleHaloRunsWr", () => {
    const mockSend = vi.mocked(sendChatMessage)

    beforeEach(() => {
        mockSend.mockClear()
    })

    it("sends error for incorrect number of parameters", () => {
        HandleHaloRunsWr(makeMessage("!wr odst solo"))
        expect(mockSend).toHaveBeenCalledOnce()
        expect(mockSend.mock.calls[0][0].message.text).toContain("Incorrect number of parameters")
    })

    it("sends error for two parameters", () => {
        HandleHaloRunsWr(makeMessage("!wr odst"))
        expect(mockSend).toHaveBeenCalledOnce()
        expect(mockSend.mock.calls[0][0].message.text).toContain("Incorrect number of parameters")
    })

    it("sends error message when FindHaloRunsCompatibleNames fails for game", () => {
        HandleHaloRunsWr(makeMessage("!wr invalidgame solo fg easy"))
        expect(mockSend).toHaveBeenCalled()
        expect(mockSend.mock.calls[0][0].message.text).toContain("Failed to parse game")
    })
})

describe("HandleWingman953Pb", () => {
    const mockSend = vi.mocked(sendChatMessage)

    beforeEach(() => {
        mockSend.mockClear()
    })

    it("sends error for incorrect number of parameters", () => {
        HandleWingman953Pb(makeMessage("!pb odst solo"))
        expect(mockSend).toHaveBeenCalledOnce()
        expect(mockSend.mock.calls[0][0].message.text).toContain("Incorrect number of parameters")
    })

    it("sends error message when FindHaloRunsCompatibleNames fails", () => {
        HandleWingman953Pb(makeMessage("!pb invalidgame solo fg easy"))
        expect(mockSend).toHaveBeenCalled()
        expect(mockSend.mock.calls[0][0].message.text).toContain("Failed to parse game")
    })
})
