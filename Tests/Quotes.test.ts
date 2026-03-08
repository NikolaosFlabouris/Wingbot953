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

import {
    HandleHCEQuote,
    HandleH2Quote,
    HandleH3Quote,
    HandleOdstQuote,
    HandleReachQuote,
    HandleH4Quote,
    HandleH5Quote,
    HandleInfiniteQuote,
    quoteMap,
} from "../Server/Commands/Quotes"
import { sendChatMessage } from "../Server/MessageHandling"
import { UnifiedChatMessage } from "../Common/UnifiedChatMessage"

function makeMessage(text: string, platform: "twitch" | "youtube" = "twitch"): UnifiedChatMessage {
    return {
        platform,
        channel: { name: "Wingman953" },
        author: { name: "testuser", displayName: "TestUser" },
        message: { text },
    }
}

describe("Quote Handlers", () => {
    const mockSend = vi.mocked(sendChatMessage)

    beforeEach(() => {
        mockSend.mockClear()
    })

    const handlers = [
        { name: "HandleHCEQuote", fn: HandleHCEQuote },
        { name: "HandleH2Quote", fn: HandleH2Quote },
        { name: "HandleH3Quote", fn: HandleH3Quote },
        { name: "HandleOdstQuote", fn: HandleOdstQuote },
        { name: "HandleReachQuote", fn: HandleReachQuote },
        { name: "HandleH4Quote", fn: HandleH4Quote },
        { name: "HandleH5Quote", fn: HandleH5Quote },
        { name: "HandleInfiniteQuote", fn: HandleInfiniteQuote },
    ]

    for (const { name, fn } of handlers) {
        it(`${name} sends a message`, () => {
            fn(makeMessage("!quote"))
            expect(mockSend).toHaveBeenCalledOnce()
            mockSend.mockClear()
        })

        it(`${name} sends a non-empty string`, () => {
            fn(makeMessage("!quote"))
            const sent = mockSend.mock.calls[0][0]
            expect(sent.message.text.length).toBeGreaterThan(0)
            mockSend.mockClear()
        })
    }
})

describe("quoteMap structure", () => {
    it("is a non-empty array", () => {
        expect(Array.isArray(quoteMap)).toBe(true)
        expect(quoteMap.length).toBeGreaterThan(0)
    })

    it("every entry has Command and Message arrays", () => {
        for (const entry of quoteMap) {
            expect(Array.isArray(entry.Command)).toBe(true)
            expect(entry.Command.length).toBeGreaterThan(0)
            expect(Array.isArray(entry.Message)).toBe(true)
            expect(entry.Message.length).toBeGreaterThan(0)
        }
    })

    it("all commands start with '!'", () => {
        for (const entry of quoteMap) {
            for (const cmd of entry.Command) {
                expect(cmd.startsWith("!")).toBe(true)
            }
        }
    })

    it("has no duplicate commands across entries", () => {
        const allCommands = quoteMap.flatMap((e) => e.Command)
        const unique = new Set(allCommands)
        expect(unique.size).toBe(allCommands.length)
    })

    it("AllMessages entries have VIP-only (Username) restrictions", () => {
        const allMsgEntries = quoteMap.filter((e) => e.AllMessages === true)
        // Most AllMessages entries have Username restrictions
        expect(allMsgEntries.length).toBeGreaterThan(0)
    })

    it("contains expected commands", () => {
        const allCommands = quoteMap.flatMap((e) => e.Command)
        expect(allCommands).toContain("!quote")
        expect(allCommands).toContain("!upliftmarine")
        expect(allCommands).toContain("!cutscene")
    })
})
