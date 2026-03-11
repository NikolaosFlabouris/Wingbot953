import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const {
    mockEnableSlowMode,
    mockDisableSlowMode,
    mockSetChatPollingInterval,
    mockPublishTwitch,
    mockPublishYouTube,
    mockReadFile,
    mockWriteFile,
} = vi.hoisted(() => ({
    mockEnableSlowMode: vi.fn(),
    mockDisableSlowMode: vi.fn(),
    mockSetChatPollingInterval: vi.fn(),
    mockPublishTwitch: vi.fn(),
    mockPublishYouTube: vi.fn(),
    mockReadFile: vi.fn().mockResolvedValue("[]"),
    mockWriteFile: vi.fn().mockResolvedValue(undefined),
}))

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
            enableSlowMode: mockEnableSlowMode,
            disableSlowMode: mockDisableSlowMode,
        }),
    },
}))

vi.mock("../Server/Integrations/YouTube", () => ({
    YouTubeManager: {
        getInstance: () => ({
            setChatPollingInterval: mockSetChatPollingInterval,
        }),
    },
}))

vi.mock("../Server/Integrations/Discord", () => ({
    PublishTwitchAllTimeLeaderboard: mockPublishTwitch,
    PublishYouTubeAllTimeLeaderboard: mockPublishYouTube,
}))

vi.mock("fs", () => ({
    default: {
        promises: {
            readFile: (...args: unknown[]) => mockReadFile(...args) as Promise<string>,
            writeFile: (...args: unknown[]) => mockWriteFile(...args) as Promise<void>,
        },
        readFileSync: vi.fn().mockReturnValue("[]"),
        writeFile: vi.fn(),
        existsSync: vi.fn().mockReturnValue(false),
    },
    promises: {
        readFile: (...args: unknown[]) => mockReadFile(...args) as Promise<string>,
        writeFile: (...args: unknown[]) => mockWriteFile(...args) as Promise<void>,
    },
}))

import {
    QuizManager,
    GetQuizScore,
    GetQuizLeaderboards,
    AddQuizScore,
    PublishLeaderboards,
} from "../Server/Commands/Quiz"
import { sendChatMessage } from "../Server/MessageHandling"
import { UnifiedChatMessage } from "../Common/UnifiedChatMessage"

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
        expect(mockWriteFile).toHaveBeenCalled()
        const writtenPath = mockWriteFile.mock.calls[0][0] as string
        expect(writtenPath).toContain("QuizLeaderboards.json")
    })

    it("does nothing when too many arguments", async () => {
        const msg = makeMessage("!addscore user extra stuff", "twitch", "Wingman953")
        await AddQuizScore(msg)
        expect(mockSend).not.toHaveBeenCalled()
    })
})

describe("LeaderboardManager (via QuizManager)", () => {
    let manager: QuizManager

    beforeEach(() => {
        manager = QuizManager.getInstance()
        mockReadFile.mockClear()
        mockWriteFile.mockClear()
        mockPublishTwitch.mockClear()
        mockPublishYouTube.mockClear()
        // Default: empty leaderboard
        mockReadFile.mockResolvedValue("[]")
        mockWriteFile.mockResolvedValue(undefined)
    })

    afterEach(() => {
        manager.shutdown()
    })

    describe("loadLeaderboards", () => {
        it("loads and parses leaderboard data", async () => {
            const data = JSON.stringify([
                { Username: "User1", Platform: "twitch", Score: 10 },
            ])
            mockReadFile.mockResolvedValue(data)

            const lm = manager.getLeaderboardManager()
            await lm.loadLeaderboards()

            const score = await lm.getScore("User1", undefined, "twitch")
            expect(score).not.toBeNull()
            expect(score!.Score).toBe(10)
        })

        it("handles ENOENT by creating empty leaderboard", async () => {
            const enoentError = new Error("ENOENT") as NodeJS.ErrnoException
            enoentError.code = "ENOENT"
            mockReadFile.mockRejectedValue(enoentError)

            const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
            const lm = manager.getLeaderboardManager()
            await lm.loadLeaderboards()

            expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("not found"))
            logSpy.mockRestore()

            // Should have empty leaderboard
            const topUsers = await lm.getTopUsers("twitch")
            expect(topUsers).toEqual([])
        })

        it("throws on non-ENOENT errors", async () => {
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
            mockReadFile.mockRejectedValue(new Error("Permission denied"))

            const lm = manager.getLeaderboardManager()
            await expect(lm.loadLeaderboards()).rejects.toThrow("Permission denied")
            errorSpy.mockRestore()
        })
    })

    describe("saveLeaderboards", () => {
        it("skips save when DEBUG=TRUE", async () => {
            const originalDebug = process.env.DEBUG
            process.env.DEBUG = "TRUE"

            const lm = manager.getLeaderboardManager()
            await lm.saveLeaderboards()

            expect(mockWriteFile).not.toHaveBeenCalled()
            process.env.DEBUG = originalDebug
        })

        it("writes to QuizLeaderboards.json", async () => {
            // Ensure DEBUG is not set
            const originalDebug = process.env.DEBUG
            delete process.env.DEBUG

            const lm = manager.getLeaderboardManager()
            await lm.saveLeaderboards()

            expect(mockWriteFile).toHaveBeenCalledOnce()
            expect(mockWriteFile.mock.calls[0][0]).toContain("QuizLeaderboards.json")
            process.env.DEBUG = originalDebug
        })

        it("throws and logs on write failure", async () => {
            const originalDebug = process.env.DEBUG
            delete process.env.DEBUG
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
            mockWriteFile.mockRejectedValue(new Error("disk full"))

            const lm = manager.getLeaderboardManager()
            await expect(lm.saveLeaderboards()).rejects.toThrow("disk full")
            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("disk full"))

            errorSpy.mockRestore()
            process.env.DEBUG = originalDebug
        })
    })

    describe("updateScore", () => {
        it("creates new user entry when not found", async () => {
            // Track written data so subsequent loadLeaderboards sees it
            let savedData = "[]"
            mockWriteFile.mockImplementation((_path: string, data: string) => {
                savedData = data
                return Promise.resolve()
            })
            mockReadFile.mockImplementation(() => Promise.resolve(savedData))

            const lm = manager.getLeaderboardManager()
            await lm.updateScore(
                [{ Username: "NewUser", Platform: "twitch" }],
                1
            )

            const score = await lm.getScore("NewUser", undefined, "twitch")
            expect(score).not.toBeNull()
            expect(score!.Score).toBe(1)
        })

        it("increments existing user score", async () => {
            let savedData = JSON.stringify([
                { Username: "Existing", Platform: "twitch", Score: 5 },
            ])
            mockWriteFile.mockImplementation((_path: string, data: string) => {
                savedData = data
                return Promise.resolve()
            })
            mockReadFile.mockImplementation(() => Promise.resolve(savedData))

            const lm = manager.getLeaderboardManager()
            await lm.updateScore(
                [{ Username: "Existing", Platform: "twitch" }],
                3
            )

            const score = await lm.getScore("Existing", undefined, "twitch")
            expect(score!.Score).toBe(8)
        })

        it("publishes leaderboards after update", async () => {
            const lm = manager.getLeaderboardManager()
            await lm.updateScore(
                [{ Username: "User1", Platform: "twitch" }],
                1
            )

            expect(mockPublishTwitch).toHaveBeenCalled()
            expect(mockPublishYouTube).toHaveBeenCalled()
        })

        it("handles multiple users in single update", async () => {
            let savedData = "[]"
            mockWriteFile.mockImplementation((_path: string, data: string) => {
                savedData = data
                return Promise.resolve()
            })
            mockReadFile.mockImplementation(() => Promise.resolve(savedData))

            const lm = manager.getLeaderboardManager()
            await lm.updateScore(
                [
                    { Username: "User1", Platform: "twitch" },
                    { Username: "User2", Platform: "youtube" },
                ],
                1
            )

            const score1 = await lm.getScore("User1", undefined, "twitch")
            const score2 = await lm.getScore("User2", undefined, "youtube")
            expect(score1!.Score).toBe(1)
            expect(score2!.Score).toBe(1)
        })
    })

    describe("getScore", () => {
        it("finds user by userId and platform", async () => {
            const data = JSON.stringify([
                { Username: "User1", UserId: "uid-1", Platform: "twitch", Score: 7 },
            ])
            mockReadFile.mockResolvedValue(data)

            const lm = manager.getLeaderboardManager()
            const score = await lm.getScore("User1", "uid-1", "twitch")
            expect(score!.Score).toBe(7)
        })

        it("finds user by username and platform when no userId match", async () => {
            const data = JSON.stringify([
                { Username: "User1", Platform: "twitch", Score: 3 },
            ])
            mockReadFile.mockResolvedValue(data)

            const lm = manager.getLeaderboardManager()
            const score = await lm.getScore("User1", "wrong-id", "twitch")
            expect(score!.Score).toBe(3)
        })

        it("is case-insensitive for username matching", async () => {
            const data = JSON.stringify([
                { Username: "User1", Platform: "twitch", Score: 3 },
            ])
            mockReadFile.mockResolvedValue(data)

            const lm = manager.getLeaderboardManager()
            const score = await lm.getScore("user1", undefined, "twitch")
            expect(score!.Score).toBe(3)
        })

        it("returns null for non-existent user", async () => {
            const lm = manager.getLeaderboardManager()
            const score = await lm.getScore("Nobody", undefined, "twitch")
            expect(score).toBeNull()
        })
    })

    describe("getTopUsers", () => {
        it("returns users sorted by score descending", async () => {
            const data = JSON.stringify([
                { Username: "Low", Platform: "twitch", Score: 1 },
                { Username: "High", Platform: "twitch", Score: 10 },
                { Username: "Mid", Platform: "twitch", Score: 5 },
            ])
            mockReadFile.mockResolvedValue(data)

            const lm = manager.getLeaderboardManager()
            const top = await lm.getTopUsers("twitch")
            expect(top[0].Username).toBe("High")
            expect(top[1].Username).toBe("Mid")
            expect(top[2].Username).toBe("Low")
        })

        it("filters by platform", async () => {
            const data = JSON.stringify([
                { Username: "TwitchUser", Platform: "twitch", Score: 5 },
                { Username: "YouTubeUser", Platform: "youtube", Score: 10 },
            ])
            mockReadFile.mockResolvedValue(data)

            const lm = manager.getLeaderboardManager()
            const top = await lm.getTopUsers("twitch")
            expect(top).toHaveLength(1)
            expect(top[0].Username).toBe("TwitchUser")
        })

        it("respects limit parameter", async () => {
            const data = JSON.stringify(
                Array.from({ length: 10 }, (_, i) => ({
                    Username: `User${i}`,
                    Platform: "twitch",
                    Score: 10 - i,
                }))
            )
            mockReadFile.mockResolvedValue(data)

            const lm = manager.getLeaderboardManager()
            const top = await lm.getTopUsers("twitch", 3)
            expect(top).toHaveLength(3)
        })

        it("defaults to limit of 5", async () => {
            const data = JSON.stringify(
                Array.from({ length: 10 }, (_, i) => ({
                    Username: `User${i}`,
                    Platform: "twitch",
                    Score: 10 - i,
                }))
            )
            mockReadFile.mockResolvedValue(data)

            const lm = manager.getLeaderboardManager()
            const top = await lm.getTopUsers("twitch")
            expect(top).toHaveLength(5)
        })
    })
})

describe("QuizManager - Additional Coverage", () => {
    let manager: QuizManager
    const mockSend = vi.mocked(sendChatMessage)

    beforeEach(() => {
        manager = QuizManager.getInstance()
        mockSend.mockClear()
        mockEnableSlowMode.mockClear()
        mockDisableSlowMode.mockClear()
        mockSetChatPollingInterval.mockClear()
        mockReadFile.mockClear()
        mockWriteFile.mockClear()
        mockReadFile.mockResolvedValue("[]")
        mockWriteFile.mockResolvedValue(undefined)
    })

    afterEach(() => {
        manager.shutdown()
    })

    describe("handleMessage", () => {
        it("does not throw when no quiz active", () => {
            const msg = makeMessage("some answer")
            expect(() => manager.handleMessage(msg)).not.toThrow()
        })

        it("does not crash with various message types", () => {
            const messages = [
                makeMessage(""),
                makeMessage("!command"),
                makeMessage("random text with symbols !@#$%"),
                makeMessage("answer", "youtube"),
            ]
            for (const msg of messages) {
                expect(() => manager.handleMessage(msg)).not.toThrow()
            }
        })
    })

    describe("queueQuiz", () => {
        it("can queue multiple quizzes", () => {
            expect(() => {
                manager.queueQuiz()
                manager.queueQuiz()
                manager.queueQuiz()
            }).not.toThrow()
        })
    })

    describe("initialise", () => {
        it("logs all category counts", () => {
            const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
            manager.initialise()

            // Should log total + each individual category
            const logCalls = logSpy.mock.calls.map(c => c[0] as string)
            expect(logCalls.some(c => c.includes("Total question count"))).toBe(true)
            expect(logCalls.some(c => c.includes("Halo"))).toBe(true)
            logSpy.mockRestore()
        })

        it("starts queue monitoring", () => {
            const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
            manager.initialise()
            // If we shutdown, the interval should be cleared without error
            expect(() => manager.shutdown()).not.toThrow()
            logSpy.mockRestore()
        })
    })

    describe("resetUsedQuestions", () => {
        it("can be called repeatedly without error", () => {
            manager.resetUsedQuestions()
            manager.resetUsedQuestions()
            manager.resetUsedQuestions()
        })
    })

    describe("isQuizActive", () => {
        it("returns false when no quiz running", () => {
            expect(manager.isQuizActive()).toBe(false)
        })
    })
})

describe("PublishLeaderboards", () => {
    beforeEach(() => {
        mockReadFile.mockClear()
        mockPublishTwitch.mockClear()
        mockPublishYouTube.mockClear()
        mockReadFile.mockResolvedValue("[]")
    })

    it("publishes to both Discord channels", async () => {
        await PublishLeaderboards()
        expect(mockPublishTwitch).toHaveBeenCalled()
        expect(mockPublishYouTube).toHaveBeenCalled()
    })

    it("combines twitch and youtube leaderboards", async () => {
        const data = JSON.stringify([
            { Username: "TUser", Platform: "twitch", Score: 5 },
            { Username: "YUser", Platform: "youtube", Score: 3 },
        ])
        mockReadFile.mockResolvedValue(data)

        await PublishLeaderboards()

        // Both publish functions should receive the combined data
        const twitchArgs = mockPublishTwitch.mock.calls[0][0] as unknown[]
        const youtubeArgs = mockPublishYouTube.mock.calls[0][0] as unknown[]
        expect(twitchArgs).toHaveLength(2)
        expect(youtubeArgs).toHaveLength(2)
    })

    it("handles errors gracefully", async () => {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
        mockReadFile.mockRejectedValue(new Error("read failure"))

        await PublishLeaderboards()

        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("read failure"))
        errorSpy.mockRestore()
    })
})
