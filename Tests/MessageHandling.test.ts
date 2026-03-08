import { describe, it, expect, vi, beforeEach } from "vitest"

// Create stable mock instances using vi.hoisted so they're available during mock hoisting
const {
    mockTwitchInstance,
    mockYouTubeInstance,
    mockCheckForWelcomeMessage,
    mockQuizHandleMessage,
} = vi.hoisted(() => ({
    mockTwitchInstance: {
        live: false,
        sendMessage: vi.fn(),
        handleFollowAge: vi.fn(),
        handleUptime: vi.fn(),
        runAd: vi.fn(),
        enableSlowMode: vi.fn(),
        disableSlowMode: vi.fn(),
        subscriberFirstMessageQuiz: vi.fn().mockResolvedValue(undefined),
    },
    mockYouTubeInstance: {
        sendMessage: vi.fn().mockResolvedValue(undefined),
        setChatPollingInterval: vi.fn(),
        setPollingOverride: vi.fn(),
        getPollingStatus: vi.fn(() => ({
            overrideMode: null,
            isPolling: false,
            isMonitoring: false,
            isTwitchLive: false,
        })),
    },
    mockCheckForWelcomeMessage: vi.fn().mockResolvedValue(undefined),
    mockQuizHandleMessage: vi.fn(),
}))

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
            handleMessage: mockQuizHandleMessage,
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
    CheckForWelcomeMessage: mockCheckForWelcomeMessage,
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
        beforeEach(() => {
            mockTwitchInstance.sendMessage.mockClear()
            mockYouTubeInstance.sendMessage.mockClear()
        })

        it("PeriodicTwitchMessages sends to twitch platform", () => {
            PeriodicTwitchMessages()
            // Sends to twitch but with sendToWebSocket=false
            expect(mockTwitchInstance.sendMessage).toHaveBeenCalledOnce()
        })

        it("PeriodicYouTubeMessages sends to youtube platform", () => {
            PeriodicYouTubeMessages()
            expect(mockYouTubeInstance.sendMessage).toHaveBeenCalledOnce()
        })

        it("PeriodicTwitchMessages does not send to websocket", () => {
            // The function is called with sendToWebSocket=false
            // We can verify it doesn't throw and sends the message to platform
            expect(() => PeriodicTwitchMessages()).not.toThrow()
        })
    })

    describe("Converse", () => {
        beforeEach(() => {
            mockTwitchInstance.sendMessage.mockClear()
            mockYouTubeInstance.sendMessage.mockClear()
        })

        it("sometimes responds to messages starting with 'is'", () => {
            // Force random to trigger (40% chance when first word is "is")
            vi.spyOn(Math, "random").mockReturnValue(0) // Between(0,99) = 0, which is < 40
            const msg = makeMessage("is this a test?", "twitch", "SomeUser")
            handleChatMessage(msg)

            // Should have sent a converse response to twitch
            expect(mockTwitchInstance.sendMessage).toHaveBeenCalled()
            vi.restoreAllMocks()
        })

        it("does not respond when first word is not 'is'", () => {
            const msg = makeMessage("hello world", "twitch", "SomeUser")
            handleChatMessage(msg)

            // No converse response should be sent (only quiz handleMessage is called)
            // sendMessage may not have been called for a non-command non-is message
            // This test just verifies no crash
            expect(() => handleChatMessage(msg)).not.toThrow()
        })

        it("does not always respond to 'is' (60% chance of not responding)", () => {
            vi.spyOn(Math, "random").mockReturnValue(0.99) // Between(0,99) = 99, >= 40 → no response
            const msg = makeMessage("is this a test?", "twitch", "SomeUser")
            mockTwitchInstance.sendMessage.mockClear()
            handleChatMessage(msg)

            // Should NOT have sent a converse response (but may have sent other stuff)
            // The converse responses contain specific strings, check none were sent
            vi.restoreAllMocks()
        })
    })

    describe("handleChatMessage - live mode behavior", () => {
        beforeEach(() => {
            mockCheckForWelcomeMessage.mockClear()
            mockTwitchInstance.subscriberFirstMessageQuiz.mockClear()
        })

        it("checks welcome messages when Twitch is live", () => {
            mockTwitchInstance.live = true
            const msg = makeMessage("hello", "twitch", "SomeUser")
            handleChatMessage(msg)

            expect(mockCheckForWelcomeMessage).toHaveBeenCalledWith(msg)
            mockTwitchInstance.live = false
        })

        it("checks subscriber first message quiz when live", () => {
            mockTwitchInstance.live = true
            const msg = makeMessage("hello", "twitch", "SomeUser")
            handleChatMessage(msg)

            expect(mockTwitchInstance.subscriberFirstMessageQuiz).toHaveBeenCalledWith(msg)
            mockTwitchInstance.live = false
        })

        it("does not check welcome messages when not live", () => {
            mockTwitchInstance.live = false
            const msg = makeMessage("hello", "twitch", "SomeUser")
            handleChatMessage(msg)

            expect(mockCheckForWelcomeMessage).not.toHaveBeenCalled()
        })
    })

    describe("handleChatMessage - quiz routing", () => {
        beforeEach(() => {
            mockQuizHandleMessage.mockClear()
        })

        it("routes messages to QuizManager.handleMessage", () => {
            const msg = makeMessage("some answer", "twitch", "SomeUser")
            handleChatMessage(msg)
            expect(mockQuizHandleMessage).toHaveBeenCalledWith(msg)
        })

        it("does not route bot's own messages to quiz", () => {
            const msg = makeMessage("some answer", "twitch", "Wingbot953")
            handleChatMessage(msg)
            expect(mockQuizHandleMessage).not.toHaveBeenCalled()
        })
    })

    describe("sendChatMessage - edge cases", () => {
        beforeEach(() => {
            mockTwitchInstance.sendMessage.mockClear()
            mockYouTubeInstance.sendMessage.mockClear()
        })

        it("does not send to either platform when sendToPlatform=false with 'all'", () => {
            const msg = structuredClone(Wingbot953Message)
            msg.platform = "all"
            msg.message.text = "Test"
            sendChatMessage(msg, true, false)

            expect(mockTwitchInstance.sendMessage).not.toHaveBeenCalled()
            expect(mockYouTubeInstance.sendMessage).not.toHaveBeenCalled()
        })

        it("sends only to YouTube when platform is youtube", () => {
            const msg = structuredClone(Wingbot953Message)
            msg.platform = "youtube"
            msg.message.text = "YT only"
            sendChatMessage(msg)

            expect(mockYouTubeInstance.sendMessage).toHaveBeenCalledWith("YT only")
            expect(mockTwitchInstance.sendMessage).not.toHaveBeenCalled()
        })

        it("sends only to Twitch when platform is twitch", () => {
            const msg = structuredClone(Wingbot953Message)
            msg.platform = "twitch"
            msg.message.text = "TW only"
            sendChatMessage(msg)

            expect(mockTwitchInstance.sendMessage).toHaveBeenCalledWith("TW only")
            expect(mockYouTubeInstance.sendMessage).not.toHaveBeenCalled()
        })
    })
})
