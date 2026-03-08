import { describe, it, expect } from "vitest"

import {
    parseSearchQuery,
    extractSpotifyTrackId,
    classifySongYear,
    canRequestSong,
} from "../Server/Integrations/SpotifyLogic"

describe("parseSearchQuery", () => {
    it("parses 'title by artist' format", () => {
        const result = parseSearchQuery("Bohemian Rhapsody by Queen")
        expect(result.title).toBe("Bohemian Rhapsody")
        expect(result.artist).toBe("Queen")
    })

    it("parses 'artist - title' format", () => {
        const result = parseSearchQuery("Queen - Bohemian Rhapsody")
        expect(result.title).toBe("Bohemian Rhapsody")
        expect(result.artist).toBe("Queen")
    })

    it("parses 'title (artist)' format", () => {
        const result = parseSearchQuery("Bohemian Rhapsody (Queen)")
        expect(result.title).toBe("Bohemian Rhapsody")
        expect(result.artist).toBe("Queen")
    })

    it("parses 'title [artist]' format", () => {
        const result = parseSearchQuery("Bohemian Rhapsody [Queen]")
        expect(result.title).toBe("Bohemian Rhapsody")
        expect(result.artist).toBe("Queen")
    })

    it("returns title only when no separator found", () => {
        const result = parseSearchQuery("Bohemian Rhapsody")
        expect(result.title).toBe("Bohemian Rhapsody")
        expect(result.artist).toBeUndefined()
    })

    it("handles 'by' case insensitively", () => {
        const result = parseSearchQuery("Song Title BY Artist Name")
        expect(result.title).toBe("Song Title")
        expect(result.artist).toBe("Artist Name")
    })

    it("trims whitespace from result", () => {
        const result = parseSearchQuery("  Song Title  by  Artist Name  ")
        expect(result.title).toBe("Song Title")
        expect(result.artist).toBe("Artist Name")
    })

    it("handles empty string", () => {
        const result = parseSearchQuery("")
        expect(result.title).toBe("")
    })

    it("handles whitespace-only string", () => {
        const result = parseSearchQuery("   ")
        expect(result.title).toBe("")
    })

    it("handles dash with no spaces", () => {
        const result = parseSearchQuery("Artist-Title")
        expect(result.title).toBe("Title")
        expect(result.artist).toBe("Artist")
    })

    it("returns full query as title when 'by' is at start (no preceding whitespace)", () => {
        // regex requires \s+ before "by", so "by artist" doesn't match - returned as title
        const result = parseSearchQuery("by artist")
        expect(result.title).toBe("by artist")
        expect(result.artist).toBeUndefined()
    })
})

describe("extractSpotifyTrackId", () => {
    it("extracts ID from open.spotify.com URL", () => {
        const result = extractSpotifyTrackId(
            "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=abc123"
        )
        expect(result).toBe("4cOdK2wGLETKBW3PvgPWqT")
    })

    it("extracts ID from spotify: URI", () => {
        const result = extractSpotifyTrackId("spotify:track:4cOdK2wGLETKBW3PvgPWqT")
        expect(result).toBe("4cOdK2wGLETKBW3PvgPWqT")
    })

    it("extracts ID from play.spotify.com URL", () => {
        const result = extractSpotifyTrackId(
            "https://play.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT"
        )
        expect(result).toBe("4cOdK2wGLETKBW3PvgPWqT")
    })

    it("returns null for non-Spotify URL", () => {
        expect(extractSpotifyTrackId("https://youtube.com/watch?v=abc123")).toBeNull()
    })

    it("returns null for empty string", () => {
        expect(extractSpotifyTrackId("")).toBeNull()
    })

    it("returns null for Spotify playlist URL", () => {
        expect(
            extractSpotifyTrackId("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M")
        ).toBeNull()
    })

    it("returns null for plain text", () => {
        expect(extractSpotifyTrackId("just some song name")).toBeNull()
    })

    it("extracts ID from URL without query params", () => {
        const result = extractSpotifyTrackId(
            "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT"
        )
        expect(result).toBe("4cOdK2wGLETKBW3PvgPWqT")
    })
})

describe("classifySongYear", () => {
    it("classifies 2013 as exact", () => {
        const result = classifySongYear(2013)
        expect(result.type).toBe("exact")
        expect(result.year).toBe(2013)
    })

    it("classifies 2011 as close", () => {
        const result = classifySongYear(2011)
        expect(result.type).toBe("close")
        expect(result.year).toBe(2011)
    })

    it("classifies 2012 as close", () => {
        const result = classifySongYear(2012)
        expect(result.type).toBe("close")
        expect(result.year).toBe(2012)
    })

    it("classifies 2014 as close", () => {
        const result = classifySongYear(2014)
        expect(result.type).toBe("close")
        expect(result.year).toBe(2014)
    })

    it("classifies 2010 as not2013", () => {
        const result = classifySongYear(2010)
        expect(result.type).toBe("not2013")
        expect(result.year).toBe(2010)
    })

    it("classifies 2015 as not2013", () => {
        const result = classifySongYear(2015)
        expect(result.type).toBe("not2013")
    })

    it("classifies 2000 as not2013", () => {
        const result = classifySongYear(2000)
        expect(result.type).toBe("not2013")
    })

    it("classifies 2024 as not2013", () => {
        const result = classifySongYear(2024)
        expect(result.type).toBe("not2013")
    })
})

describe("canRequestSong", () => {
    it("returns true for subscriber", () => {
        expect(canRequestSong({ isSubscriber: true })).toBe(true)
    })

    it("returns true for moderator", () => {
        expect(canRequestSong({ isModerator: true })).toBe(true)
    })

    it("returns true for owner", () => {
        expect(canRequestSong({ isOwner: true })).toBe(true)
    })

    it("returns false for regular user", () => {
        expect(canRequestSong({})).toBe(false)
    })

    it("returns false when all flags are false", () => {
        expect(
            canRequestSong({ isSubscriber: false, isModerator: false, isOwner: false })
        ).toBe(false)
    })

    it("returns true when subscriber and moderator", () => {
        expect(canRequestSong({ isSubscriber: true, isModerator: true })).toBe(true)
    })

    it("returns false for undefined flags", () => {
        expect(
            canRequestSong({ isSubscriber: undefined, isModerator: undefined, isOwner: undefined })
        ).toBe(false)
    })
})
