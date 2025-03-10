import SpotifyWebApi from "spotify-web-api-node"
import Fuse, { FuseResult, FuseSortFunctionArg, IFuseOptions } from "fuse.js"
import open from "open"
import { SendMessage, isLive } from "./Twitch.js"
import "dotenv/config"

import express = require("express")
import { TwitchPrivateMessage } from "@twurple/chat/lib/commands/TwitchPrivateMessage.js"
import { codeBlock } from "discord.js"

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
export async function AddSongToQueue(msg: TwitchPrivateMessage) {
    // if (!isLive) {
    //     SendMessage("!sr", "Cannot add song to queue right now.")
    //     return
    // }

    var originalMessage = msg.content.value
    const indexOfSpace = originalMessage.indexOf(" ")

    if (indexOfSpace === -1) {
        SendMessage(
            "!sr",
            "Failed to add song. Format: !sr <link> | !sr <song name> by <artist>"
        )
        return
    }

    var query = originalMessage.substring(indexOfSpace + 1)

    // Check if the query is a Spotify URL
    var trackId = extractTrackIdFromUrl(query)
    if (trackId) {
        try {
            const response = (await spotifyApi.getTrack(trackId)).body

            // Add the track to the queue using its URI
            await spotifyApi.addToQueue(`spotify:track:${response.id}`)
            SendMessage(
                "!sr",
                `Added to queue: ${response.name} by ${response.artists
                    .map((artist) => artist.name)
                    .join(", ")}`
            )
            return null
        } catch (error) {
            console.error("Error retrieving track from URL:", error)
            SendMessage("!sr", `Failed to add song from URL.`)
            return null
        }
    }

    var bestMatch = await FuzzySearchAndQueue(query)
    if (bestMatch) {
        try {
            // Add the track to queue
            await spotifyApi.addToQueue(`spotify:track:${bestMatch.id}`)
            SendMessage(
                "!sr",
                `Added to queue: ${bestMatch.name} by ${bestMatch.artists
                    .map((a) => a.name)
                    .join(" ")}`
            )
        } catch (error) {
            console.error("Error adding track from search:", error)
            SendMessage("!sr", `Failed to add song from search.`)
            return null
        }
    }
}

interface FuzzySearchResult {
    id: string
    name: string
    artists: string[]
    uri: string
}

export async function FuzzySearchAndQueue(
    query: string
): Promise<SpotifyApi.TrackObjectFull | null> {
    console.log("Fuzzy search query:", query)

    try {
        const parsedQuery = parseQuery(query)
        console.log("Parsed query:", parsedQuery)

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
            console.log("No search results found")
            SendMessage("!sr", "No results found.")
            return null
        }

        return searchResults.body.tracks.items[0]

        // // Format tracks for fuzzy search
        // const tracks = searchResults.body.tracks.items.map((track) => ({
        //     id: track.id,
        //     name: track.name,
        //     artists: track.artists,
        //     uri: track.uri,
        // }))

        // console.dir(tracks, { depth: null })

        // // Configure fuzzy search options
        // const fuseOptions: IFuseOptions<SpotifyTrack> = {
        //     keys: [
        //         {
        //             name: "name",
        //             weight: 0.7, // Increased weight for exact name matches
        //         },
        //         {
        //             name: "artists",
        //             weight: 0.3, // Reduced artist weight to prioritize title matches
        //             getFn: (track: SpotifyTrack) =>
        //                 track.artists.map((a) => a.name).join(" "),
        //         },
        //     ],
        //     threshold: 0.4, // Lower threshold for stricter matching
        //     distance: 50, // Reduced distance to favor closer matches
        //     includeScore: true,
        //     sortFn: (
        //         { item: a, score: aScore }: FuseSortFunctionArg,
        //         { item: b, score: bScore }: FuseSortFunctionArg
        //     ) => {
        //         const query = parsedQuery.title.toLowerCase()

        //         // Calculate length difference penalty
        //         const aLengthDiff = Math.abs(a.name.length - query.length)
        //         const bLengthDiff = Math.abs(b.name.length - query.length)

        //         // Calculate base score difference
        //         const scoreDiff = (aScore || 0) - (bScore || 0)

        //         // Penalize results with much longer/shorter names
        //         const lengthPenalty = (aLengthDiff - bLengthDiff) * 0.01

        //         return scoreDiff + lengthPenalty
        //     },
        // }

        // // Create Fuse instance for fuzzy searching
        // const fuse = new Fuse(tracks, fuseOptions)

        // // Perform fuzzy search with combined score
        // let searchString = parsedQuery.title
        // if (parsedQuery.artist) {
        //     searchString += ` ${parsedQuery.artist}`
        // }

        // const fuzzyResults = fuse.search(searchString)

        // console.log("Fuzzy search results:", fuzzyResults)

        // if (!fuzzyResults.length) {
        //     console.log("No fuzzy search results found")
        //     return null
        // }

        // // Apply additional artist matching if artist was specified
        // if (parsedQuery.artist) {
        //     const artistFuse = new Fuse(
        //         fuzzyResults.map((r) => r.item),
        //         {
        //             keys: [
        //                 {
        //                     name: "artists",
        //                     getFn: (track: SpotifyTrack) =>
        //                         track.artists.map((a) => a.name).join(" "),
        //                 },
        //             ],
        //             threshold: 0.4, // Stricter threshold for artist matching
        //             includeScore: true,
        //         }
        //     )

        //     const artistResults = artistFuse.search(parsedQuery.artist)
        //     if (artistResults.length) {
        //         // Enhanced sorting that considers both match quality and length differences
        //         fuzzyResults.sort((a, b) => {
        //             const aArtistMatch = artistResults.find(
        //                 (r) => r.item.id === a.item.id
        //             )
        //             const bArtistMatch = artistResults.find(
        //                 (r) => r.item.id === b.item.id
        //             )

        //             // If one has artist match and other doesn't, prioritize the match
        //             if (aArtistMatch && !bArtistMatch) return -1
        //             if (!aArtistMatch && bArtistMatch) return 1

        //             // If both have artist matches, consider artist match quality
        //             if (aArtistMatch && bArtistMatch) {
        //                 const artistScoreDiff =
        //                     (aArtistMatch.score || 0) -
        //                     (bArtistMatch.score || 0)
        //                 if (Math.abs(artistScoreDiff) > 0.1) {
        //                     return artistScoreDiff
        //                 }
        //             }

        //             // Fall back to title match quality
        //             return (a.score || 0) - (b.score || 0)
        //         })
        //     }
        // }

        // // Get the best match
        // var result: FuzzySearchResult = {
        //     id: fuzzyResults[0].item.id,
        //     name: fuzzyResults[0].item.name,
        //     artists: fuzzyResults[0].item.artists.map((artist) => artist.name),
        //     uri: fuzzyResults[0].item.uri,
        // }
        // return result
    } catch (error) {
        console.error("Error in fuzzy search and queue:", error)
        return null
    }
}

/**
 * Extracts the track ID from a Spotify URL
 * @param url Spotify URL (web player, open.spotify.com, or URI format)
 * @returns The extracted track ID or null if not a valid track URL
 */
function extractTrackIdFromUrl(url: string): string | null {
    // Handle different Spotify URL formats

    // Format: https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=...
    const webUrlPattern = /open\.spotify\.com\/track\/([a-zA-Z0-9]+)/

    // Format: spotify:track:4cOdK2wGLETKBW3PvgPWqT
    const uriPattern = /spotify:track:([a-zA-Z0-9]+)/

    // Format: https://play.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT
    const oldWebUrlPattern = /play\.spotify\.com\/track\/([a-zA-Z0-9]+)/

    // Try each pattern
    let match =
        url.match(webUrlPattern) ||
        url.match(uriPattern) ||
        url.match(oldWebUrlPattern)

    return match ? match[1] : null
}
