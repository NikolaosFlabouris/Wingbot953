import { describe, it, expect } from "vitest"
import { TimeSpan } from "../Server/TimeSpan"

describe("TimeSpan - Factory Methods", () => {
    describe("fromMilliseconds", () => {
        it("creates from positive milliseconds", () => {
            const ts = TimeSpan.fromMilliseconds(5000)
            expect(ts.totalMilliseconds).toBe(5000)
        })

        it("creates from zero", () => {
            const ts = TimeSpan.fromMilliseconds(0)
            expect(ts.totalMilliseconds).toBe(0)
        })

        it("creates from negative milliseconds", () => {
            const ts = TimeSpan.fromMilliseconds(-3000)
            expect(ts.totalMilliseconds).toBe(-3000)
        })
    })

    describe("fromSeconds", () => {
        it("converts seconds to milliseconds", () => {
            const ts = TimeSpan.fromSeconds(5)
            expect(ts.totalMilliseconds).toBe(5000)
        })

        it("handles fractional seconds", () => {
            const ts = TimeSpan.fromSeconds(1.5)
            expect(ts.totalMilliseconds).toBe(1500)
        })
    })

    describe("fromMinutes", () => {
        it("converts minutes to milliseconds", () => {
            const ts = TimeSpan.fromMinutes(2)
            expect(ts.totalMilliseconds).toBe(120000)
        })
    })

    describe("fromHours", () => {
        it("converts hours to milliseconds", () => {
            const ts = TimeSpan.fromHours(1)
            expect(ts.totalMilliseconds).toBe(3600000)
        })
    })

    describe("fromDays", () => {
        it("converts days to milliseconds", () => {
            const ts = TimeSpan.fromDays(1)
            expect(ts.totalMilliseconds).toBe(86400000)
        })
    })

    describe("fromTime (3 args: hours, minutes, seconds)", () => {
        it("creates from h:m:s", () => {
            const ts = TimeSpan.fromTime(1, 30, 45)
            expect(ts.totalMilliseconds).toBe(
                1 * 3600000 + 30 * 60000 + 45 * 1000
            )
        })

        it("creates zero timespan", () => {
            const ts = TimeSpan.fromTime(0, 0, 0)
            expect(ts.totalMilliseconds).toBe(0)
        })
    })

    describe("fromTime (5 args: days, hours, minutes, seconds, milliseconds)", () => {
        it("creates from all components", () => {
            const ts = TimeSpan.fromTime(1, 2, 30, 15, 500)
            expect(ts.totalMilliseconds).toBe(
                1 * 86400000 + 2 * 3600000 + 30 * 60000 + 15 * 1000 + 500
            )
        })

        it("creates with zero days", () => {
            const ts = TimeSpan.fromTime(0, 1, 0, 0, 0)
            expect(ts.totalMilliseconds).toBe(3600000)
        })
    })

    describe("NaN handling", () => {
        it("throws on NaN input", () => {
            expect(() => TimeSpan.fromSeconds(NaN)).toThrow("value can't be NaN")
            expect(() => TimeSpan.fromMilliseconds(NaN)).toThrow("value can't be NaN")
            expect(() => TimeSpan.fromMinutes(NaN)).toThrow("value can't be NaN")
            expect(() => TimeSpan.fromHours(NaN)).toThrow("value can't be NaN")
            expect(() => TimeSpan.fromDays(NaN)).toThrow("value can't be NaN")
        })
    })

    describe("static properties", () => {
        it("zero returns 0ms", () => {
            expect(TimeSpan.zero.totalMilliseconds).toBe(0)
        })

        it("maxValue has max safe integer ms", () => {
            expect(TimeSpan.maxValue.totalMilliseconds).toBe(Number.MAX_SAFE_INTEGER)
        })

        it("minValue has min safe integer ms", () => {
            expect(TimeSpan.minValue.totalMilliseconds).toBe(Number.MIN_SAFE_INTEGER)
        })
    })
})

describe("TimeSpan - Component Getters", () => {
    it("extracts days component", () => {
        // 2 days, 3 hours, 4 minutes, 5 seconds
        const ts = TimeSpan.fromTime(2, 3, 4, 5, 0)
        expect(ts.days).toBe(2)
    })

    it("extracts hours component (mod 24)", () => {
        const ts = TimeSpan.fromTime(1, 14, 30, 0, 0)
        expect(ts.hours).toBe(14)
    })

    it("extracts minutes component (mod 60)", () => {
        const ts = TimeSpan.fromTime(0, 45, 0)
        expect(ts.minutes).toBe(45)
    })

    it("extracts seconds component (mod 60)", () => {
        const ts = TimeSpan.fromSeconds(125)
        expect(ts.seconds).toBe(5)
    })

    it("extracts milliseconds component (mod 1000)", () => {
        const ts = TimeSpan.fromMilliseconds(2500)
        expect(ts.milliseconds).toBe(500)
    })
})

describe("TimeSpan - Total Getters", () => {
    it("totalDays for 2 days", () => {
        const ts = TimeSpan.fromDays(2)
        expect(ts.totalDays).toBe(2)
    })

    it("totalHours for 90 minutes", () => {
        const ts = TimeSpan.fromMinutes(90)
        expect(ts.totalHours).toBe(1.5)
    })

    it("totalMinutes for 2 hours", () => {
        const ts = TimeSpan.fromHours(2)
        expect(ts.totalMinutes).toBe(120)
    })

    it("totalSeconds for 5000ms", () => {
        const ts = TimeSpan.fromMilliseconds(5000)
        expect(ts.totalSeconds).toBe(5)
    })
})

describe("TimeSpan - Arithmetic", () => {
    describe("add", () => {
        it("adds two timespans", () => {
            const a = TimeSpan.fromSeconds(30)
            const b = TimeSpan.fromSeconds(45)
            const result = a.add(b)
            expect(result.totalSeconds).toBe(75)
        })

        it("does not mutate original", () => {
            const a = TimeSpan.fromSeconds(30)
            const b = TimeSpan.fromSeconds(45)
            a.add(b)
            expect(a.totalSeconds).toBe(30)
        })
    })

    describe("subtract", () => {
        it("subtracts two timespans", () => {
            const a = TimeSpan.fromSeconds(60)
            const b = TimeSpan.fromSeconds(25)
            const result = a.subtract(b)
            expect(result.totalSeconds).toBe(35)
        })

        it("can produce negative results", () => {
            const a = TimeSpan.fromSeconds(10)
            const b = TimeSpan.fromSeconds(30)
            const result = a.subtract(b)
            expect(result.totalSeconds).toBe(-20)
        })
    })

    describe("negate", () => {
        it("negates positive timespan", () => {
            const ts = TimeSpan.fromSeconds(30)
            const negated = ts.negate()
            expect(negated.totalSeconds).toBe(-30)
        })

        it("negates negative timespan", () => {
            const ts = TimeSpan.fromMilliseconds(-5000)
            const negated = ts.negate()
            expect(negated.totalMilliseconds).toBe(5000)
        })

        it("negating zero is zero", () => {
            const ts = TimeSpan.zero
            const negated = ts.negate()
            expect(negated.totalMilliseconds).toBe(-0)
        })
    })
})

describe("TimeSpan - String Formatting", () => {
    it("formats minutes and seconds", () => {
        const ts = TimeSpan.fromTime(0, 5, 30)
        expect(ts.string).toBe("05:30")
    })

    it("formats with hours", () => {
        const ts = TimeSpan.fromTime(1, 5, 30)
        expect(ts.string).toBe("1:05:30")
    })

    it("formats with days", () => {
        const ts = TimeSpan.fromTime(2, 3, 5, 30, 0)
        expect(ts.string).toBe("2:3:05:30")
    })

    it("formats with milliseconds when non-zero", () => {
        const ts = TimeSpan.fromTime(0, 0, 5, 30, 100)
        expect(ts.string).toBe("05:30.100")
    })

    it("omits milliseconds when zero", () => {
        const ts = TimeSpan.fromTime(0, 1, 30)
        expect(ts.string).toBe("01:30")
    })

    it("formats zero timespan", () => {
        const ts = TimeSpan.zero
        expect(ts.string).toBe("00:00")
    })

    it("pads minutes and seconds to 2 digits", () => {
        const ts = TimeSpan.fromTime(0, 1, 5)
        expect(ts.string).toBe("01:05")
    })

    it("pads milliseconds to 3 digits", () => {
        const ts = TimeSpan.fromTime(0, 0, 0, 5, 7)
        expect(ts.string).toBe("00:05.007")
    })
})

describe("TimeSpan - fromString parsing", () => {
    it("parses empty string as zero", () => {
        expect(TimeSpan.fromString("").totalMilliseconds).toBe(0)
    })

    it("parses '-' as zero", () => {
        expect(TimeSpan.fromString("-").totalMilliseconds).toBe(0)
    })

    it("parses seconds only", () => {
        const ts = TimeSpan.fromString("30")
        expect(ts.seconds).toBe(30)
    })

    it("parses minutes:seconds", () => {
        const ts = TimeSpan.fromString("5:30")
        expect(ts.minutes).toBe(5)
        expect(ts.seconds).toBe(30)
    })

    it("parses hours:minutes:seconds", () => {
        const ts = TimeSpan.fromString("1:05:30")
        expect(ts.hours).toBe(1)
        expect(ts.minutes).toBe(5)
        expect(ts.seconds).toBe(30)
    })

    it("parses seconds with fractional part", () => {
        const ts = TimeSpan.fromString("30.500")
        expect(ts.seconds).toBe(30)
        expect(ts.milliseconds).toBe(500)
    })

    it("parses minutes:seconds with fractional part", () => {
        const ts = TimeSpan.fromString("5:30.250")
        expect(ts.minutes).toBe(5)
        expect(ts.seconds).toBe(30)
        expect(ts.milliseconds).toBe(250)
    })

    it("parses negative time", () => {
        const ts = TimeSpan.fromString("-1:00:00")
        expect(ts.totalMilliseconds).toBeLessThan(0)
    })
})
