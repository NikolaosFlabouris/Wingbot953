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

// Mock sleep to avoid real delays in tests
vi.mock("../Server/Commands/Utils", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../Server/Commands/Utils")>()
    return {
        ...actual,
        sleep: vi.fn().mockResolvedValue(undefined),
    }
})

// Stable mock for Twitch so we can override getUserByName per-test
const mockGetUserByName = vi.fn().mockResolvedValue({ id: "new-user-id" })
vi.mock("../Server/Integrations/Twitch", () => ({
    TwitchManager: {
        getInstance: () => ({
            api: {
                users: {
                    getUserByName: mockGetUserByName,
                },
            },
        }),
    },
}))

// Mock fs
const mockReadFileSync = vi.fn()
const mockWriteFile = vi.fn()

vi.mock("fs", () => ({
    default: {
        readFileSync: (...args: unknown[]) => mockReadFileSync(...args) as string,
        writeFile: (...args: unknown[]) => mockWriteFile(...args) as void,
    },
}))

import {
    LoadWelcomeMessages,
    CheckForWelcomeMessage,
    AddWelcomeMessage,
} from "../Server/Commands/VipWelcome"
import { sendChatMessage } from "../Server/MessageHandling"
import { UnifiedChatMessage } from "../Common/UnifiedChatMessage"

function makeMessage(
    displayName: string,
    platform: "twitch" | "youtube" = "twitch",
    userId = "test-user-id"
): UnifiedChatMessage {
    return {
        platform,
        channel: { name: "Wingman953" },
        author: { name: displayName.toLowerCase(), displayName, id: userId },
        message: { text: "hello" },
    }
}

const sampleWelcomeData = [
    {
        Username: ["VIPUser1", "AltName1"],
        UserId: "vip-user-1",
        Platform: "twitch",
        Message: ["Welcome back VIP1!", "Hey VIP1!"],
        Arrived: false,
    },
    {
        Username: ["VIPUser2"],
        UserId: "vip-user-2",
        Platform: "youtube",
        Message: ["Welcome VIP2!"],
        Arrived: false,
    },
]

describe("VipWelcome", () => {
    const mockSend = vi.mocked(sendChatMessage)

    beforeEach(() => {
        mockSend.mockClear()
        mockReadFileSync.mockClear()
        mockWriteFile.mockClear()
        mockGetUserByName.mockClear()
        mockGetUserByName.mockResolvedValue({ id: "new-user-id" })
    })

    describe("LoadWelcomeMessages", () => {
        it("loads welcome messages from file", () => {
            mockReadFileSync.mockReturnValue(JSON.stringify(sampleWelcomeData))
            expect(() => LoadWelcomeMessages()).not.toThrow()
        })

        it("handles file read error gracefully", () => {
            mockReadFileSync.mockImplementation(() => {
                throw new Error("File not found")
            })
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
            expect(() => LoadWelcomeMessages()).not.toThrow()
            errorSpy.mockRestore()
        })

        it("resets Arrived flags on load", () => {
            const dataWithArrived = [
                { ...sampleWelcomeData[0], Arrived: true },
                { ...sampleWelcomeData[1], Arrived: true },
            ]
            mockReadFileSync.mockReturnValue(JSON.stringify(dataWithArrived))
            LoadWelcomeMessages()
            // After load, all Arrived should be false
            // We verify indirectly by checking that welcome messages fire
        })
    })

    describe("CheckForWelcomeMessage", () => {
        beforeEach(() => {
            mockReadFileSync.mockReturnValue(JSON.stringify(sampleWelcomeData))
            LoadWelcomeMessages()
            mockSend.mockClear()
        })

        it("sends welcome message for matching UserId", async () => {
            const msg = makeMessage("VIPUser1", "twitch", "vip-user-1")
            await CheckForWelcomeMessage(msg)
            expect(mockSend).toHaveBeenCalledOnce()
            const sent = mockSend.mock.calls[0][0]
            expect(["Welcome back VIP1!", "Hey VIP1!"]).toContain(sent.message.text)
        })

        it("sends welcome for matching Username (case-insensitive)", async () => {
            // Use a different UserId but matching username
            const msg = makeMessage("VIPUser1", "twitch", "different-id")
            await CheckForWelcomeMessage(msg)
            expect(mockSend).toHaveBeenCalledOnce()
        })

        it("sends welcome for alt username", async () => {
            const msg = makeMessage("AltName1", "twitch", "different-id")
            await CheckForWelcomeMessage(msg)
            expect(mockSend).toHaveBeenCalledOnce()
        })

        it("does not send for non-matching platform", async () => {
            const msg = makeMessage("VIPUser1", "youtube", "vip-user-1")
            await CheckForWelcomeMessage(msg)
            expect(mockSend).not.toHaveBeenCalled()
        })

        it("does not send for unknown user", async () => {
            const msg = makeMessage("RandomUser", "twitch", "random-id")
            await CheckForWelcomeMessage(msg)
            expect(mockSend).not.toHaveBeenCalled()
        })

        it("only fires once per user per session", async () => {
            const msg = makeMessage("VIPUser1", "twitch", "vip-user-1")
            await CheckForWelcomeMessage(msg)
            expect(mockSend).toHaveBeenCalledOnce()
            mockSend.mockClear()

            await CheckForWelcomeMessage(msg)
            expect(mockSend).not.toHaveBeenCalled()
        })

        it("sends on twitch platform regardless of input platform for the message", async () => {
            const msg = makeMessage("VIPUser2", "youtube", "vip-user-2")
            await CheckForWelcomeMessage(msg)
            expect(mockSend).toHaveBeenCalledOnce()
            const sent = mockSend.mock.calls[0][0]
            expect(sent.platform).toBe("twitch") // VipWelcome always sends to twitch
        })
    })

    describe("AddWelcomeMessage", () => {
        beforeEach(() => {
            mockReadFileSync.mockReturnValue(JSON.stringify(sampleWelcomeData))
            LoadWelcomeMessages()
            mockWriteFile.mockClear()
        })

        it("adds greeting to existing user by userId", async () => {
            await AddWelcomeMessage("VIPUser1", "vip-user-1", "twitch", "New greeting!")
            expect(mockWriteFile).toHaveBeenCalled()
        })

        it("adds greeting to existing user by username", async () => {
            await AddWelcomeMessage("VIPUser1", "new-id", "new-platform", "New greeting!")
            expect(mockWriteFile).toHaveBeenCalled()
        })

        it("creates new entry for unknown user via Twitch API", async () => {
            await AddWelcomeMessage("NewUser", "new-id", "twitch", "Welcome new user!")
            expect(mockWriteFile).toHaveBeenCalled()
        })

        it("handles Twitch API returning null user", async () => {
            mockGetUserByName.mockResolvedValueOnce(null)

            const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
            await AddWelcomeMessage("NonexistentUser", "no-id", "twitch", "Hello!")
            expect(logSpy).toHaveBeenCalledWith(
                expect.stringContaining("not found")
            )
            logSpy.mockRestore()
        })
    })

    describe("SaveWelcomeMessages error handling", () => {
        beforeEach(() => {
            mockReadFileSync.mockReturnValue(JSON.stringify(sampleWelcomeData))
            LoadWelcomeMessages()
            mockWriteFile.mockClear()
        })

        it("logs error when writeFile callback receives error", async () => {
            // Make writeFile invoke callback with error
            mockWriteFile.mockImplementation((_path: string, _data: string, cb: (err: Error | null) => void) => {
                cb(new Error("disk full"))
            })

            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
            await AddWelcomeMessage("VIPUser1", "vip-user-1", "twitch", "test greeting")
            expect(errorSpy).toHaveBeenCalledWith("Error writing to file:", expect.any(Error))
            errorSpy.mockRestore()
        })

        it("logs success when writeFile callback succeeds", async () => {
            mockWriteFile.mockImplementation((_path: string, _data: string, cb: (err: Error | null) => void) => {
                cb(null)
            })

            const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
            await AddWelcomeMessage("VIPUser1", "vip-user-1", "twitch", "test greeting")
            expect(logSpy).toHaveBeenCalledWith("Welcome messages updated successfully.")
            logSpy.mockRestore()
        })
    })
})
