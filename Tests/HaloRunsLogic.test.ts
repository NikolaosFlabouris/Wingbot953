import { describe, it, expect } from "vitest"

import {
    findCommandMatch,
    resolveHaloRunsNames,
    parseLeaderboardEntries,
    searchProfileForPb,
    type HrGlobalData,
    type HrProfileData,
    type HrLeaderboardData,
} from "../Server/Integrations/HaloRunsLogic"
import { TimeSpan } from "../Server/TimeSpan"

describe("findCommandMatch", () => {
    const testCommands: { [key: string]: string[] } = {
        GameA: ["Game Alpha", "ga", "gamea"],
        GameB: ["Game Beta", "gb", "gameb"],
        GameC: ["Game Charlie", "gc"],
    }

    it("returns canonical name for exact match", () => {
        expect(findCommandMatch(testCommands, "ga")).toBe("Game Alpha")
    })

    it("returns canonical name for full name match", () => {
        expect(findCommandMatch(testCommands, "game alpha")).toBe("Game Alpha")
    })

    it("matches case-insensitively", () => {
        expect(findCommandMatch(testCommands, "gb")).toBe("Game Beta")
    })

    it("returns empty string for no match", () => {
        expect(findCommandMatch(testCommands, "unknown")).toBe("")
    })

    it("returns empty string for empty command", () => {
        expect(findCommandMatch(testCommands, "")).toBe("")
    })

    it("returns empty string for empty command list", () => {
        expect(findCommandMatch({}, "ga")).toBe("")
    })

    it("always returns first element as canonical name", () => {
        expect(findCommandMatch(testCommands, "gameb")).toBe("Game Beta")
        expect(findCommandMatch(testCommands, "gc")).toBe("Game Charlie")
    })
})

describe("resolveHaloRunsNames", () => {
    it("resolves valid ODST solo fg easy", () => {
        const result = resolveHaloRunsNames("odst", "solo", "fg", "easy")
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.names[0]).toBe("Halo 3: ODST")
            expect(result.names[1]).toBe("Solo")
            expect(result.names[3]).toBe("Easy")
        }
    })

    it("returns error for invalid game", () => {
        const result = resolveHaloRunsNames("invalidgame", "solo", "fg", "easy")
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error).toBe("Failed to parse game")
        }
    })

    it("returns error for invalid category", () => {
        const result = resolveHaloRunsNames("odst", "invalidcat", "fg", "easy")
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error).toBe("Failed to parse category")
        }
    })

    it("returns error for invalid runnable segment", () => {
        const result = resolveHaloRunsNames("odst", "solo", "invalidseg", "easy")
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error).toBe("Failed to parse runnable segment")
        }
    })

    it("returns error for invalid difficulty", () => {
        const result = resolveHaloRunsNames("odst", "solo", "fg", "invaliddiff")
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error).toBe("Failed to parse difficulty")
        }
    })

    it("resolves various game abbreviations", () => {
        const games = [
            { abbrev: "ce", expected: "Halo CE" },
            { abbrev: "h2", expected: "Halo 2" },
            { abbrev: "h3", expected: "Halo 3" },
            { abbrev: "reach", expected: "Halo: Reach" },
            { abbrev: "h4", expected: "Halo 4" },
            { abbrev: "h5", expected: "Halo 5" },
            { abbrev: "infinite", expected: "Halo Infinite" },
        ]

        for (const { abbrev, expected } of games) {
            const result = resolveHaloRunsNames(abbrev, "solo", "fg", "easy")
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.names[0]).toBe(expected)
            }
        }
    })

    it("resolves all difficulty levels", () => {
        const diffs = [
            { abbrev: "easy", expected: "Easy" },
            { abbrev: "normal", expected: "Normal" },
            { abbrev: "heroic", expected: "Heroic" },
            { abbrev: "legendary", expected: "Legendary" },
        ]

        for (const { abbrev, expected } of diffs) {
            const result = resolveHaloRunsNames("odst", "solo", "fg", abbrev)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.names[3]).toBe(expected)
            }
        }
    })

    it("resolves category abbreviations", () => {
        const cats = [
            { abbrev: "solo", expected: "Solo" },
            { abbrev: "coop", expected: "Coop" },
        ]

        for (const { abbrev, expected } of cats) {
            const result = resolveHaloRunsNames("odst", abbrev, "fg", "easy")
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.names[1]).toBe(expected)
            }
        }
    })
})

describe("parseLeaderboardEntries", () => {
    it("returns maxValue time for empty entries", () => {
        const data: HrLeaderboardData = { Entries: [] }
        const result = parseLeaderboardEntries(data, "Game", "Cat", "Seg", "Diff")
        expect(result.Time).toStrictEqual(TimeSpan.maxValue)
        expect(result.GameName).toBe("Game")
    })

    it("parses single WR entry", () => {
        const data: HrLeaderboardData = {
            Entries: [
                {
                    Points: 100,
                    Duration: "3600",
                    Participants: [
                        { Username: "Player1", UserId: "id1", EvidenceLink: "https://video1" },
                    ],
                },
            ],
        }
        const result = parseLeaderboardEntries(data, "ODST", "Solo", "Full Game", "Easy")
        expect(result.Time.totalSeconds).toBe(3600)
        expect(result.Usernames).toBe("Player1")
        expect(result.Video).toBe("https://video1")
    })

    it("handles tied WR entries (same points)", () => {
        const data: HrLeaderboardData = {
            Entries: [
                {
                    Points: 100,
                    Duration: "3600",
                    Participants: [
                        { Username: "Player1", UserId: "id1", EvidenceLink: "https://video1" },
                    ],
                },
                {
                    Points: 100,
                    Duration: "3600",
                    Participants: [
                        { Username: "Player2", UserId: "id2", EvidenceLink: "https://video2" },
                    ],
                },
            ],
        }
        const result = parseLeaderboardEntries(data, "ODST", "Solo", "FG", "Easy")
        expect(result.Usernames).toContain("Player1")
        expect(result.Usernames).toContain("& Player2")
    })

    it("stops at non-tied entry", () => {
        const data: HrLeaderboardData = {
            Entries: [
                {
                    Points: 100,
                    Duration: "3600",
                    Participants: [
                        { Username: "Player1", UserId: "id1", EvidenceLink: "https://video1" },
                    ],
                },
                {
                    Points: 90,
                    Duration: "3700",
                    Participants: [
                        { Username: "Player2", UserId: "id2", EvidenceLink: "https://video2" },
                    ],
                },
            ],
        }
        const result = parseLeaderboardEntries(data, "ODST", "Solo", "FG", "Easy")
        expect(result.Usernames).toBe("Player1")
        expect(result.Usernames).not.toContain("Player2")
    })

    it("handles coop entry with multiple participants", () => {
        const data: HrLeaderboardData = {
            Entries: [
                {
                    Points: 100,
                    Duration: "1800",
                    Participants: [
                        { Username: "CoopPlayer1", UserId: "id1", EvidenceLink: "https://video1" },
                        { Username: "CoopPlayer2", UserId: "id2", EvidenceLink: "https://video2" },
                    ],
                },
            ],
        }
        const result = parseLeaderboardEntries(data, "ODST", "Coop", "FG", "Easy")
        expect(result.Usernames).toContain("CoopPlayer1")
        expect(result.Usernames).toContain("CoopPlayer2")
        expect(result.Time.totalSeconds).toBe(1800)
    })

    it("preserves game metadata in result", () => {
        const data: HrLeaderboardData = {
            Entries: [
                {
                    Points: 50,
                    Duration: "600",
                    Participants: [
                        { Username: "Speedrunner", UserId: "id1", EvidenceLink: "https://yt" },
                    ],
                },
            ],
        }
        const result = parseLeaderboardEntries(data, "Halo 3", "Solo", "Full Game", "Legendary")
        expect(result.GameName).toBe("Halo 3")
        expect(result.Category).toBe("Solo")
        expect(result.RunnableSegment).toBe("Full Game")
        expect(result.Difficulty).toBe("Legendary")
    })
})

describe("searchProfileForPb", () => {
    const mockGlobalData: HrGlobalData = {
        Games: [
            {
                Name: "Halo 3: ODST",
                Id: "game-odst",
                Categories: [{ Name: "Solo", Id: "cat-solo" }],
                RunnableSegments: [
                    { Name: "Full Game", Id: "seg-fg" },
                    { Name: "Tayari Plaza", Id: "seg-tp" },
                ],
                Difficulties: [
                    { Name: "Easy", Id: "diff-easy" },
                    { Name: "Legendary", Id: "diff-leg" },
                ],
            },
        ],
    }

    const ownerId = "owner-123"

    it("returns zero time when game not found", () => {
        const profileData: HrProfileData = { RunsByCategory: {} }
        const result = searchProfileForPb(
            mockGlobalData, profileData,
            "Nonexistent Game", "Solo", "Full Game", "Easy", ownerId
        )
        expect(result.Time).toStrictEqual(TimeSpan.zero)
    })

    it("returns zero time when segment not found", () => {
        const profileData: HrProfileData = { RunsByCategory: {} }
        const result = searchProfileForPb(
            mockGlobalData, profileData,
            "Halo 3: ODST", "Solo", "Nonexistent Segment", "Easy", ownerId
        )
        expect(result.Time).toStrictEqual(TimeSpan.zero)
    })

    it("returns zero time when difficulty not found", () => {
        const profileData: HrProfileData = { RunsByCategory: {} }
        const result = searchProfileForPb(
            mockGlobalData, profileData,
            "Halo 3: ODST", "Solo", "Full Game", "Nonexistent Diff", ownerId
        )
        expect(result.Time).toStrictEqual(TimeSpan.zero)
    })

    it("returns zero time when category has no runs", () => {
        const profileData: HrProfileData = {
            RunsByCategory: {},
        }
        const result = searchProfileForPb(
            mockGlobalData, profileData,
            "Halo 3: ODST", "Solo", "Full Game", "Easy", ownerId
        )
        expect(result.Time).toStrictEqual(TimeSpan.zero)
    })

    it("finds solo PB matching game/segment/difficulty", () => {
        const profileData: HrProfileData = {
            RunsByCategory: {
                Solo: [
                    {
                        GameId: "game-odst",
                        RunnableSegmentId: "seg-fg",
                        DifficultyId: "diff-easy",
                        Duration: "1200",
                        Participants: [
                            { Username: "Wingman953", UserId: ownerId, EvidenceLink: "https://vid" },
                        ],
                        RankInfo: { Rank: 5 },
                    },
                ],
            },
        }
        const result = searchProfileForPb(
            mockGlobalData, profileData,
            "Halo 3: ODST", "Solo", "Full Game", "Easy", ownerId
        )
        expect(result.Time.totalSeconds).toBe(1200)
        expect(result.Usernames).toBe("Wingman953")
        expect(result.Video).toBe("https://vid")
        expect(result.Rank).toBe(5)
    })

    it("skips non-matching runs for solo", () => {
        const profileData: HrProfileData = {
            RunsByCategory: {
                Solo: [
                    {
                        GameId: "game-odst",
                        RunnableSegmentId: "seg-tp",
                        DifficultyId: "diff-easy",
                        Duration: "300",
                        Participants: [
                            { Username: "Wingman953", UserId: ownerId, EvidenceLink: "https://vid1" },
                        ],
                        RankInfo: { Rank: 1 },
                    },
                    {
                        GameId: "game-odst",
                        RunnableSegmentId: "seg-fg",
                        DifficultyId: "diff-easy",
                        Duration: "1200",
                        Participants: [
                            { Username: "Wingman953", UserId: ownerId, EvidenceLink: "https://vid2" },
                        ],
                        RankInfo: { Rank: 5 },
                    },
                ],
            },
        }
        const result = searchProfileForPb(
            mockGlobalData, profileData,
            "Halo 3: ODST", "Solo", "Full Game", "Easy", ownerId
        )
        expect(result.Time.totalSeconds).toBe(1200)
        expect(result.Video).toBe("https://vid2")
    })

    it("finds best coop PB among multiple runs", () => {
        const profileData: HrProfileData = {
            RunsByCategory: {
                Coop: [
                    {
                        GameId: "game-odst",
                        RunnableSegmentId: "seg-fg",
                        DifficultyId: "diff-easy",
                        Duration: "2000",
                        Participants: [
                            { Username: "Wingman953", UserId: ownerId, EvidenceLink: "https://vid1" },
                            { Username: "Partner1", UserId: "p1", EvidenceLink: "https://vid1" },
                        ],
                        RankInfo: { Rank: 3 },
                    },
                    {
                        GameId: "game-odst",
                        RunnableSegmentId: "seg-fg",
                        DifficultyId: "diff-easy",
                        Duration: "1500",
                        Participants: [
                            { Username: "Wingman953", UserId: ownerId, EvidenceLink: "https://vid2" },
                            { Username: "Partner2", UserId: "p2", EvidenceLink: "https://vid2" },
                        ],
                        RankInfo: { Rank: 2 },
                    },
                ],
            },
        }
        const result = searchProfileForPb(
            mockGlobalData, profileData,
            "Halo 3: ODST", "Coop", "Full Game", "Easy", ownerId
        )
        expect(result.Time.totalSeconds).toBe(1500)
        expect(result.Usernames).toContain("Partner2")
        expect(result.Usernames).not.toContain("Wingman953")
        expect(result.Rank).toBe(2)
    })

    it("excludes owner from coop usernames", () => {
        const profileData: HrProfileData = {
            RunsByCategory: {
                Coop: [
                    {
                        GameId: "game-odst",
                        RunnableSegmentId: "seg-fg",
                        DifficultyId: "diff-easy",
                        Duration: "1800",
                        Participants: [
                            { Username: "Wingman953", UserId: ownerId, EvidenceLink: "https://vid" },
                            { Username: "CoopFriend", UserId: "friend-1", EvidenceLink: "https://vid" },
                        ],
                        RankInfo: { Rank: 1 },
                    },
                ],
            },
        }
        const result = searchProfileForPb(
            mockGlobalData, profileData,
            "Halo 3: ODST", "Coop", "Full Game", "Easy", ownerId
        )
        expect(result.Usernames).toContain("CoopFriend")
        expect(result.Usernames).not.toContain("Wingman953")
    })

    it("returns zero time when no coop runs match", () => {
        const profileData: HrProfileData = {
            RunsByCategory: {
                Coop: [
                    {
                        GameId: "game-odst",
                        RunnableSegmentId: "seg-tp",
                        DifficultyId: "diff-easy",
                        Duration: "300",
                        Participants: [
                            { Username: "Wingman953", UserId: ownerId, EvidenceLink: "https://vid" },
                            { Username: "Partner", UserId: "p1", EvidenceLink: "https://vid" },
                        ],
                        RankInfo: { Rank: 1 },
                    },
                ],
            },
        }
        const result = searchProfileForPb(
            mockGlobalData, profileData,
            "Halo 3: ODST", "Coop", "Full Game", "Easy", ownerId
        )
        expect(result.Time).toStrictEqual(TimeSpan.zero)
    })
})
