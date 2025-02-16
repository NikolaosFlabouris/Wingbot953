import SpotifyWebApi from "spotify-web-api-node"
import Fuse from "fuse.js"
import open from "open"
import { SendMessage, isLive } from "./Twitch.js"
import "dotenv/config"

import express = require("express")
import { TwitchPrivateMessage } from "@twurple/chat/lib/commands/TwitchPrivateMessage.js"

const scopes: Array<string> = [
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing",
    "playlist-read-private",
]

let spotifyApi: SpotifyWebApi

export async function SpotifySetup(server: express.Application) {
    spotifyApi = new SpotifyWebApi({
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        redirectUri: process.env.SPOTIFY_REDIRECT_URI,
    })

    const authorizeURL = spotifyApi.createAuthorizeURL(
        scopes,
        "Wingbot953Integration"
    )

    server.get(
        "/spotify/callback",
        function (req: express.Request, res: express.Response) {
            console.log("Spotify Callback received")

            spotifyApi.authorizationCodeGrant(req.query.code as string).then(
                function (data) {
                    // Set the access token on the API object to use it in later calls
                    spotifyApi.setAccessToken(data.body["access_token"])
                    spotifyApi.setRefreshToken(data.body["refresh_token"])
                    const tokenRefreshInterval = setInterval(
                        RefreshToken,
                        data.body["expires_in"] * 1000
                    )

                    console.log("SpotifyAPI setup complete.")
                },
                function (err: any) {
                    console.log(
                        "Something went wrong with authorizationCodeGrant!",
                        err
                    )
                }
            )
        }
    )

    open(authorizeURL)
}

function RefreshToken() {
    spotifyApi.refreshAccessToken().then(
        function (data) {
            console.log("The access token has been refreshed!")

            // Save the access token so that it's used in future calls
            spotifyApi.setAccessToken(data.body["access_token"])
        },
        function (err) {
            console.log("Could not refresh access token", err)
        }
    )
}

export async function GetCurrentSong() {
    // if (!isLive) {
    //     SendMessage("!song", "No song is currently playing.")
    //     return
    // }

    const currentTrack = await getCurrentlyPlaying()
    if (currentTrack) {
        SendMessage(
            "!song",
            `Currently playing: ${
                currentTrack.name
            } by ${currentTrack.artists.join(", ")}`
        )
    } else {
        SendMessage("!song", "No song is currently playing.")
    }
}

interface CurrentTrack {
    name: string
    artists: string[]
    id: string
    albumName: string
    albumArt: string | null
    isPlaying: boolean
}

/**
 * Get the currently playing track
 * @returns Current track information or null if nothing is playing
 */
async function getCurrentlyPlaying(): Promise<CurrentTrack | null> {
    try {
        const response = await spotifyApi.getMyCurrentPlayingTrack()

        if (
            !response.body ||
            !response.body.item ||
            response.body.item.type !== "track"
        ) {
            return null
        }

        const track = response.body.item
        return {
            name: track.name,
            artists: track.artists.map((artist) => artist.name),
            id: track.id,
            albumName: track.album.name,
            albumArt: track.album.images[0]?.url || null,
            isPlaying: response.body.is_playing,
        }
    } catch (error) {
        console.error(
            "Something went wrong with getMyCurrentPlayingTrack:",
            error
        )
        return null
    }
}

/**
 * Finds a playlist by name in the current user's playlists
 * @param playlistName The name of the playlist to find
 * @returns The playlist ID if found, null otherwise
 */
async function findPlaylistByName(
    playlistName: string
): Promise<string | null> {
    try {
        let offset = 0
        const limit = 50

        while (true) {
            const response = await spotifyApi.getUserPlaylists({
                limit,
                offset,
            })

            if (!response.body.items.length) {
                break
            }

            const playlist = response.body.items.find(
                (p) => p.name.toLowerCase() === playlistName.toLowerCase()
            )

            if (playlist) {
                return playlist.id
            }

            offset += limit

            if (offset >= response.body.total) {
                break
            }
        }

        return null
    } catch (error) {
        console.error("Error finding playlist:", error)
        return null
    }
}

/**
 * Gets all tracks from a playlist
 * @param playlistId The Spotify playlist ID
 * @returns Array of track objects
 */
async function getAllPlaylistTracks(
    playlistId: string
): Promise<SpotifyApi.PlaylistTrackObject[]> {
    const tracks: SpotifyApi.PlaylistTrackObject[] = []
    let offset = 0
    const limit = 100

    while (true) {
        const response = await spotifyApi.getPlaylistTracks(playlistId, {
            limit,
            offset,
        })

        tracks.push(...response.body.items)

        offset += limit
        if (offset >= response.body.total) {
            break
        }
    }

    return tracks
}

/**
 * Gets random tracks from a playlist specified by name
 * @param playlistName Name of the playlist to search for
 * @returns Array of 7 random tracks or null if playlist not found
 */
async function getRandomTracksFromPlaylistByName(
    playlistName: string,
    numberOfTracks: number
): Promise<Array<{ id: string; name: string; artists: string[] }> | null> {
    try {
        const playlistId = await findPlaylistByName(playlistName)

        if (!playlistId) {
            console.error(`Playlist "${playlistName}" not found`)
            return null
        }

        const allTracks = await getAllPlaylistTracks(playlistId)
        const validTracks = allTracks.filter((item) => item.track !== null)
        const selectedTracks: SpotifyApi.PlaylistTrackObject[] = []
        const tracksCopy = [...validTracks]

        // Select random tracks or all tracks if less than the requested number
        const numTracksToSelect = Math.min(numberOfTracks, tracksCopy.length)

        for (let i = 0; i < numTracksToSelect; i++) {
            const randomIndex = Math.floor(Math.random() * tracksCopy.length)
            const selectedTrack = tracksCopy.splice(randomIndex, 1)[0]
            selectedTracks.push(selectedTrack)
        }

        return selectedTracks.map((item) => {
            if (!item.track) {
                console.error(
                    "Error getting random tracks:",
                    "Unexpected null track found"
                )
            }
            return {
                id: item.track!.id,
                name: item.track!.name,
                artists: item.track!.artists.map((artist) => artist.name),
            }
        })
    } catch (error) {
        console.error("Error getting random tracks:", error)
        return null
    }
}

export async function AddTracksFromPlaylistToQueue(
    playlistName: string,
    numberOfTracks: number
) {
    try {
        const randomTracks = await getRandomTracksFromPlaylistByName(
            playlistName,
            numberOfTracks
        )

        if (randomTracks) {
            console.log(
                `* Randomly selected ${numberOfTracks} from playlist "${playlistName}":`
            )
            randomTracks.forEach((track) => {
                spotifyApi.addToQueue(`spotify:track:${track.id}`)
            })
        }
    } catch (error) {
        console.error("Error in getRandomTracksFromPlaylist: ", error)
    }
}

interface ParsedQuery {
    title: string
    artist?: string
}

interface SpotifyTrack {
    id: string
    name: string
    artists: { name: string }[]
    uri: string
}

/**
 * Parses a search query into title and artist components
 * Handles various formats like:
 * - "title by artist"
 * - "artist - title"
 * - "title (artist)"
 */
function parseQuery(query: string): ParsedQuery {
    // Common separators between title and artist
    const separators = [
        { regex: /\s+by\s+/i, artistSecond: true },
        { regex: /\s*-\s*/, artistSecond: false },
        { regex: /\s*[(\[{]/i, artistSecond: true },
    ]

    for (const { regex, artistSecond } of separators) {
        const parts = query.split(regex)
        if (parts.length === 2) {
            let title = parts[artistSecond ? 0 : 1].trim()
            let artist = parts[artistSecond ? 1 : 0].trim()

            // Remove closing brackets if present
            artist = artist.replace(/[)\]}]$/, "").trim()

            return { title, artist }
        }
    }

    // If no separator is found, assume the entire query is the title
    return { title: query.trim() }
}

/**
 * Performs a fuzzy search for a song and adds the best match to the queue
 * @param query The search query (song name)
 * @returns Promise with the added track or null if no match found
 */
export async function FuzzySearchAndQueue(msg: TwitchPrivateMessage) {
    var originalMessage = msg.content.value
    const indexOfSpace = originalMessage.indexOf(" ")

    if (indexOfSpace === -1) {
        SendMessage("!sr", "Format: !sr <song name> by <artist>")
        return
    }

    var query =
        indexOfSpace === -1
            ? originalMessage
            : originalMessage.substring(indexOfSpace + 1)

    // if (!isLive) {
    //     SendMessage("!sr", "Cannot add song to queue right now.")
    //     return
    // }

    try {
        const parsedQuery = parseQuery(query)

        // Construct Spotify search query
        let spotifyQuery = parsedQuery.title
        if (parsedQuery.artist) {
            spotifyQuery += ` artist:${parsedQuery.artist}`
        }

        // Get potential matches from Spotify
        const searchResults = await spotifyApi.searchTracks(spotifyQuery, {
            limit: 20,
        })

        if (!searchResults.body.tracks?.items.length) {
            return null
        }

        // Format tracks for fuzzy search
        const tracks = searchResults.body.tracks.items.map((track) => ({
            id: track.id,
            name: track.name,
            artists: track.artists,
            uri: track.uri,
        }))

        // Configure fuzzy search options
        const fuseOptions = {
            keys: [
                {
                    name: "name",
                    weight: 0.6,
                },
                {
                    name: "artists",
                    weight: 0.4,
                    getFn: (track: SpotifyTrack) =>
                        track.artists.map((a) => a.name).join(" "),
                },
            ],
            threshold: 0.4,
            distance: 100,
        }

        // Create Fuse instance for fuzzy searching
        const fuse = new Fuse(tracks, fuseOptions)

        // Perform fuzzy search with combined score
        let searchString = parsedQuery.title
        if (parsedQuery.artist) {
            searchString += ` ${parsedQuery.artist}`
        }

        const fuzzyResults = fuse.search(searchString)

        if (!fuzzyResults.length) {
            console.log("No fuzzy search results found")
            return null
        }

        // Apply additional artist matching if artist was specified
        if (parsedQuery.artist) {
            const artistFuse = new Fuse(
                fuzzyResults.map((r) => r.item),
                {
                    keys: [
                        {
                            name: "artists",
                            getFn: (track: SpotifyTrack) =>
                                track.artists.map((a) => a.name).join(" "),
                        },
                    ],
                    threshold: 0.45,
                }
            )

            const artistResults = artistFuse.search(parsedQuery.artist)
            if (artistResults.length) {
                // Prioritize tracks that match both title and artist
                fuzzyResults.sort((a, b) => {
                    const aHasArtist = artistResults.some(
                        (r) => r.item.id === a.item.id
                    )
                    const bHasArtist = artistResults.some(
                        (r) => r.item.id === b.item.id
                    )
                    if (aHasArtist && !bHasArtist) return -1
                    if (!aHasArtist && bHasArtist) return 1
                    return a.score! - b.score!
                })
            }
        }

        // Get the best match
        const bestMatch = fuzzyResults[0].item

        // Add the track to queue
        spotifyApi.addToQueue(`spotify:track:${bestMatch.id}`)
        SendMessage(
            "!sr",
            `Added to queue: ${bestMatch.name} by ${bestMatch.artists
                .map((artist) => artist.name)
                .join(", ")}`
        )
    } catch (error) {
        console.error("Error in fuzzy search and queue:", error)
    }
}
