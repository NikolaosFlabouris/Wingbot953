import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Mock external dependencies
vi.mock("../Server/MessageHandling", () => ({
    sendChatMessage: vi.fn(),
    Wingbot953Message: {
        platform: "all" as const,
        channel: { name: "Wingman953" },
        author: { name: "Wingbot953", displayName: "Wingbot953" },
        message: { text: "" },
    },
}))

vi.mock("../Server/Integrations/Twitch", () => ({
    TwitchManager: {
        getInstance: () => ({
            enableSlowMode: vi.fn(),
            disableSlowMode: vi.fn(),
        }),
    },
}))

vi.mock("../Server/Integrations/YouTube", () => ({
    YouTubeManager: {
        getInstance: () => ({
            setChatPollingInterval: vi.fn(),
        }),
    },
}))

vi.mock("../Server/Integrations/Discord", () => ({
    PublishTwitchAllTimeLeaderboard: vi.fn(),
    PublishYouTubeAllTimeLeaderboard: vi.fn(),
}))

vi.mock("fs", () => ({
    default: {
        promises: {
            readFile: vi.fn().mockResolvedValue("[]"),
            writeFile: vi.fn().mockResolvedValue(undefined),
        },
        readFileSync: vi.fn().mockReturnValue("[]"),
        writeFile: vi.fn(),
        existsSync: vi.fn().mockReturnValue(false),
    },
    promises: {
        readFile: vi.fn().mockResolvedValue("[]"),
        writeFile: vi.fn().mockResolvedValue(undefined),
    },
}))

import {
    QuizManager,
    GetQuizScore,
    GetQuizLeaderboards,
    AddQuizScore,
} from "../Server/Commands/Quiz"
import { sendChatMessage } from "../Server/MessageHandling"
import { UnifiedChatMessage } from "../Common/UnifiedChatMessage"
import fs from "fs"

function makeMessage(
    text: string,
    platform: "twitch" | "youtube" = "twitch",
    displayName = "TestUser",
    userId = "user-123"
): UnifiedChatMessage {
    return {
        platform,
        channel: { name: "Wingman953" },
        author: { name: displayName.toLowerCase(), displayName, id: userId },
        message: { text },
    }
}

describe("QuizManager", () => {
    let manager: QuizManager

    beforeEach(() => {
        manager = QuizManager.getInstance()
    })

    afterEach(() => {
        manager.shutdown()
    })

    describe("getInstance", () => {
        it("returns the same instance", () => {
            const a = QuizManager.getInstance()
            const b = QuizManager.getInstance()
            expect(a).toBe(b)
        })
    })

    describe("isQuizActive", () => {
        it("returns false when no quiz is active", () => {
            expect(manager.isQuizActive()).toBe(false)
        })
    })

    describe("queueQuiz", () => {
        it("does not throw when queueing", () => {
            expect(() => manager.queueQuiz()).not.toThrow()
        })
    })

    describe("handleMessage", () => {
        it("does nothing when no quiz is active", () => {
            const msg = makeMessage("some answer")
            expect(() => manager.handleMessage(msg)).not.toThrow()
        })
    })

    describe("resetUsedQuestions", () => {
        it("does not throw", () => {
            expect(() => manager.resetUsedQuestions()).not.toThrow()
        })
    })

    describe("initialise", () => {
        it("logs question counts without throwing", () => {
            const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
            expect(() => manager.initialise()).not.toThrow()
            expect(logSpy).toHaveBeenCalled()
            logSpy.mockRestore()
        })
    })

    describe("shutdown", () => {
        it("cleans up without error", () => {
            manager.initialise()
            expect(() => manager.shutdown()).not.toThrow()
        })

        it("can be called multiple times safely", () => {
            expect(() => manager.shutdown()).not.toThrow()
            expect(() => manager.shutdown()).not.toThrow()
        })
    })

    describe("getLeaderboardManager", () => {
        it("returns a leaderboard manager", () => {
            const lm = manager.getLeaderboardManager()
            expect(lm).toBeDefined()
            expect(typeof lm.getScore).toBe("function")
            expect(typeof lm.getTopUsers).toBe("function")
        })
    })
})

describe("GetQuizScore", () => {
    const mockSend = vi.mocked(sendChatMessage)

    beforeEach(() => {
        mockSend.mockClear()
    })

    it("sends a message for unknown user", async () => {
        const msg = makeMessage("!score", "twitch", "UnknownUser", "unknown-id")
        await GetQuizScore(msg)
        expect(mockSend).toHaveBeenCalledOnce()
        const sent = mockSend.mock.calls[0][0]
        expect(sent.message.text).toContain("No score found")
    })

    it("looks up another user when username argument provided", async () => {
        const msg = makeMessage("!score OtherUser", "twitch", "TestUser", "user-123")
        await GetQuizScore(msg)
        expect(mockSend).toHaveBeenCalledOnce()
        const sent = mockSend.mock.calls[0][0]
        expect(sent.message.text).toContain("OtherUser")
    })
})

describe("GetQuizLeaderboards", () => {
    const mockSend = vi.mocked(sendChatMessage)

    beforeEach(() => {
        mockSend.mockClear()
    })

    it("sends a leaderboard message", async () => {
        const msg = makeMessage("!leaderboards", "twitch")
        await GetQuizLeaderboards(msg)
        expect(mockSend).toHaveBeenCalledOnce()
        const sent = mockSend.mock.calls[0][0]
        expect(sent.message.text).toContain("TWITCH ALL-TIME QUIZ TOP 5")
    })

    it("uses requesting platform", async () => {
        const msg = makeMessage("!leaderboards", "youtube")
        await GetQuizLeaderboards(msg)
        expect(mockSend).toHaveBeenCalledOnce()
        const sent = mockSend.mock.calls[0][0]
        expect(sent.message.text).toContain("YOUTUBE")
        expect(sent.platform).toBe("youtube")
    })
})

describe("AddQuizScore", () => {
    const mockSend = vi.mocked(sendChatMessage)
    const mockWriteFile = vi.mocked(fs.promises.writeFile)

    beforeEach(() => {
        mockSend.mockClear()
        mockWriteFile.mockClear()
    })

    it("adds score and sends confirmation", async () => {
        const msg = makeMessage("!addscore SomeUser", "twitch", "Wingman953")
        await AddQuizScore(msg)
        expect(mockSend).toHaveBeenCalledOnce()
        const sent = mockSend.mock.calls[0][0]
        expect(sent.message.text).toContain("Score added for user: @SomeUser")
    })

    it("does nothing when no username provided", async () => {
        const msg = makeMessage("!addscore", "twitch", "Wingman953")
        await AddQuizScore(msg)
        expect(mockSend).not.toHaveBeenCalled()
    })

    it("uses mocked fs.promises.writeFile, not real file I/O", async () => {
        const msg = makeMessage("!addscore MockedUser", "twitch", "Wingman953")
        await AddQuizScore(msg)
        // Verify the mock was called (proving real fs was not used)
        expect(mockWriteFile).toHaveBeenCalled()
        // Verify the path matches the production leaderboard file
        const writtenPath = mockWriteFile.mock.calls[0][0]
        expect(writtenPath).toContain("QuizLeaderboards.json")
    })
})
