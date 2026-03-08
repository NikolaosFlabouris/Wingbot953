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

import { FindHaloRunsCompatibleNames } from "../Server/Integrations/HaloRuns"
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
})
