import { describe, it, expect } from "vitest"

import {
    shouldStartPolling,
    shouldSkipApiPolling,
    shouldUpdatePollingInterval,
    microsToAmount,
    stripAtPrefix,
} from "../Server/Integrations/YouTubeLogic"

describe("shouldStartPolling", () => {
    it("returns false when already monitoring", () => {
        expect(shouldStartPolling("force_on", true, true)).toBe(false)
    })

    it("returns true when forced on and not monitoring", () => {
        expect(shouldStartPolling("force_on", false, false)).toBe(true)
    })

    it("returns true when forced on even if twitch is not live", () => {
        expect(shouldStartPolling("force_on", false, false)).toBe(true)
    })

    it("returns false when forced off", () => {
        expect(shouldStartPolling("force_off", true, false)).toBe(false)
    })

    it("returns false when forced off even if twitch is live", () => {
        expect(shouldStartPolling("force_off", true, false)).toBe(false)
    })

    it("returns true in auto mode when twitch is live", () => {
        expect(shouldStartPolling(null, true, false)).toBe(true)
    })

    it("returns false in auto mode when twitch is not live", () => {
        expect(shouldStartPolling(null, false, false)).toBe(false)
    })

    it("returns false in auto mode when monitoring even if twitch is live", () => {
        expect(shouldStartPolling(null, true, true)).toBe(false)
    })
})

describe("shouldSkipApiPolling", () => {
    it("returns true when already monitoring", () => {
        expect(shouldSkipApiPolling(null, true, true, false)).toBe(true)
    })

    it("returns true when forced off", () => {
        expect(shouldSkipApiPolling("force_off", true, false, true)).toBe(true)
    })

    it("returns false when forced on", () => {
        expect(shouldSkipApiPolling("force_on", false, false, true)).toBe(false)
    })

    it("returns false when forced on even if twitch not live", () => {
        expect(shouldSkipApiPolling("force_on", false, false, false)).toBe(false)
    })

    it("returns true in auto mode when twitch not live and has active interval", () => {
        expect(shouldSkipApiPolling(null, false, false, true)).toBe(true)
    })

    it("returns false in auto mode when twitch not live but no active interval (initial check)", () => {
        expect(shouldSkipApiPolling(null, false, false, false)).toBe(false)
    })

    it("returns false in auto mode when twitch is live", () => {
        expect(shouldSkipApiPolling(null, true, false, true)).toBe(false)
    })
})

describe("shouldUpdatePollingInterval", () => {
    it("returns false when recommended is null", () => {
        expect(shouldUpdatePollingInterval(null, 30000)).toBe(false)
    })

    it("returns false when recommended is undefined", () => {
        expect(shouldUpdatePollingInterval(undefined, 30000)).toBe(false)
    })

    it("returns false when recommended is 0 (falsy)", () => {
        expect(shouldUpdatePollingInterval(0, 30000)).toBe(false)
    })

    it("returns false when current interval is below custom threshold (quiz mode)", () => {
        expect(shouldUpdatePollingInterval(10000, 3000)).toBe(false)
    })

    it("returns false when current equals threshold exactly", () => {
        expect(shouldUpdatePollingInterval(10000, 5000)).toBe(false)
    })

    it("returns false when recommended is within delta of current", () => {
        expect(shouldUpdatePollingInterval(31000, 30000)).toBe(false)
    })

    it("returns false when recommended equals current", () => {
        expect(shouldUpdatePollingInterval(30000, 30000)).toBe(false)
    })

    it("returns true when recommended is more than 2000ms above current", () => {
        expect(shouldUpdatePollingInterval(33000, 30000)).toBe(true)
    })

    it("returns true when recommended is more than 2000ms below current", () => {
        expect(shouldUpdatePollingInterval(27000, 30000)).toBe(true)
    })

    it("returns false when difference is exactly 2000ms", () => {
        expect(shouldUpdatePollingInterval(32000, 30000)).toBe(false)
    })

    it("respects custom delta parameter", () => {
        expect(shouldUpdatePollingInterval(31500, 30000, 5000, 1000)).toBe(true)
        expect(shouldUpdatePollingInterval(30500, 30000, 5000, 1000)).toBe(false)
    })

    it("respects custom threshold parameter", () => {
        // Current is 3000 which is below default 5000 threshold → false
        expect(shouldUpdatePollingInterval(10000, 3000)).toBe(false)
        // But with lower threshold → true
        expect(shouldUpdatePollingInterval(10000, 3000, 2000)).toBe(true)
    })
})

describe("microsToAmount", () => {
    it("converts micros to dollars", () => {
        expect(microsToAmount("5000000")).toBe(5)
    })

    it("handles decimal amounts", () => {
        expect(microsToAmount("1990000")).toBeCloseTo(1.99)
    })

    it("handles zero", () => {
        expect(microsToAmount("0")).toBe(0)
    })

    it("handles empty string (defaults to 0)", () => {
        expect(microsToAmount("")).toBe(0)
    })

    it("handles large amounts", () => {
        expect(microsToAmount("100000000")).toBe(100)
    })
})

describe("stripAtPrefix", () => {
    it("removes leading @", () => {
        expect(stripAtPrefix("@Username")).toBe("Username")
    })

    it("returns unchanged if no @", () => {
        expect(stripAtPrefix("Username")).toBe("Username")
    })

    it("only removes first @", () => {
        expect(stripAtPrefix("@User@Name")).toBe("User@Name")
    })

    it("handles empty string", () => {
        expect(stripAtPrefix("")).toBe("")
    })
})
