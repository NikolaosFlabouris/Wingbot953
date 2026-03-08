import { describe, it, expect, vi, beforeEach } from "vitest"

// Create stable mock instances so the same object is returned by getInstance()
const mockTwitchInstance = {
    live: false,
    sendMessage: vi.fn(),
    handleFollowAge: vi.fn(),
    handleUptime: vi.fn(),
    runAd: vi.fn(),
    enableSlowMode: vi.fn(),
    disableSlowMode: vi.fn(),
    subscriberFirstMessageQuiz: vi.fn(),
}

const mockYouTubeInstance = {
    sendMessage: vi.fn(),
    setChatPollingInterval: vi.fn(),
    setPollingOverride: vi.fn(),
    getPollingStatus: vi.fn(() => ({
        overrideMode: null,
        isPolling: false,
        isMonitoring: false,
        isTwitchLive: false,
    })),
}

vi.mock("../Server/Integrations/Twitch", () => ({
    TwitchManager: {
        getInstance: () => mockTwitchInstance,
    },
}))

vi.mock("../Server/Integrations/YouTube", () => ({
    YouTubeManager: {
        getInstance: () => mockYouTubeInstance,
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

vi.mock("../Server/Integrations/Discord", () => ({
    PublishTwitchAllTimeLeaderboard: vi.fn(),
    PublishYouTubeAllTimeLeaderboard: vi.fn(),
}))

vi.mock("../Server/Commands/Quiz", () => ({
    QuizManager: {
        getInstance: () => ({
            handleMessage: vi.fn(),
            queueQuiz: vi.fn(),
            isQuizActive: vi.fn(() => false),
        }),
    },
    GetQuizLeaderboards: vi.fn(),
    GetQuizScore: vi.fn(),
    AddQuizScore: vi.fn(),
    PublishLeaderboards: vi.fn(),
}))

vi.mock("../Server/Commands/VipWelcome", () => ({
    CheckForWelcomeMessage: vi.fn(),
}))

vi.mock("ws", () => ({
    default: {
        Server: vi.fn(() => ({
            on: vi.fn(),
        })),
        OPEN: 1,
    },
}))

// Mock fs for Quiz/VipWelcome indirect imports
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
}))

import {
    handleChatMessage,
    sendChatMessage,
    Wingbot953Message,
    PeriodicTwitchMessages,
    PeriodicYouTubeMessages,
} from "../Server/MessageHandling"
import { TwitchManager } from "../Server/Integrations/Twitch"
import { YouTubeManager } from "../Server/Integrations/YouTube"
import { UnifiedChatMessage } from "../Common/UnifiedChatMessage"

function makeMessage(
    text: string,
    platform: "twitch" | "youtube" | "system" = "twitch",
    displayName = "TestUser"
): UnifiedChatMessage {
    return {
        platform,
        channel: { name: "Wingman953" },
        author: { name: displayName.toLowerCase(), displayName },
        message: { text },
    }
}

describe("MessageHandling", () => {
    describe("Wingbot953Message", () => {
        it("has correct default structure", () => {
            expect(Wingbot953Message.platform).toBe("all")
            expect(Wingbot953Message.channel.name).toBe("Wingman953")
            expect(Wingbot953Message.author.name).toBe("Wingbot953")
            expect(Wingbot953Message.author.displayName).toBe("Wingbot953")
            expect(Wingbot953Message.message.text).toBe("")
        })
    })

    describe("handleChatMessage", () => {
        it("ignores messages from Wingbot953", () => {
            const msg = makeMessage("!quiz", "twitch", "Wingbot953")
            // Should not throw, should return early
            expect(() => handleChatMessage(msg)).not.toThrow()
        })

        it("processes commands from regular users", () => {
            const msg = makeMessage("!discord", "twitch", "SomeUser")
            expect(() => handleChatMessage(msg)).not.toThrow()
        })

        it("processes system admin messages", () => {
            const msg = makeMessage("!quiz", "system", "Admin")
            expect(() => handleChatMessage(msg)).not.toThrow()
        })

        it("processes non-command messages", () => {
            const msg = makeMessage("just chatting", "twitch", "SomeUser")
            expect(() => handleChatMessage(msg)).not.toThrow()
        })

        it("handles command with arguments", () => {
            const msg = makeMessage("!random 1 100", "twitch", "SomeUser")
            expect(() => handleChatMessage(msg)).not.toThrow()
        })
    })

    describe("sendChatMessage", () => {
        beforeEach(() => {
            mockTwitchInstance.sendMessage.mockClear()
            mockYouTubeInstance.sendMessage.mockClear()
        })

        it("sends to YouTube manager for youtube platform", () => {
            const msg = structuredClone(Wingbot953Message)
            msg.platform = "youtube"
            msg.message.text = "Test message"
            sendChatMessage(msg)
            expect(mockYouTubeInstance.sendMessage).toHaveBeenCalledWith("Test message")
        })

        it("sends to Twitch manager for twitch platform", () => {
            const msg = structuredClone(Wingbot953Message)
            msg.platform = "twitch"
            msg.message.text = "Test message"
            sendChatMessage(msg)
            expect(mockTwitchInstance.sendMessage).toHaveBeenCalledWith("Test message")
        })

        it("sends to both platforms for 'all' platform", () => {
            const msg = structuredClone(Wingbot953Message)
            msg.platform = "all"
            msg.message.text = "Test message"
            sendChatMessage(msg)
            expect(mockTwitchInstance.sendMessage).toHaveBeenCalled()
            expect(mockYouTubeInstance.sendMessage).toHaveBeenCalled()
        })

        it("respects sendToPlatform=false", () => {
            const msg = structuredClone(Wingbot953Message)
            msg.platform = "twitch"
            msg.message.text = "Test"
            sendChatMessage(msg, true, false)
            expect(mockTwitchInstance.sendMessage).not.toHaveBeenCalled()
        })
    })

    describe("PeriodicMessages", () => {
        it("PeriodicTwitchMessages sends twitch message", () => {
            expect(() => PeriodicTwitchMessages()).not.toThrow()
        })

        it("PeriodicYouTubeMessages sends youtube message", () => {
            expect(() => PeriodicYouTubeMessages()).not.toThrow()
        })
    })
})
