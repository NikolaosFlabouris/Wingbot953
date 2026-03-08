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

import { HandleFastFact, SendDidYouKnowFact } from "../Server/Commands/FastFacts"
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

describe("HandleFastFact", () => {
    const mockSend = vi.mocked(sendChatMessage)

    beforeEach(() => {
        mockSend.mockClear()
    })

    it("sends a message when called", () => {
        HandleFastFact(makeMessage("!fastfact"))
        expect(mockSend).toHaveBeenCalledOnce()
    })

    it("sends a fast fact link", () => {
        HandleFastFact(makeMessage("!fastfact"))
        const sent = mockSend.mock.calls[0][0]
        // Fast facts contain YouTube links
        expect(sent.message.text).toContain("https://youtu.be/")
    })

    it("preserves platform from input message", () => {
        HandleFastFact(makeMessage("!fastfact", "youtube"))
        const sent = mockSend.mock.calls[0][0]
        expect(sent.platform).toBe("youtube")
    })
})

describe("SendDidYouKnowFact", () => {
    const mockSend = vi.mocked(sendChatMessage)

    beforeEach(() => {
        mockSend.mockClear()
    })

    it("sends a message when called", () => {
        SendDidYouKnowFact()
        expect(mockSend).toHaveBeenCalledOnce()
    })

    it("sends on twitch platform", () => {
        SendDidYouKnowFact()
        const sent = mockSend.mock.calls[0][0]
        expect(sent.platform).toBe("twitch")
    })

    it("message starts with /me", () => {
        SendDidYouKnowFact()
        const sent = mockSend.mock.calls[0][0]
        expect(sent.message.text.startsWith("/me ")).toBe(true)
    })

    it("message contains a fact", () => {
        SendDidYouKnowFact()
        const sent = mockSend.mock.calls[0][0]
        // All facts start with "/me Did you know" or "/me Ever wanted"
        const text = sent.message.text.replace("/me ", "")
        expect(text.length).toBeGreaterThan(10)
    })
})
