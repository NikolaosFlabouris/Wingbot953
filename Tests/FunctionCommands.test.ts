import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock all external dependencies
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
            handleFollowAge: vi.fn(),
            handleUptime: vi.fn(),
            runAd: vi.fn(),
        }),
    },
}))

vi.mock("../Server/Integrations/Spotify", () => ({
    SpotifyManager: {
        getInstance: () => ({
            getCurrentSong: vi.fn(),
            addSongToQueue: vi.fn(),
            getSongYear: vi.fn(),
            is2013Song: vi.fn(),
        }),
    },
}))

vi.mock("../Server/Integrations/YouTube", () => ({
    YouTubeManager: {
        getInstance: () => ({
            setPollingOverride: vi.fn(),
            getPollingStatus: vi.fn(() => ({
                overrideMode: null,
                isPolling: false,
                isMonitoring: false,
                isTwitchLive: false,
            })),
        }),
    },
}))

vi.mock("../Server/Integrations/HaloRuns", () => ({
    HandleHaloRunsWr: vi.fn(),
    HandleWingman953Pb: vi.fn(),
}))

vi.mock("../Server/Integrations/LiveSplit", () => ({
    LiveSplitClient: {
        getInstance: () => ({
            setGame: vi.fn(),
        }),
    },
}))

vi.mock("../Server/Commands/Quiz", () => ({
    QuizManager: {
        getInstance: () => ({
            queueQuiz: vi.fn(),
        }),
    },
    GetQuizLeaderboards: vi.fn(),
    GetQuizScore: vi.fn(),
    AddQuizScore: vi.fn(),
    PublishLeaderboards: vi.fn(),
}))

import functionMap from "../Server/Commands/FunctionCommands"
import { HandleRandomNumberGeneration, GenerateCommandsList } from "../Server/Commands/FunctionCommands"
import { sendChatMessage } from "../Server/MessageHandling"
import { UnifiedChatMessage } from "../Common/UnifiedChatMessage"

function makeMessage(
    text: string,
    platform: "twitch" | "youtube" = "twitch",
    displayName = "TestUser"
): UnifiedChatMessage {
    return {
        platform,
        channel: { name: "Wingman953" },
        author: { name: displayName.toLowerCase(), displayName },
        message: { text },
    }
}

describe("functionMap structure", () => {
    it("is a non-empty array", () => {
        expect(Array.isArray(functionMap)).toBe(true)
        expect(functionMap.length).toBeGreaterThan(0)
    })

    it("every entry has a non-empty Command array", () => {
        for (const entry of functionMap) {
            expect(Array.isArray(entry.Command)).toBe(true)
            expect(entry.Command.length).toBeGreaterThan(0)
        }
    })

    it("every entry has a Function", () => {
        for (const entry of functionMap) {
            expect(typeof entry.Function).toBe("function")
        }
    })

    it("all command strings start with '!'", () => {
        for (const entry of functionMap) {
            for (const cmd of entry.Command) {
                expect(cmd.startsWith("!")).toBe(true)
            }
        }
    })

    it("has no duplicate commands across entries", () => {
        const allCommands = functionMap.flatMap((e) => e.Command)
        const unique = new Set(allCommands)
        expect(unique.size).toBe(allCommands.length)
    })

    it("admin commands have Username restrictions", () => {
        const adminCommands = ["!quizstart", "!addscore", "!runad", "!publishleaderboards", "!youtube_toggle_on", "!youtube_toggle_off", "!youtube_toggle_auto"]
        for (const cmd of adminCommands) {
            const entry = functionMap.find((e) => e.Command.includes(cmd))
            if (entry) {
                expect(entry.Username).toBeDefined()
                expect(entry.Username!.length).toBeGreaterThan(0)
            }
        }
    })

    it("contains expected commands", () => {
        const allCommands = functionMap.flatMap((e) => e.Command)
        expect(allCommands).toContain("!commands")
        expect(allCommands).toContain("!random")
        expect(allCommands).toContain("!song")
        expect(allCommands).toContain("!wr")
        expect(allCommands).toContain("!pb")
        expect(allCommands).toContain("!quizstart")
        expect(allCommands).toContain("!followage")
    })
})

describe("HandleRandomNumberGeneration", () => {
    const mockSend = vi.mocked(sendChatMessage)

    beforeEach(() => {
        mockSend.mockClear()
    })

    it("generates a number between given values", () => {
        HandleRandomNumberGeneration(makeMessage("!random 1 10"))
        expect(mockSend).toHaveBeenCalledOnce()
        const text = mockSend.mock.calls[0][0].message.text
        expect(text).toMatch(/Your number is: \d+/)
    })

    it("shows usage when no arguments given", () => {
        HandleRandomNumberGeneration(makeMessage("!random"))
        expect(mockSend).toHaveBeenCalledOnce()
        const text = mockSend.mock.calls[0][0].message.text
        expect(text).toContain("Usage:")
    })

    it("shows usage when only one argument given", () => {
        HandleRandomNumberGeneration(makeMessage("!random 5"))
        expect(mockSend).toHaveBeenCalledOnce()
        const text = mockSend.mock.calls[0][0].message.text
        expect(text).toContain("Usage:")
    })

    it("shows usage when non-numeric arguments given", () => {
        HandleRandomNumberGeneration(makeMessage("!random abc def"))
        expect(mockSend).toHaveBeenCalledOnce()
        const text = mockSend.mock.calls[0][0].message.text
        expect(text).toContain("Usage:")
    })

    it("adds 'moment' suffix for 15", () => {
        // Mock Between to always return 15
        vi.spyOn(Math, "random").mockReturnValue(0) // forces Between(15, 15) = 15
        HandleRandomNumberGeneration(makeMessage("!random 15 15"))
        const text = mockSend.mock.calls[0][0].message.text
        expect(text).toContain("15 moment")
        vi.restoreAllMocks()
    })

    it("adds 'hype' suffix for 953", () => {
        HandleRandomNumberGeneration(makeMessage("!random 953 953"))
        const text = mockSend.mock.calls[0][0].message.text
        expect(text).toContain("953 hype")
    })

    it("adds special suffix for 2019", () => {
        HandleRandomNumberGeneration(makeMessage("!random 2019 2019"))
        const text = mockSend.mock.calls[0][0].message.text
        expect(text).toContain("2019, the Year of ODST!")
    })
})

describe("GenerateCommandsList", () => {
    it("runs without error", () => {
        expect(() => GenerateCommandsList()).not.toThrow()
    })
})
