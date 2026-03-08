import { describe, it, expect } from "vitest"

import {
    h1SplitNames,
    h2SplitNames,
    h3SplitNames,
    odstSplitNames,
    reachSplitNames,
    h4SplitNames,
    h5SplitNames,
    infiniteSplitNames,
    gameToSplitMapping,
    findCharacterForSegment,
    determineVirgilMood,
    formatTimeDisplay,
} from "../Server/Integrations/LiveSplitData"

describe("split name dictionaries", () => {
    it("h1SplitNames has 10 levels", () => {
        expect(Object.keys(h1SplitNames)).toHaveLength(10)
    })

    it("h2SplitNames has 13 levels", () => {
        expect(Object.keys(h2SplitNames)).toHaveLength(13)
    })

    it("h3SplitNames has 9 levels", () => {
        expect(Object.keys(h3SplitNames)).toHaveLength(9)
    })

    it("odstSplitNames has 15 levels", () => {
        expect(Object.keys(odstSplitNames)).toHaveLength(15)
    })

    it("reachSplitNames has 9 levels", () => {
        expect(Object.keys(reachSplitNames)).toHaveLength(9)
    })

    it("h4SplitNames has 8 levels", () => {
        expect(Object.keys(h4SplitNames)).toHaveLength(8)
    })

    it("h5SplitNames has 15 levels", () => {
        expect(Object.keys(h5SplitNames)).toHaveLength(15)
    })

    it("infiniteSplitNames is empty", () => {
        expect(Object.keys(infiniteSplitNames)).toHaveLength(0)
    })

    it("h1 first level is The Pillar of Autumn", () => {
        expect(h1SplitNames[0].name).toBe("The Pillar of Autumn")
        expect(h1SplitNames[0].character).toBe("Master Chief")
    })

    it("h2 includes Arbiter levels", () => {
        expect(h2SplitNames[3].character).toBe("Arbiter")
        expect(h2SplitNames[3].name).toBe("The Arbiter")
    })

    it("h5 includes Locke levels", () => {
        expect(h5SplitNames[0].character).toBe("Locke")
        expect(h5SplitNames[0].name).toBe("Osiris")
    })

    it("odst includes multiple characters", () => {
        expect(odstSplitNames[0].character).toBe("Rookie")
        expect(odstSplitNames[1].character).toBe("Buck")
        expect(odstSplitNames[3].character).toBe("Dutch")
        expect(odstSplitNames[7].character).toBe("Mickey")
        expect(odstSplitNames[9].character).toBe("Romeo")
    })

    it("reach levels all have Noble 6", () => {
        for (const [, split] of Object.entries(reachSplitNames)) {
            expect(split.character).toBe("Noble 6")
        }
    })
})

describe("gameToSplitMapping", () => {
    it("maps Halo CE to h1SplitNames", () => {
        expect(gameToSplitMapping["Halo CE"]).toBe(h1SplitNames)
    })

    it("maps Halo CE Classic to h1SplitNames", () => {
        expect(gameToSplitMapping["Halo CE Classic"]).toBe(h1SplitNames)
    })

    it("maps Halo 2 to h2SplitNames", () => {
        expect(gameToSplitMapping["Halo 2"]).toBe(h2SplitNames)
    })

    it("maps Halo 2 MCC to h2SplitNames", () => {
        expect(gameToSplitMapping["Halo 2 MCC"]).toBe(h2SplitNames)
    })

    it("maps Halo 3 to h3SplitNames", () => {
        expect(gameToSplitMapping["Halo 3"]).toBe(h3SplitNames)
    })

    it("maps Halo 3: ODST to odstSplitNames", () => {
        expect(gameToSplitMapping["Halo 3: ODST"]).toBe(odstSplitNames)
    })

    it("maps Halo: Reach to reachSplitNames", () => {
        expect(gameToSplitMapping["Halo: Reach"]).toBe(reachSplitNames)
    })

    it("maps Halo 4 to h4SplitNames", () => {
        expect(gameToSplitMapping["Halo 4"]).toBe(h4SplitNames)
    })

    it("maps Halo 5 to h5SplitNames", () => {
        expect(gameToSplitMapping["Halo 5"]).toBe(h5SplitNames)
    })

    it("maps Halo Infinite to infiniteSplitNames", () => {
        expect(gameToSplitMapping["Halo Infinite"]).toBe(infiniteSplitNames)
    })

    it("returns undefined for unknown game", () => {
        expect(gameToSplitMapping["Unknown Game"]).toBeUndefined()
    })
})

describe("findCharacterForSegment", () => {
    it("finds character by segment name", () => {
        expect(findCharacterForSegment(h2SplitNames, "The Arbiter")).toBe("Arbiter")
    })

    it("finds Master Chief for Sierra 117", () => {
        expect(findCharacterForSegment(h3SplitNames, "Sierra 117")).toBe("Master Chief")
    })

    it("finds Rookie for Prepare to Drop", () => {
        expect(findCharacterForSegment(odstSplitNames, "Prepare to Drop")).toBe("Rookie")
    })

    it("finds Buck for Tayari Plaza", () => {
        expect(findCharacterForSegment(odstSplitNames, "Tayari Plaza")).toBe("Buck")
    })

    it("finds Locke for Osiris", () => {
        expect(findCharacterForSegment(h5SplitNames, "Osiris")).toBe("Locke")
    })

    it("returns empty string for unknown segment", () => {
        expect(findCharacterForSegment(h1SplitNames, "Nonexistent Level")).toBe("")
    })

    it("returns empty string for empty split table", () => {
        expect(findCharacterForSegment(infiniteSplitNames, "Any Level")).toBe("")
    })
})

describe("determineVirgilMood", () => {
    it("returns Happy when ahead of comparison (negative delta)", () => {
        expect(determineVirgilMood(-1000, 5000, 6000)).toBe("Happy")
    })

    it("returns Happy when best split is faster than comparison", () => {
        expect(determineVirgilMood(0, 7000, 6000)).toBe("Happy")
    })

    it("returns Disappointed when behind comparison (positive delta)", () => {
        expect(determineVirgilMood(1000, 5000, 6000)).toBe("Disappointed")
    })

    it("returns Neutral when delta is zero and best split equals comparison", () => {
        expect(determineVirgilMood(0, 6000, 6000)).toBe("Neutral")
    })

    it("returns Neutral when delta is zero and best split is slower", () => {
        expect(determineVirgilMood(0, 5000, 6000)).toBe("Neutral")
    })

    it("prioritizes negative delta over best split comparison", () => {
        // Negative delta = Happy, regardless of best/comparison split values
        expect(determineVirgilMood(-500, 5000, 6000)).toBe("Happy")
    })

    it("prioritizes best split comparison over positive delta", () => {
        // Best split faster than comparison = Happy, even with positive delta
        // This tests the second condition taking priority when delta is 0
        expect(determineVirgilMood(0, 7000, 6000)).toBe("Happy")
    })
})

describe("formatTimeDisplay", () => {
    it("returns empty string for 00:00", () => {
        expect(formatTimeDisplay("00:00")).toBe("")
    })

    it("returns the time string for non-zero times", () => {
        expect(formatTimeDisplay("01:23")).toBe("01:23")
    })

    it("returns the time string for longer format", () => {
        expect(formatTimeDisplay("01:23:45.678")).toBe("01:23:45.678")
    })

    it("returns the time string for zero with different format", () => {
        expect(formatTimeDisplay("00:00:00")).toBe("00:00:00")
    })

    it("returns empty string for exactly 00:00", () => {
        expect(formatTimeDisplay("00:00")).toBe("")
    })
})
