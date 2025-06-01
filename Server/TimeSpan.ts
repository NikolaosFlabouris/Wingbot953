const MILLIS_PER_SECOND = 1000
const MILLIS_PER_MINUTE = MILLIS_PER_SECOND * 60 //     60,000
const MILLIS_PER_HOUR = MILLIS_PER_MINUTE * 60 //  3,600,000
const MILLIS_PER_DAY = MILLIS_PER_HOUR * 24 // 86,400,000

export class TimeSpan {
    private _millis: number

    private static interval(value: number, scale: number): TimeSpan {
        if (Number.isNaN(value)) {
            throw new Error("value can't be NaN")
        }

        const tmp = value * scale
        const millis = TimeSpan.round(tmp + (value >= 0 ? 0.5 : -0.5))
        if (
            millis > TimeSpan.maxValue.totalMilliseconds ||
            millis < TimeSpan.minValue.totalMilliseconds
        ) {
            throw new Error("TimeSpanTooLong")
        }

        return new TimeSpan(millis)
    }

    private static round(n: number): number {
        if (n < 0) {
            return Math.ceil(n)
        } else if (n > 0) {
            return Math.floor(n)
        }

        return 0
    }

    private static timeToMilliseconds(
        hour: number,
        minute: number,
        second: number
    ): number {
        const totalSeconds = hour * 3600 + minute * 60 + second
        if (
            totalSeconds > TimeSpan.maxValue.totalSeconds ||
            totalSeconds < TimeSpan.minValue.totalSeconds
        ) {
            throw new Error("TimeSpanTooLong")
        }

        return totalSeconds * MILLIS_PER_SECOND
    }

    public static get zero(): TimeSpan {
        return new TimeSpan(0)
    }

    public static get maxValue(): TimeSpan {
        return new TimeSpan(Number.MAX_SAFE_INTEGER)
    }

    public static get minValue(): TimeSpan {
        return new TimeSpan(Number.MIN_SAFE_INTEGER)
    }

    public static fromDays(value: number): TimeSpan {
        return TimeSpan.interval(value, MILLIS_PER_DAY)
    }

    public static fromHours(value: number): TimeSpan {
        return TimeSpan.interval(value, MILLIS_PER_HOUR)
    }

    public static fromMilliseconds(value: number): TimeSpan {
        return TimeSpan.interval(value, 1)
    }

    public static fromMinutes(value: number): TimeSpan {
        return TimeSpan.interval(value, MILLIS_PER_MINUTE)
    }

    public static fromSeconds(value: number): TimeSpan {
        return TimeSpan.interval(value, MILLIS_PER_SECOND)
    }

    public static fromString(value: string): TimeSpan {
        // Handle empty string or just "-" case
        if (!value || value === "-") {
            return new TimeSpan(0)
        }

        // Check if the timespan is negative
        const isNegative = value.startsWith("-")
        if (isNegative) {
            value = value.substring(1)
        }

        // Split by colons to handle the [[[d.]hh:]mm:]ss parts
        const parts = value.split(":")
        let days = 0
        let hours = 0
        let minutes = 0
        let seconds = 0
        let milliseconds = 0

        // Process the parts based on how many we have
        if (parts.length === 1) {
            // Just seconds (possibly with fractions): ss[.fffffff]
            const secondsParts = parts[0].split(".")
            seconds = parseInt(secondsParts[0], 10) || 0
            if (secondsParts.length > 1) {
                // Convert fractional seconds to milliseconds (handling up to 7 decimal places)
                const fraction = secondsParts[1].padEnd(7, "0").substring(0, 7)
                milliseconds = parseInt(fraction.substring(0, 3), 10) || 0
            }
        } else if (parts.length === 2) {
            // Minutes and seconds: mm:ss[.fffffff]
            minutes = parseInt(parts[0], 10) || 0
            const secondsParts = parts[1].split(".")
            seconds = parseInt(secondsParts[0], 10) || 0
            if (secondsParts.length > 1) {
                const fraction = secondsParts[1].padEnd(7, "0").substring(0, 7)
                milliseconds = parseInt(fraction.substring(0, 3), 10) || 0
            }
        } else if (parts.length === 3) {
            // Hours, minutes, and seconds: hh:mm:ss[.fffffff]
            hours = parseInt(parts[0], 10) || 0
            minutes = parseInt(parts[1], 10) || 0
            const secondsParts = parts[2].split(".")
            seconds = parseInt(secondsParts[0], 10) || 0
            if (secondsParts.length > 1) {
                const fraction = secondsParts[1].padEnd(7, "0").substring(0, 7)
                milliseconds = parseInt(fraction.substring(0, 3), 10) || 0
            }
        } else if (parts.length >= 4) {
            // Days, hours, minutes, and seconds: d.hh:mm:ss[.fffffff]
            const dayHourParts = parts[0].split(".")
            if (dayHourParts.length > 1) {
                days = parseInt(dayHourParts[0], 10) || 0
                hours = parseInt(dayHourParts[1], 10) || 0
            } else {
                hours = parseInt(parts[0], 10) || 0
            }
            minutes = parseInt(parts[1], 10) || 0
            const secondsParts = parts[parts.length - 1].split(".")
            seconds = parseInt(secondsParts[0], 10) || 0
            if (secondsParts.length > 1) {
                const fraction = secondsParts[1].padEnd(7, "0").substring(0, 7)
                milliseconds = parseInt(fraction.substring(0, 3), 10) || 0
            }
        }

        // Create TimeSpan from calculated values
        let result = TimeSpan.fromTime(
            days,
            hours,
            minutes,
            seconds,
            milliseconds
        )
        if (days > 0) {
            result = result.add(TimeSpan.fromDays(days))
        }

        // Apply negative sign if needed
        return isNegative ? result.negate() : result
    }

    /**
     * Returns a new TimeSpan with the same duration but opposite sign.
     * @returns A new TimeSpan representing the negated value of this instance.
     */
    public negate(): TimeSpan {
        // Create a new TimeSpan with the negated total milliseconds
        return new TimeSpan(-this.totalMilliseconds)
    }

    public static fromTime(
        hours: number,
        minutes: number,
        seconds: number
    ): TimeSpan
    public static fromTime(
        days: number,
        hours: number,
        minutes: number,
        seconds: number,
        milliseconds: number
    ): TimeSpan
    public static fromTime(
        daysOrHours: number,
        hoursOrMinutes: number,
        minutesOrSeconds: number,
        seconds?: number,
        milliseconds?: number
    ): TimeSpan {
        if (milliseconds != undefined) {
            return this.fromTimeStartingFromDays(
                daysOrHours,
                hoursOrMinutes,
                minutesOrSeconds,
                seconds,
                milliseconds
            )
        } else {
            return this.fromTimeStartingFromHours(
                daysOrHours,
                hoursOrMinutes,
                minutesOrSeconds
            )
        }
    }

    private static fromTimeStartingFromHours(
        hours: number,
        minutes: number,
        seconds: number
    ): TimeSpan {
        const millis = TimeSpan.timeToMilliseconds(hours, minutes, seconds)
        return new TimeSpan(millis)
    }

    private static fromTimeStartingFromDays(
        days: number,
        hours: number,
        minutes: number,
        seconds: number = 0,
        milliseconds: number = 0
    ): TimeSpan {
        const totalMilliSeconds =
            days * MILLIS_PER_DAY +
            hours * MILLIS_PER_HOUR +
            minutes * MILLIS_PER_MINUTE +
            seconds * MILLIS_PER_SECOND +
            milliseconds

        if (
            totalMilliSeconds > TimeSpan.maxValue.totalMilliseconds ||
            totalMilliSeconds < TimeSpan.minValue.totalMilliseconds
        ) {
            throw new Error("TimeSpanTooLong")
        }
        return new TimeSpan(totalMilliSeconds)
    }

    constructor(millis: number) {
        this._millis = millis
    }

    public get days(): number {
        return TimeSpan.round(this._millis / MILLIS_PER_DAY)
    }

    public get hours(): number {
        return TimeSpan.round((this._millis / MILLIS_PER_HOUR) % 24)
    }

    public get minutes(): number {
        return TimeSpan.round((this._millis / MILLIS_PER_MINUTE) % 60)
    }

    public get seconds(): number {
        return TimeSpan.round((this._millis / MILLIS_PER_SECOND) % 60)
    }

    public get milliseconds(): number {
        return TimeSpan.round(this._millis % 1000)
    }

    public get totalDays(): number {
        return this._millis / MILLIS_PER_DAY
    }

    public get totalHours(): number {
        return this._millis / MILLIS_PER_HOUR
    }

    public get totalMinutes(): number {
        return this._millis / MILLIS_PER_MINUTE
    }

    public get totalSeconds(): number {
        return this._millis / MILLIS_PER_SECOND
    }

    public get totalMilliseconds(): number {
        return this._millis
    }

    public add(ts: TimeSpan): TimeSpan {
        const result = this._millis + ts.totalMilliseconds
        return new TimeSpan(result)
    }

    public subtract(ts: TimeSpan): TimeSpan {
        const result = this._millis - ts.totalMilliseconds
        return new TimeSpan(result)
    }

    public get string(): string {
        const parts: string[] = []

        if (this.days > 0) {
            parts.push(`${this.days}`) // No padStart for days
        }

        if (this.days > 0 || this.hours > 0) {
            parts.push(`${this.hours}`) // No padStart for hours
        }

        // Always include minutes (no padStart)
        parts.push(`${this.minutes}`)

        // Always include seconds
        parts.push(`${this.seconds.toString().padStart(2, "0")}`)

        // Build the base string
        let result = parts.join(":")

        // Add milliseconds if non-zero
        if (this.milliseconds > 0) {
            result += `.${this.milliseconds.toString().padStart(3, "0")}`
        }

        return result
    }
}
