import { describe, it, expect, vi, beforeEach } from "vitest"

// Stable mock instances for integration singletons
const {
    mockHandleFollowAge,
    mockHandleUptime,
    mockRunAd,
    mockGetCurrentSong,
    mockAddSongToQueue,
    mockGetSongYear,
    mockIs2013Song,
    mockSetPollingOverride,
    mockGetPollingStatus,
    mockSetGame,
    mockQueueQuiz,
    mockHandleHaloRunsWr,
    mockHandleWingman953Pb,
} = vi.hoisted(() => ({
    mockHandleFollowAge: vi.fn(),
    mockHandleUptime: vi.fn(),
    mockRunAd: vi.fn(),
    mockGetCurrentSong: vi.fn(),
    mockAddSongToQueue: vi.fn(),
    mockGetSongYear: vi.fn(),
    mockIs2013Song: vi.fn(),
    mockSetPollingOverride: vi.fn(),
    mockGetPollingStatus: vi.fn((): {
        overrideMode: null | "force_on" | "force_off";
        isPolling: boolean;
        isMonitoring: boolean;
        isTwitchLive: boolean;
    } => ({
        overrideMode: null,
        isPolling: false,
        isMonitoring: false,
        isTwitchLive: false,
    })),
    mockSetGame: vi.fn(),
    mockQueueQuiz: vi.fn(),
    mockHandleHaloRunsWr: vi.fn(),
    mockHandleWingman953Pb: vi.fn(),
}))

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
            handleFollowAge: mockHandleFollowAge,
            handleUptime: mockHandleUptime,
            runAd: mockRunAd,
        }),
    },
}))

vi.mock("../Server/Integrations/Spotify", () => ({
    SpotifyManager: {
        getInstance: () => ({
            getCurrentSong: mockGetCurrentSong,
            addSongToQueue: mockAddSongToQueue,
            getSongYear: mockGetSongYear,
            is2013Song: mockIs2013Song,
        }),
    },
}))

vi.mock("../Server/Integrations/YouTube", () => ({
    YouTubeManager: {
        getInstance: () => ({
            setPollingOverride: mockSetPollingOverride,
            getPollingStatus: mockGetPollingStatus,
        }),
    },
}))

vi.mock("../Server/Integrations/HaloRuns", () => ({
    HandleHaloRunsWr: mockHandleHaloRunsWr,
    HandleWingman953Pb: mockHandleWingman953Pb,
}))

vi.mock("../Server/Integrations/LiveSplit", () => ({
    LiveSplitClient: {
        getInstance: () => ({
            setGame: mockSetGame,
        }),
    },
}))

vi.mock("../Server/Commands/Quiz", () => ({
    QuizManager: {
        getInstance: () => ({
            queueQuiz: mockQueueQuiz,
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

describe("HandleCommandsList", () => {
    const mockSend = vi.mocked(sendChatMessage)

    beforeEach(() => {
        mockSend.mockClear()
        GenerateCommandsList()
    })

    it("sends two messages (split commands list)", () => {
        const entry = functionMap.find(e => e.Command.includes("!commands"))
        expect(entry).toBeDefined()

        entry!.Function(makeMessage("!commands"))
        expect(mockSend).toHaveBeenCalledTimes(2)
    })

    it("preserves requesting platform", () => {
        const entry = functionMap.find(e => e.Command.includes("!commands"))!
        entry.Function(makeMessage("!commands", "youtube"))

        expect(mockSend.mock.calls[0][0].platform).toBe("youtube")
        expect(mockSend.mock.calls[1][0].platform).toBe("youtube")
    })
})

describe("YouTube toggle commands", () => {
    const mockSend = vi.mocked(sendChatMessage)

    beforeEach(() => {
        mockSend.mockClear()
        mockSetPollingOverride.mockClear()
        mockGetPollingStatus.mockClear()
    })

    it("HandleYouTubeToggleOn calls setPollingOverride('force_on')", () => {
        const entry = functionMap.find(e => e.Command.includes("!youtube_toggle_on"))!
        entry.Function(makeMessage("!youtube_toggle_on"))

        expect(mockSetPollingOverride).toHaveBeenCalledWith("force_on")
        expect(mockSend).toHaveBeenCalledOnce()
        expect(mockSend.mock.calls[0][0].message.text).toContain("forced ON")
        expect(mockSend.mock.calls[0][0].channel.name).toBe("Admin")
        expect(mockSend).toHaveBeenCalledWith(expect.anything(), true, false)
    })

    it("HandleYouTubeToggleOff calls setPollingOverride('force_off')", () => {
        const entry = functionMap.find(e => e.Command.includes("!youtube_toggle_off"))!
        entry.Function(makeMessage("!youtube_toggle_off"))

        expect(mockSetPollingOverride).toHaveBeenCalledWith("force_off")
        expect(mockSend.mock.calls[0][0].message.text).toContain("forced OFF")
        expect(mockSend.mock.calls[0][0].channel.name).toBe("Admin")
        expect(mockSend).toHaveBeenCalledWith(expect.anything(), true, false)
    })

    it("HandleYouTubeToggleAuto calls setPollingOverride(null)", () => {
        const entry = functionMap.find(e => e.Command.includes("!youtube_toggle_auto"))!
        entry.Function(makeMessage("!youtube_toggle_auto"))

        expect(mockSetPollingOverride).toHaveBeenCalledWith(null)
        expect(mockSend.mock.calls[0][0].message.text).toContain("AUTO")
        expect(mockSend.mock.calls[0][0].channel.name).toBe("Admin")
        expect(mockSend).toHaveBeenCalledWith(expect.anything(), true, false)
    })

    it("HandleYouTubeStatus shows auto mode by default", () => {
        const entry = functionMap.find(e => e.Command.includes("!youtube_status"))!
        entry.Function(makeMessage("!youtube_status"))

        expect(mockGetPollingStatus).toHaveBeenCalled()
        const text = mockSend.mock.calls[0][0].message.text
        expect(text).toContain("AUTO")
        expect(text).toContain("Polling:")
        expect(text).toContain("Monitoring:")
        expect(mockSend.mock.calls[0][0].channel.name).toBe("Admin")
        expect(mockSend).toHaveBeenCalledWith(expect.anything(), true, false)
    })

    it("HandleYouTubeStatus shows FORCED ON mode", () => {
        mockGetPollingStatus.mockReturnValueOnce({
            overrideMode: "force_on" as const,
            isPolling: true,
            isMonitoring: true,
            isTwitchLive: false,
        })

        const entry = functionMap.find(e => e.Command.includes("!youtube_status"))!
        entry.Function(makeMessage("!youtube_status"))

        const text = mockSend.mock.calls[0][0].message.text
        expect(text).toContain("FORCED ON")
        expect(text).toContain("Polling: YES")
    })

    it("HandleYouTubeStatus shows FORCED OFF mode", () => {
        mockGetPollingStatus.mockReturnValueOnce({
            overrideMode: "force_off" as const,
            isPolling: false,
            isMonitoring: false,
            isTwitchLive: true,
        })

        const entry = functionMap.find(e => e.Command.includes("!youtube_status"))!
        entry.Function(makeMessage("!youtube_status"))

        const text = mockSend.mock.calls[0][0].message.text
        expect(text).toContain("FORCED OFF")
        expect(text).toContain("Twitch Live: YES")
    })
})

describe("Integration routing - functionMap entry functions", () => {
    beforeEach(() => {
        mockHandleFollowAge.mockClear()
        mockHandleUptime.mockClear()
        mockRunAd.mockClear()
        mockGetCurrentSong.mockClear()
        mockAddSongToQueue.mockClear()
        mockGetSongYear.mockClear()
        mockIs2013Song.mockClear()
        mockHandleHaloRunsWr.mockClear()
        mockHandleWingman953Pb.mockClear()
        mockSetGame.mockClear()
        mockQueueQuiz.mockClear()
    })

    it("!followage routes to TwitchManager.handleFollowAge", () => {
        const entry = functionMap.find(e => e.Command.includes("!followage"))!
        entry.Function(makeMessage("!followage"))
        expect(mockHandleFollowAge).toHaveBeenCalledOnce()
    })

    it("!uptime routes to TwitchManager.handleUptime", () => {
        const entry = functionMap.find(e => e.Command.includes("!uptime"))!
        entry.Function(makeMessage("!uptime"))
        expect(mockHandleUptime).toHaveBeenCalledOnce()
    })

    it("!runad routes to TwitchManager.runAd", () => {
        const entry = functionMap.find(e => e.Command.includes("!runad"))!
        entry.Function(makeMessage("!runad"))
        expect(mockRunAd).toHaveBeenCalledOnce()
    })

    it("!song routes to SpotifyManager.getCurrentSong", () => {
        const entry = functionMap.find(e => e.Command.includes("!song"))!
        entry.Function(makeMessage("!song"))
        expect(mockGetCurrentSong).toHaveBeenCalledOnce()
    })

    it("!sr routes to SpotifyManager.addSongToQueue", () => {
        const entry = functionMap.find(e => e.Command.includes("!sr"))!
        entry.Function(makeMessage("!sr songname"))
        expect(mockAddSongToQueue).toHaveBeenCalledOnce()
    })

    it("!songyear routes to SpotifyManager.getSongYear", () => {
        const entry = functionMap.find(e => e.Command.includes("!songyear"))!
        entry.Function(makeMessage("!songyear"))
        expect(mockGetSongYear).toHaveBeenCalledOnce()
    })

    it("!2013 routes to SpotifyManager.is2013Song", () => {
        const entry = functionMap.find(e => e.Command.includes("!2013"))!
        entry.Function(makeMessage("!2013"))
        expect(mockIs2013Song).toHaveBeenCalledOnce()
    })

    it("!wr routes to HandleHaloRunsWr", () => {
        const entry = functionMap.find(e => e.Command.includes("!wr"))!
        entry.Function(makeMessage("!wr"))
        expect(mockHandleHaloRunsWr).toHaveBeenCalledOnce()
    })

    it("!pb routes to HandleWingman953Pb", () => {
        const entry = functionMap.find(e => e.Command.includes("!pb"))!
        entry.Function(makeMessage("!pb"))
        expect(mockHandleWingman953Pb).toHaveBeenCalledOnce()
    })

    it("!quizstart routes to QuizManager.queueQuiz", () => {
        const entry = functionMap.find(e => e.Command.includes("!quizstart"))!
        entry.Function(makeMessage("!quizstart"))
        expect(mockQueueQuiz).toHaveBeenCalledOnce()
    })

    it("!setsplittable routes to LiveSplitClient.setGame", () => {
        const entry = functionMap.find(e => e.Command.includes("!setsplittable"))!
        entry.Function(makeMessage("!setsplittable Halo CE"))
        expect(mockSetGame).toHaveBeenCalledOnce()
    })
})
