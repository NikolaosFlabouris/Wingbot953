import { describe, it, expect } from "vitest"

import {
    escapeDiscordMarkdown,
    buildLeaderboardMessage,
    LeaderboardUser,
} from "../Server/Integrations/DiscordLogic"

describe("escapeDiscordMarkdown", () => {
    it("escapes asterisks", () => {
        expect(escapeDiscordMarkdown("*bold*")).toBe("\\*bold\\*")
    })

    it("escapes underscores", () => {
        expect(escapeDiscordMarkdown("_italic_")).toBe("\\_italic\\_")
    })

    it("escapes backticks", () => {
        expect(escapeDiscordMarkdown("`code`")).toBe("\\`code\\`")
    })

    it("escapes tildes", () => {
        expect(escapeDiscordMarkdown("~strikethrough~")).toBe("\\~strikethrough\\~")
    })

    it("escapes backslashes", () => {
        expect(escapeDiscordMarkdown("back\\slash")).toBe("back\\\\slash")
    })

    it("escapes multiple special characters", () => {
        expect(escapeDiscordMarkdown("*_`~\\")).toBe("\\*\\_\\`\\~\\\\")
    })

    it("leaves normal text unchanged", () => {
        expect(escapeDiscordMarkdown("Hello World 123")).toBe("Hello World 123")
    })

    it("handles empty string", () => {
        expect(escapeDiscordMarkdown("")).toBe("")
    })

    it("handles usernames with underscores", () => {
        expect(escapeDiscordMarkdown("user_name_123")).toBe("user\\_name\\_123")
    })
})

describe("buildLeaderboardMessage", () => {
    const sampleLeaderboard: LeaderboardUser[] = [
        { Username: "Alice", Platform: "twitch", Score: 100 },
        { Username: "Bob", Platform: "youtube", Score: 200 },
        { Username: "Charlie", Platform: "twitch", Score: 150 },
        { Username: "Diana", Platform: "twitch", Score: 50 },
        { Username: "Eve", Platform: "youtube", Score: 75 },
    ]

    it("filters users by platform", () => {
        const msg = buildLeaderboardMessage(
            sampleLeaderboard,
            "twitch",
            "Twitch Leaderboard"
        )
        expect(msg).toContain("Alice")
        expect(msg).toContain("Charlie")
        expect(msg).toContain("Diana")
        expect(msg).not.toContain("Bob")
        expect(msg).not.toContain("Eve")
    })

    it("sorts by score descending", () => {
        const msg = buildLeaderboardMessage(
            sampleLeaderboard,
            "twitch",
            "Twitch Leaderboard"
        )
        const aliceIdx = msg.indexOf("Alice")
        const charlieIdx = msg.indexOf("Charlie")
        const dianaIdx = msg.indexOf("Diana")
        // Charlie (150) before Alice (100) before Diana (50)
        expect(charlieIdx).toBeLessThan(aliceIdx)
        expect(aliceIdx).toBeLessThan(dianaIdx)
    })

    it("includes title wrapped in bold markdown", () => {
        const msg = buildLeaderboardMessage(
            sampleLeaderboard,
            "twitch",
            "My Title"
        )
        expect(msg).toContain("**My Title**")
    })

    it("includes numbered rankings", () => {
        const msg = buildLeaderboardMessage(
            sampleLeaderboard,
            "twitch",
            "Leaderboard"
        )
        expect(msg).toContain("1 - Charlie: 150pts")
        expect(msg).toContain("2 - Alice: 100pts")
        expect(msg).toContain("3 - Diana: 50pts")
    })

    it("escapes markdown in usernames", () => {
        const leaderboard: LeaderboardUser[] = [
            { Username: "user_with_underscores", Platform: "twitch", Score: 100 },
        ]
        const msg = buildLeaderboardMessage(
            leaderboard,
            "twitch",
            "Test"
        )
        expect(msg).toContain("user\\_with\\_underscores")
    })

    it("limits to maxUsers", () => {
        const msg = buildLeaderboardMessage(
            sampleLeaderboard,
            "twitch",
            "Leaderboard",
            2
        )
        expect(msg).toContain("Charlie")
        expect(msg).toContain("Alice")
        expect(msg).not.toContain("Diana")
    })

    it("defaults maxUsers to 50", () => {
        // With only 3 twitch users, all should appear
        const msg = buildLeaderboardMessage(
            sampleLeaderboard,
            "twitch",
            "Leaderboard"
        )
        expect(msg).toContain("Charlie")
        expect(msg).toContain("Alice")
        expect(msg).toContain("Diana")
    })

    it("handles empty leaderboard", () => {
        const msg = buildLeaderboardMessage(
            [],
            "twitch",
            "Empty"
        )
        expect(msg).toBe("**Empty**\n\n")
    })

    it("handles no users matching platform", () => {
        const msg = buildLeaderboardMessage(
            sampleLeaderboard,
            "discord",
            "No Match"
        )
        expect(msg).toBe("**No Match**\n\n")
    })

    it("handles users with undefined scores", () => {
        const leaderboard: LeaderboardUser[] = [
            { Username: "NoScore", Platform: "twitch" },
            { Username: "HasScore", Platform: "twitch", Score: 50 },
        ]
        const msg = buildLeaderboardMessage(
            leaderboard,
            "twitch",
            "Test"
        )
        // HasScore (50) should come before NoScore (0)
        expect(msg).toContain("1 - HasScore: 50pts")
        expect(msg).toContain("2 - NoScore: undefinedpts")
    })

    it("filters youtube users correctly", () => {
        const msg = buildLeaderboardMessage(
            sampleLeaderboard,
            "youtube",
            "YouTube Leaderboard"
        )
        expect(msg).toContain("Bob")
        expect(msg).toContain("Eve")
        expect(msg).not.toContain("Alice")
        expect(msg).not.toContain("Charlie")
    })
})
