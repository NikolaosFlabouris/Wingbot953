import { describe, it, expect, vi } from "vitest"

// Mock MessageHandling before importing commandMap
vi.mock("../Server/MessageHandling", () => ({
    sendChatMessage: vi.fn(),
    Wingbot953Message: {
        platform: "all" as const,
        channel: { name: "Wingman953" },
        author: { name: "Wingbot953", displayName: "Wingbot953" },
        message: { text: "" },
    },
}))

import { commandMap } from "../Server/Commands/GeneralCommands"

describe("GeneralCommands - commandMap structure", () => {
    it("is a non-empty array", () => {
        expect(Array.isArray(commandMap)).toBe(true)
        expect(commandMap.length).toBeGreaterThan(0)
    })

    it("every entry has a non-empty Command array", () => {
        for (const entry of commandMap) {
            expect(Array.isArray(entry.Command)).toBe(true)
            expect(entry.Command.length).toBeGreaterThan(0)
        }
    })

    it("every entry has a Message array (no Function entries in commandMap)", () => {
        for (const entry of commandMap) {
            expect(entry.Message).toBeDefined()
            expect(Array.isArray(entry.Message)).toBe(true)
            expect(entry.Message!.length).toBeGreaterThan(0)
        }
    })

    it("all command strings start with '!'", () => {
        for (const entry of commandMap) {
            for (const cmd of entry.Command) {
                expect(cmd.startsWith("!")).toBe(true)
            }
        }
    })

    it("all command strings are lowercase", () => {
        for (const entry of commandMap) {
            for (const cmd of entry.Command) {
                expect(cmd).toBe(cmd.toLowerCase())
            }
        }
    })

    it("has no duplicate primary commands across entries", () => {
        const allCommands: string[] = []
        for (const entry of commandMap) {
            for (const cmd of entry.Command) {
                allCommands.push(cmd)
            }
        }
        const unique = new Set(allCommands)
        expect(unique.size).toBe(allCommands.length)
    })

    it("AllMessages entries have Message arrays with content", () => {
        const allMessageEntries = commandMap.filter(
            (e) => "AllMessages" in e && e.AllMessages === true
        )
        for (const entry of allMessageEntries) {
            expect(entry.Message!.length).toBeGreaterThan(0)
        }
    })

    it("contains expected core commands", () => {
        const allCommands = commandMap.flatMap((e) => e.Command)
        expect(allCommands).toContain("!quiz")
        expect(allCommands).toContain("!discord")
        expect(allCommands).toContain("!faq")
        expect(allCommands).toContain("!lurk")
    })
})
