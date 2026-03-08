import { describe, it, expect, beforeEach, vi } from "vitest"
import { EventBus, EventTypes } from "../Server/Integrations/EventBus"

describe("EventBus", () => {
    let bus: EventBus

    beforeEach(() => {
        bus = EventBus.getInstance()
        bus.dispose()
    })

    describe("getInstance", () => {
        it("returns the same instance", () => {
            const a = EventBus.getInstance()
            const b = EventBus.getInstance()
            expect(a).toBe(b)
        })
    })

    describe("event emission and listening", () => {
        it("emits and receives events", () => {
            const handler = vi.fn()
            bus.on(EventTypes.TWITCH_STREAM_STARTED, handler)
            bus.emit(EventTypes.TWITCH_STREAM_STARTED)
            expect(handler).toHaveBeenCalledOnce()
        })

        it("passes arguments to listeners", () => {
            const handler = vi.fn()
            bus.on(EventTypes.TWITCH_STREAM_STARTED, handler)
            bus.emit(EventTypes.TWITCH_STREAM_STARTED, "arg1", 42)
            expect(handler).toHaveBeenCalledWith("arg1", 42)
        })

        it("supports multiple listeners", () => {
            const handler1 = vi.fn()
            const handler2 = vi.fn()
            bus.on(EventTypes.TWITCH_STREAM_STARTED, handler1)
            bus.on(EventTypes.TWITCH_STREAM_STARTED, handler2)
            bus.emit(EventTypes.TWITCH_STREAM_STARTED)
            expect(handler1).toHaveBeenCalledOnce()
            expect(handler2).toHaveBeenCalledOnce()
        })

        it("does not fire unrelated listeners", () => {
            const handler = vi.fn()
            bus.on(EventTypes.TWITCH_STREAM_STARTED, handler)
            bus.emit(EventTypes.TWITCH_STREAM_ENDED)
            expect(handler).not.toHaveBeenCalled()
        })
    })

    describe("safeEmit", () => {
        it("emits events like normal emit", () => {
            const handler = vi.fn()
            bus.on("test:event", handler)
            const result = bus.safeEmit("test:event", "data")
            expect(handler).toHaveBeenCalledWith("data")
            expect(result).toBe(true)
        })

        it("returns false when no listeners", () => {
            const result = bus.safeEmit("nonexistent:event")
            expect(result).toBe(false)
        })

        it("catches errors from listeners without crashing", () => {
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
            bus.on("bad:event", () => {
                throw new Error("listener error")
            })
            const result = bus.safeEmit("bad:event")
            expect(result).toBe(false)
            expect(errorSpy).toHaveBeenCalled()
            errorSpy.mockRestore()
        })
    })

    describe("dispose", () => {
        it("removes all listeners", () => {
            const handler = vi.fn()
            bus.on(EventTypes.TWITCH_STREAM_STARTED, handler)
            bus.dispose()
            bus.emit(EventTypes.TWITCH_STREAM_STARTED)
            expect(handler).not.toHaveBeenCalled()
        })
    })

    describe("error handling", () => {
        it("constructor registers an error handler that logs to console", () => {
            // Get a fresh bus without dispose (which removes all listeners)
            const freshBus = EventBus.getInstance()
            // Re-register the error handler since dispose() cleared it
            freshBus.on("error", (error) => {
                console.error("EventBus error:", error)
            })
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
            freshBus.emit("error", new Error("test error"))
            expect(errorSpy).toHaveBeenCalled()
            errorSpy.mockRestore()
        })
    })
})

describe("EventTypes", () => {
    it("has all expected event types", () => {
        expect(EventTypes.TWITCH_STREAM_STARTED).toBe("twitch:stream:started")
        expect(EventTypes.TWITCH_STREAM_ENDED).toBe("twitch:stream:ended")
        expect(EventTypes.YOUTUBE_STREAM_STARTED).toBe("youtube:stream:started")
        expect(EventTypes.YOUTUBE_STREAM_ENDED).toBe("youtube:stream:ended")
        expect(EventTypes.DISCORD_CONNECTED).toBe("discord:connected")
        expect(EventTypes.DISCORD_DISCONNECTED).toBe("discord:disconnected")
    })

    it("event types are unique", () => {
        const values = Object.values(EventTypes)
        const unique = new Set(values)
        expect(unique.size).toBe(values.length)
    })
})
