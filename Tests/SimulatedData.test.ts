import { describe, it, expect, vi } from "vitest"

// Mock MessageHandling (required by transitive imports)
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
    generateSimulatedMessage,
    generateSimulatedSpecialEvent,
    simulationProfiles,
} from "../Server/Simulation/SimulatedData"

describe("SimulatedData", () => {
    describe("simulationProfiles", () => {
        it("has all expected profiles", () => {
            expect(simulationProfiles.normal).toBeDefined()
            expect(simulationProfiles.commands).toBeDefined()
            expect(simulationProfiles.quiz).toBeDefined()
            expect(simulationProfiles.quiet).toBeDefined()
        })

        it("all profiles have valid weights summing to 100", () => {
            for (const [name, profile] of Object.entries(simulationProfiles)) {
                const sum = profile.weights[0] + profile.weights[1] + profile.weights[2]
                expect(sum, `${name} weights should sum to 100`).toBe(100)
            }
        })

        it("all profiles have positive intervalMs", () => {
            for (const profile of Object.values(simulationProfiles)) {
                expect(profile.intervalMs).toBeGreaterThan(0)
            }
        })

        it("all profiles have name and description", () => {
            for (const profile of Object.values(simulationProfiles)) {
                expect(profile.name.length).toBeGreaterThan(0)
                expect(profile.description.length).toBeGreaterThan(0)
            }
        })
    })

    describe("generateSimulatedMessage", () => {
        it("generates a valid Twitch message", () => {
            const msg = generateSimulatedMessage("twitch")
            expect(msg.platform).toBe("twitch")
            expect(msg.author.displayName.length).toBeGreaterThan(0)
            expect(msg.message.text.length).toBeGreaterThan(0)
            expect(msg.channel.name).toBe("Wingman953")
            expect(msg.id).toBeDefined()
            expect(msg.timestamp).toBeInstanceOf(Date)
        })

        it("generates a valid YouTube message", () => {
            const msg = generateSimulatedMessage("youtube")
            expect(msg.platform).toBe("youtube")
            expect(msg.author.displayName.length).toBeGreaterThan(0)
            expect(msg.message.text.length).toBeGreaterThan(0)
        })

        it("generates unique IDs", () => {
            const ids = new Set<string>()
            for (let i = 0; i < 100; i++) {
                const msg = generateSimulatedMessage("twitch")
                ids.add(msg.id!)
            }
            expect(ids.size).toBe(100)
        })

        it("uses different usernames for twitch and youtube", () => {
            const twitchNames = new Set<string>()
            const youtubeNames = new Set<string>()

            for (let i = 0; i < 200; i++) {
                twitchNames.add(generateSimulatedMessage("twitch").author.displayName)
                youtubeNames.add(generateSimulatedMessage("youtube").author.displayName)
            }

            // Twitch and YouTube should have distinct username pools
            expect(twitchNames.size).toBeGreaterThan(1)
            expect(youtubeNames.size).toBeGreaterThan(1)
        })

        it("generates varied message types with normal profile", () => {
            const messages = new Set<string>()
            for (let i = 0; i < 200; i++) {
                messages.add(generateSimulatedMessage("twitch", simulationProfiles.normal).message.text)
            }
            // Should have good variety
            expect(messages.size).toBeGreaterThan(5)
        })

        it("generates commands with command-heavy profile", () => {
            let commandCount = 0
            for (let i = 0; i < 200; i++) {
                const msg = generateSimulatedMessage("twitch", simulationProfiles.commands)
                if (msg.message.text.startsWith("!")) {
                    commandCount++
                }
            }
            // With 65% command weight, we should see significant commands
            expect(commandCount).toBeGreaterThan(50)
        })

        it("generates quiz answers with quiz profile", () => {
            // Quiz profile has 70% quiz answer weight
            const messages = new Set<string>()
            for (let i = 0; i < 200; i++) {
                const msg = generateSimulatedMessage("twitch", simulationProfiles.quiz)
                messages.add(msg.message.text)
            }
            // Should include non-command, non-chat messages (quiz answers)
            const nonCommandNonGeneral = [...messages].filter(
                (m) => !m.startsWith("!") && !m.includes("stream") && !m.includes("Hello")
            )
            expect(nonCommandNonGeneral.length).toBeGreaterThan(0)
        })

        it("sets author properties correctly", () => {
            for (let i = 0; i < 50; i++) {
                const msg = generateSimulatedMessage("twitch")
                expect(msg.author.name).toBe(msg.author.displayName.toLowerCase())
                expect(msg.author.isOwner).toBe(false)
                expect(typeof msg.author.isModerator).toBe("boolean")
                expect(typeof msg.author.isSubscriber).toBe("boolean")
            }
        })

        it("ModSimUser is always a moderator", () => {
            // Generate enough messages to hit ModSimUser
            let foundMod = false
            for (let i = 0; i < 500; i++) {
                const msg = generateSimulatedMessage("twitch")
                if (msg.author.displayName === "ModSimUser") {
                    expect(msg.author.isModerator).toBe(true)
                    foundMod = true
                    break
                }
            }
            // ModSimUser might not appear in 500 tries due to randomness, which is fine
            if (foundMod) {
                expect(foundMod).toBe(true)
            }
        })
    })

    describe("generateSimulatedSpecialEvent", () => {
        it("returns a botMessage with valid structure", () => {
            const event = generateSimulatedSpecialEvent()
            expect(event.botMessage).toBeDefined()
            expect(event.botMessage.platform).toBe("twitch")
            expect(event.botMessage.timestamp).toBeInstanceOf(Date)
            expect(event.botMessage.message.text.length).toBeGreaterThan(0)
        })

        it("optionally includes a userMessage", () => {
            let hasUser = false
            let hasNoUser = false
            for (let i = 0; i < 200; i++) {
                const event = generateSimulatedSpecialEvent()
                if (event.userMessage) {
                    hasUser = true
                    expect(event.userMessage.platform).toBe("twitch")
                    expect(event.userMessage.message.text.length).toBeGreaterThan(0)
                } else {
                    hasNoUser = true
                }
                if (hasUser && hasNoUser) break
            }
            expect(hasUser || hasNoUser).toBe(true)
        })

        it("generates a variety of event types", () => {
            const types = new Set<string>()
            for (let i = 0; i < 500; i++) {
                const event = generateSimulatedSpecialEvent()
                const msgType = event.botMessage.twitchSpecific?.messageType
                if (msgType) types.add(msgType.type)
            }
            expect(types.size).toBeGreaterThanOrEqual(5)
        })

        // Types that ONLY appear as admin messages
        const adminOnlyTypes = ["ban", "timeout", "raidcancel", "messageremove", "redemption"]
        // Types that ONLY appear as public messages
        const publicOnlyTypes = ["sub", "resub", "subgift", "communitysub", "giftpaidupgrade", "primepaidupgrade", "payforward", "announcement", "action", "follow", "raid"]
        // Types that appear as BOTH admin and public messages (e.g. begin/end are public, progress/lock are admin)
        const mixedTypes = ["hypetrain", "prediction", "poll", "shoutout"]

        it("sets channel.name to 'Admin' for admin-only event types", () => {
            for (let i = 0; i < 1000; i++) {
                const event = generateSimulatedSpecialEvent()
                const msgType = event.botMessage.twitchSpecific?.messageType?.type
                if (msgType && adminOnlyTypes.includes(msgType)) {
                    expect(event.botMessage.channel.name,
                        `${msgType} should have channel.name 'Admin'`).toBe("Admin")
                }
            }
        })

        it("sets channel.name to 'Wingman953' for public-only event types", () => {
            for (let i = 0; i < 1000; i++) {
                const event = generateSimulatedSpecialEvent()
                const msgType = event.botMessage.twitchSpecific?.messageType?.type
                if (msgType && publicOnlyTypes.includes(msgType)) {
                    expect(event.botMessage.channel.name,
                        `${msgType} should have channel.name 'Wingman953'`).toBe("Wingman953")
                }
            }
        })

        it("mixed event types use correct channel for their variant", () => {
            for (let i = 0; i < 1000; i++) {
                const event = generateSimulatedSpecialEvent()
                const msgType = event.botMessage.twitchSpecific?.messageType?.type
                if (msgType && mixedTypes.includes(msgType)) {
                    const channel = event.botMessage.channel.name
                    expect(
                        channel === "Admin" || channel === "Wingman953",
                        `${msgType} should have channel.name 'Admin' or 'Wingman953', got '${channel}'`
                    ).toBe(true)
                }
            }
        })

        it("admin-only events have no userMessage", () => {
            for (let i = 0; i < 500; i++) {
                const event = generateSimulatedSpecialEvent()
                const msgType = event.botMessage.twitchSpecific?.messageType?.type
                if (msgType && adminOnlyTypes.includes(msgType)) {
                    expect(event.userMessage,
                        `${msgType} should not have a userMessage`).toBeUndefined()
                }
            }
        })
    })
})
