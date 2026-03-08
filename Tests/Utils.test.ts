import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the MessageHandling module before importing Utils
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
    SecondsToDuration,
    Between,
    SelectFromList,
    numberToOrdinal,
    GenerateSeanMessage,
} from "../Server/Commands/Utils"
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

describe("SecondsToDuration", () => {
    it("formats seconds only", () => {
        expect(SecondsToDuration(45)).toBe("0hrs 00mins 45secs")
    })

    it("formats minutes and seconds", () => {
        expect(SecondsToDuration(125)).toBe("0hrs 02mins 05secs")
    })

    it("formats hours, minutes, and seconds", () => {
        expect(SecondsToDuration(3661)).toBe("1hrs 01mins 01secs")
    })

    it("formats days when applicable", () => {
        expect(SecondsToDuration(90061)).toBe("1days 1hrs 01mins 01secs")
    })

    it("handles zero", () => {
        expect(SecondsToDuration(0)).toBe("0hrs 00mins 00secs")
    })

    it("handles exact hour", () => {
        expect(SecondsToDuration(3600)).toBe("1hrs 00mins 00secs")
    })

    it("handles exact day", () => {
        expect(SecondsToDuration(86400)).toBe("1days 0hrs 00mins 00secs")
    })

    it("handles multiple days", () => {
        expect(SecondsToDuration(172800)).toBe("2days 0hrs 00mins 00secs")
    })
})

describe("Between", () => {
    it("returns a number within the range (inclusive)", () => {
        for (let i = 0; i < 100; i++) {
            const result = Between(1, 10)
            expect(result).toBeGreaterThanOrEqual(1)
            expect(result).toBeLessThanOrEqual(10)
        }
    })

    it("handles min equal to max", () => {
        expect(Between(5, 5)).toBe(5)
    })

    it("handles swapped min and max", () => {
        for (let i = 0; i < 100; i++) {
            const result = Between(10, 1)
            expect(result).toBeGreaterThanOrEqual(1)
            expect(result).toBeLessThanOrEqual(10)
        }
    })

    it("handles zero range", () => {
        expect(Between(0, 0)).toBe(0)
    })

    it("handles negative numbers", () => {
        for (let i = 0; i < 100; i++) {
            const result = Between(-5, -1)
            expect(result).toBeGreaterThanOrEqual(-5)
            expect(result).toBeLessThanOrEqual(-1)
        }
    })

    it("returns an integer", () => {
        for (let i = 0; i < 50; i++) {
            const result = Between(1, 100)
            expect(Number.isInteger(result)).toBe(true)
        }
    })
})

describe("numberToOrdinal", () => {
    it("handles 1st, 2nd, 3rd", () => {
        expect(numberToOrdinal(1)).toBe("1st")
        expect(numberToOrdinal(2)).toBe("2nd")
        expect(numberToOrdinal(3)).toBe("3rd")
    })

    it("handles 4th through 10th", () => {
        expect(numberToOrdinal(4)).toBe("4th")
        expect(numberToOrdinal(5)).toBe("5th")
        expect(numberToOrdinal(10)).toBe("10th")
    })

    it("handles special cases 11th, 12th, 13th", () => {
        expect(numberToOrdinal(11)).toBe("11th")
        expect(numberToOrdinal(12)).toBe("12th")
        expect(numberToOrdinal(13)).toBe("13th")
    })

    it("handles 21st, 22nd, 23rd", () => {
        expect(numberToOrdinal(21)).toBe("21st")
        expect(numberToOrdinal(22)).toBe("22nd")
        expect(numberToOrdinal(23)).toBe("23rd")
    })

    it("handles 111th, 112th, 113th (special cases)", () => {
        expect(numberToOrdinal(111)).toBe("111th")
        expect(numberToOrdinal(112)).toBe("112th")
        expect(numberToOrdinal(113)).toBe("113th")
    })

    it("handles larger numbers", () => {
        expect(numberToOrdinal(101)).toBe("101st")
        expect(numberToOrdinal(1000)).toBe("1000th")
    })
})

describe("GenerateSeanMessage", () => {
    it("starts with 'asd'", () => {
        const msg = GenerateSeanMessage()
        expect(msg.startsWith("asd")).toBe(true)
    })

    it("has length between 9 and 17 (3 prefix + 6-14 random)", () => {
        for (let i = 0; i < 50; i++) {
            const msg = GenerateSeanMessage()
            expect(msg.length).toBeGreaterThanOrEqual(9)
            expect(msg.length).toBeLessThanOrEqual(17)
        }
    })

    it("only contains valid characters", () => {
        const validChars = new Set([..."abcdefghrsw"])
        for (let i = 0; i < 50; i++) {
            const msg = GenerateSeanMessage()
            // After 'asd' prefix, all chars should be from the valid set
            for (const char of msg.slice(3)) {
                expect(validChars.has(char)).toBe(true)
            }
        }
    })
})

describe("SelectFromList", () => {
    const mockSendChatMessage = vi.mocked(sendChatMessage)

    beforeEach(() => {
        mockSendChatMessage.mockClear()
    })

    const testList = ["Alpha item", "Beta item", "Gamma item", "Delta item"]

    it("selects a random item when no argument given", () => {
        const msg = makeMessage("!quote")
        SelectFromList(testList, msg)

        expect(mockSendChatMessage).toHaveBeenCalledOnce()
        const sent = mockSendChatMessage.mock.calls[0][0]
        // Should match format "[N] item text"
        expect(sent.message.text).toMatch(/^\[\d+\] .+/)
    })

    it("selects by numeric index (1-based)", () => {
        const msg = makeMessage("!quote 2")
        SelectFromList(testList, msg)

        expect(mockSendChatMessage).toHaveBeenCalledOnce()
        const sent = mockSendChatMessage.mock.calls[0][0]
        expect(sent.message.text).toBe("[2] Beta item")
    })

    it("shows out of range for index too high", () => {
        const msg = makeMessage("!quote 100")
        SelectFromList(testList, msg)

        expect(mockSendChatMessage).toHaveBeenCalledOnce()
        const sent = mockSendChatMessage.mock.calls[0][0]
        expect(sent.message.text).toBe("Value out of range: 1 to 4")
    })

    it("matches keyword search", () => {
        const msg = makeMessage("!quote Beta")
        SelectFromList(testList, msg)

        expect(mockSendChatMessage).toHaveBeenCalledOnce()
        const sent = mockSendChatMessage.mock.calls[0][0]
        expect(sent.message.text).toContain("Beta item")
    })

    it("matches keyword search case-insensitively", () => {
        const msg = makeMessage("!quote gamma")
        SelectFromList(testList, msg)

        expect(mockSendChatMessage).toHaveBeenCalledOnce()
        const sent = mockSendChatMessage.mock.calls[0][0]
        expect(sent.message.text).toContain("Gamma item")
    })

    it("reports no match for unknown keyword", () => {
        const msg = makeMessage("!quote Zeta")
        SelectFromList(testList, msg)

        expect(mockSendChatMessage).toHaveBeenCalledOnce()
        const sent = mockSendChatMessage.mock.calls[0][0]
        expect(sent.message.text).toBe("No word match found.")
    })

    it("matches multiple keywords", () => {
        const msg = makeMessage("!quote Alpha item")
        SelectFromList(testList, msg)

        expect(mockSendChatMessage).toHaveBeenCalledOnce()
        const sent = mockSendChatMessage.mock.calls[0][0]
        expect(sent.message.text).toContain("Alpha item")
    })

    it("preserves platform from incoming message", () => {
        const msg = makeMessage("!quote", "youtube")
        SelectFromList(testList, msg)

        expect(mockSendChatMessage).toHaveBeenCalledOnce()
        const sent = mockSendChatMessage.mock.calls[0][0]
        expect(sent.platform).toBe("youtube")
    })

    it("handles out-of-range index (too high)", () => {
        const msg = makeMessage("!quote 100")
        SelectFromList(testList, msg)

        expect(mockSendChatMessage).toHaveBeenCalledOnce()
        const sent = mockSendChatMessage.mock.calls[0][0]
        expect(sent.message.text).toBe("Value out of range: 1 to 4")
    })

    it("handles out-of-range index (zero/negative)", () => {
        const msg = makeMessage("!quote 0")
        SelectFromList(testList, msg)

        expect(mockSendChatMessage).toHaveBeenCalledOnce()
        const sent = mockSendChatMessage.mock.calls[0][0]
        // index = 0 - 1 = -1, which is < 0, triggering out-of-range
        expect(sent.message.text).toBe("Value out of range: 1 to 4")
    })

    it("selects first item by index", () => {
        const msg = makeMessage("!quote 1")
        SelectFromList(testList, msg)

        expect(mockSendChatMessage).toHaveBeenCalledOnce()
        const sent = mockSendChatMessage.mock.calls[0][0]
        expect(sent.message.text).toBe("[1] Alpha item")
    })

    it("selects last item by index", () => {
        const msg = makeMessage("!quote 4")
        SelectFromList(testList, msg)

        expect(mockSendChatMessage).toHaveBeenCalledOnce()
        const sent = mockSendChatMessage.mock.calls[0][0]
        expect(sent.message.text).toBe("[4] Delta item")
    })

    it("matches when multiple items contain keyword", () => {
        // All items contain "item", so random selection among all
        const msg = makeMessage("!quote item")
        SelectFromList(testList, msg)

        expect(mockSendChatMessage).toHaveBeenCalledOnce()
        const sent = mockSendChatMessage.mock.calls[0][0]
        expect(sent.message.text).toMatch(/^\[\d+\] .+ item$/)
    })
})
