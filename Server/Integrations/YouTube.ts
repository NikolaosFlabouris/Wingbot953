import { google, youtube_v3 } from "googleapis"
import * as dotenv from "dotenv"
import { handleChatMessage } from "../MessageHandling"
import { UnifiedChatMessage } from "../../Common/UnifiedChatMessage"
import util from "util"
import * as fs from "fs"
import open from "open"
import * as http from "http"

// Load environment variables
dotenv.config()

let youtubeClient: youtube_v3.Youtube
let oAuth2Client: any
let channelId: string | null = null
let activeLivestream: string | undefined
let liveChatId: string | undefined
let nextPageToken: string | undefined
let isMonitoring: boolean = false
let pollingInterval: number = 5000 // 5 seconds
let intervalId: NodeJS.Timeout | undefined
let server: http.Server | undefined
let youTubeApiPollingInterval: NodeJS.Timeout
let tokenPath: string = "./Data/Tokens/youtube-tokens.json"

const SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.force-ssl",
]

export async function YoutubeSetup(): Promise<void> {
    console.log("YouTube Integration Setup")

    // Initialize YouTube API
    youtubeClient = google.youtube({
        version: "v3",
        auth: process.env.YOUTUBE_API_KEY,
    })

    // First ensure the oAuth2Client is properly initialized
    oAuth2Client = new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        process.env.YOUTUBE_REDIRECT_URI
    )

    // Then get and set the credentials by going through the OAuth flow
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        prompt: "consent",
    })

    try {
        // Check if we have saved tokens
        if (fs.existsSync(tokenPath)) {
            console.log("Loading existing tokens...")
            const tokens = JSON.parse(fs.readFileSync(tokenPath, "utf-8"))

            // Set credentials
            oAuth2Client.setCredentials(tokens)

            // Verify tokens are still valid by making a test request
            try {
                const youtube = google.youtube({
                    version: "v3",
                    auth: oAuth2Client,
                })
                await youtube.channels.list({ part: ["snippet"], mine: true })
                console.log("Existing tokens are valid.")
                return tokens
            } catch (e) {
                console.log(
                    "Existing tokens are invalid. Starting new authentication flow..."
                )
                // Continue with new auth flow
            }
        }

        await startAuthFlow()
    } catch (error) {
        console.error("Authentication error:", error)
        throw error
    }

    youTubeApiPollingInterval = setInterval(youTubeApiPolling, 5000) // 5secs

    return
}

/**
 * Start the OAuth2 authentication flow by opening browser and starting local server
 */
async function startAuthFlow(): Promise<any> {
    return new Promise((resolve, reject) => {
        // Create a local server to handle the OAuth2 callback
        server = http.createServer(async (req, res) => {
            try {
                // Parse the request URL
                const reqUrl = new URL(req.url || "/", `http://localhost:3001`)
                const pathname = reqUrl.pathname

                // Handle the OAuth2 callback
                if (pathname === "/youtube/callback") {
                    // Extract the authorization code from query parameters
                    const code = reqUrl.searchParams.get("code")

                    // Send response to browser
                    res.writeHead(200, { "Content-Type": "text/html" })
                    res.end(`
                            <html>
                                <body>
                                <h1>Authentication Successful!</h1>
                                <p>You can close this window now.</p>
                                <script>window.close();</script>
                                </body>
                            </html>
                            `)

                    // Close the server
                    server?.close()

                    if (code) {
                        try {
                            // Exchange the authorization code for tokens
                            const { tokens } = await oAuth2Client.getToken(code)

                            // Set the credentials
                            oAuth2Client.setCredentials(tokens)

                            // Save tokens to file
                            fs.writeFileSync(
                                tokenPath,
                                JSON.stringify(tokens, null, 2)
                            )
                            console.log("Tokens saved to:", tokenPath)

                            resolve(tokens)
                        } catch (tokenError) {
                            console.error("Error getting tokens:", tokenError)
                            reject(tokenError)
                        }
                    } else {
                        const error = new Error(
                            "No authorization code found in the callback URL"
                        )
                        console.error(error)
                        reject(error)
                    }
                } else {
                    // Handle other routes
                    res.writeHead(404)
                    res.end("Not found")
                }
            } catch (e) {
                console.error("Server error:", e)
                res.writeHead(500)
                res.end("Server error")
                reject(e)
            }
        })

        // Start the server
        server.listen(3001, () => {
            console.log(`Local server listening on port 3001`)

            // Generate the auth URL
            const authUrl = oAuth2Client.generateAuthUrl({
                access_type: "offline",
                scope: SCOPES,
                prompt: "consent", // Force consent screen to ensure refresh token
            })

            console.log("Opening browser to:", authUrl)

            // Open the auth URL in the default browser
            open(authUrl, { app: { name: "chrome" } }).catch((e) => {
                console.error("Failed to open browser automatically.")
                console.log("Please open this URL manually:", authUrl)
            })
        })

        // Handle server errors
        server.on("error", (e) => {
            console.error("Server error:", e)
            reject(e)
        })
    })
}

/**
 * Refresh the access token using the refresh token
 */
async function refreshToken(): Promise<any> {
    try {
        if (!oAuth2Client.credentials.refresh_token) {
            throw new Error(
                "No refresh token available. Please re-authenticate."
            )
        }

        const refreshResponse = await oAuth2Client.refreshToken(
            oAuth2Client.credentials.refresh_token as string
        )

        const newTokens = refreshResponse.tokens

        // Preserve the refresh token if a new one wasn't provided
        if (
            !newTokens.refresh_token &&
            oAuth2Client.credentials.refresh_token
        ) {
            newTokens.refresh_token = oAuth2Client.credentials.refresh_token
        }

        // Update the client with new tokens
        oAuth2Client.setCredentials(newTokens)

        // Save the updated tokens
        fs.writeFileSync(tokenPath, JSON.stringify(newTokens, null, 2))
        console.log("Tokens refreshed and saved.")

        return newTokens
    } catch (error) {
        console.error("Error refreshing token:", error)
        throw error
    }
}

async function youTubeApiPolling() {
    try {
        if (!isMonitoring) {
            // Search for the channel using the handle as a query
            const searchResponse = await youtubeClient.search.list({
                q: `@Wingman953`,
                type: ["channel"],
                part: ["id", "snippet"],
                maxResults: 1,
            })

            if (
                searchResponse.data.items &&
                searchResponse.data.items.length > 0
            ) {
                channelId = searchResponse.data.items[0].id?.channelId || null
            }

            if (!channelId) {
                console.error("Channel ID not found")
                return
            }

            const streamInfo = await getCurrentLivestream(channelId)

            if (
                streamInfo.videoId === null ||
                streamInfo.title === null ||
                streamInfo.status === null ||
                streamInfo.status !== "active"
            ) {
                console.log("No active livestream found")
                return
            }

            // Connect to YouTube livestream
            const connected = await connectToYouTubeLivestream(
                streamInfo.videoId
            )

            if (connected) {
                console.log("Connected to YouTube livestream")
                // Start monitoring chat
                await startMonitoring()
            } else {
                console.error(`Failed to connect to YouTube Livestream`)
                process.exit(1)
            }
        }
    } catch {
        console.log(
            "CATCH: Failed to reach YouTube API. Trying to refresh token."
        )
        refreshToken()
    }
}

/**
 * Get the current active livestream ID for a channel
 * @param channelId - YouTube channel ID
 */
async function getCurrentLivestream(channelId: string): Promise<{
    videoId: string | null
    title: string | null
    status: string | null
}> {
    try {
        // Method 1: Search for live videos from the channel
        const searchResponse = await youtubeClient.search.list({
            channelId: channelId,
            eventType: "live",
            type: ["video"],
            part: ["id", "snippet"],
            maxResults: 1,
        })

        if (searchResponse.data.items && searchResponse.data.items.length > 0) {
            const videoId = searchResponse.data.items[0].id?.videoId || null
            const title = searchResponse.data.items[0].snippet?.title || null

            // If found via search, return with active status
            return {
                videoId,
                title,
                status: "active",
            }
        }

        // Method 2: Get all broadcasts for the channel to check for scheduled or recently ended streams
        const broadcastsResponse = await youtubeClient.liveBroadcasts.list({
            broadcastStatus: "all", // Check active, completed, and upcoming
            part: ["id", "snippet", "status"],
            maxResults: 10,
        })

        if (
            broadcastsResponse.data.items &&
            broadcastsResponse.data.items.length > 0
        ) {
            // First, check for any active streams
            const activeBroadcast = broadcastsResponse.data.items.find(
                (item) => item.status?.lifeCycleStatus === "live"
            )

            if (activeBroadcast) {
                return {
                    videoId: activeBroadcast.id || null,
                    title: activeBroadcast.snippet?.title || null,
                    status: "active",
                }
            }

            // Next, check for upcoming streams
            const upcomingBroadcast = broadcastsResponse.data.items.find(
                (item) =>
                    item.status?.lifeCycleStatus === "ready" ||
                    item.status?.lifeCycleStatus === "testStarting" ||
                    item.status?.lifeCycleStatus === "testing"
            )

            if (upcomingBroadcast) {
                return {
                    videoId: upcomingBroadcast.id || null,
                    title: upcomingBroadcast.snippet?.title || null,
                    status: "upcoming",
                }
            }

            // Finally, return the most recently completed stream
            const recentBroadcast = broadcastsResponse.data.items.find(
                (item) => item.status?.lifeCycleStatus === "complete"
            )

            if (recentBroadcast) {
                return {
                    videoId: recentBroadcast.id || null,
                    title: recentBroadcast.snippet?.title || null,
                    status: "completed",
                }
            }
        }

        // No livestreams found
        return {
            videoId: null,
            title: null,
            status: null,
        }
    } catch (error) {
        console.error("Error getting livestream ID:", error)

        return {
            videoId: null,
            title: null,
            status: null,
        }
    }
}

/**
 * Connect to a YouTube livestream by video ID
 */
async function connectToYouTubeLivestream(videoId: string): Promise<boolean> {
    try {
        // First, verify that the video is actually a live broadcast
        const videoResponse = await youtubeClient.videos.list({
            id: [videoId],
            part: ["snippet", "liveStreamingDetails"],
        })

        const video = videoResponse.data.items?.[0]

        if (
            !video ||
            !video.liveStreamingDetails ||
            !video.liveStreamingDetails.activeLiveChatId
        ) {
            console.error(`No active livestream found for video ID ${videoId}`)
            return false
        }

        activeLivestream = videoId
        liveChatId = video.liveStreamingDetails.activeLiveChatId
        console.log(`Connected to YouTube livestream: ${video.snippet?.title}`)
        console.log(`Live chat ID: ${liveChatId}`)
        return true
    } catch (error) {
        console.error("Error connecting to YouTube livestream:", error)
        return false
    }
}

/**
 * Start monitoring YouTube livestream chat
 */
async function startMonitoring(): Promise<void> {
    console.log("Starting YouTube chat monitoring")

    if (!liveChatId) {
        console.error("No active livestream to monitor")
        return
    }

    if (isMonitoring) {
        console.log("Already monitoring chat")
        return
    }

    isMonitoring = true
    nextPageToken = undefined

    // Initial poll to get the first page token
    await pollLiveChatMessages()

    // Set up interval to poll for new messages
    intervalId = setInterval(() => pollLiveChatMessages(), pollingInterval)

    console.log(
        `Started monitoring YouTube chat with ${pollingInterval}ms polling interval`
    )
}

/**
 * Stop monitoring YouTube livestream chat
 */
function stopMonitoring(): void {
    if (intervalId) {
        clearInterval(intervalId)
        intervalId = undefined
    }
    isMonitoring = false
    console.log("Stopped monitoring YouTube chat")
}

/**
 * Poll for new YouTube livestream chat messages
 */
async function pollLiveChatMessages(): Promise<void> {
    if (!liveChatId) return

    try {
        const response = await youtubeClient.liveChatMessages.list({
            liveChatId: liveChatId,
            part: ["snippet", "authorDetails"],
            pageToken: nextPageToken,
        })

        const { data } = response

        // Update polling interval if suggested by the API
        if (data.pollingIntervalMillis) {
            pollingInterval = data.pollingIntervalMillis
        }

        // Save the next page token for subsequent requests
        nextPageToken = data.nextPageToken || undefined

        // Process each message
        if (data.items && data.items.length > 0) {
            data.items.forEach((item) => processYouTubeMessage(item))
        }
    } catch (error: any) {
        console.error("Error polling live chat messages:", error)
        // If we get a "Chat ended" error, stop monitoring
        if (error.message && error.message.includes("Chat ended")) {
            stopMonitoring()
        }
    }
}

/**
 * Process a single YouTube chat message and convert to unified format
 */
function processYouTubeMessage(item: youtube_v3.Schema$LiveChatMessage): void {
    if (!item.snippet || !item.authorDetails) return

    const snippet = item.snippet
    const authorDetails = item.authorDetails

    let unifiedMessage: UnifiedChatMessage = {
        id: item.id || "",
        platform: "youtube",
        timestamp: new Date(snippet.publishedAt || ""),
        channel: {
            id: authorDetails.channelId || "",
            name: authorDetails.displayName || "",
        },
        author: {
            id: authorDetails.channelId || "",
            name: authorDetails.displayName || "",
            displayName: authorDetails.displayName || "",
            isModerator: authorDetails.isChatModerator || false,
            isSubscriber: authorDetails.isChatSponsor || false,
            isOwner: authorDetails.isChatOwner || false,
        },
        message: {
            text: "",
            isHighlighted: false,
        },
    }

    // Handle different message types
    if (snippet.type === "textMessageEvent" && snippet.textMessageDetails) {
        unifiedMessage.message.text =
            snippet.textMessageDetails.messageText || ""
    } else if (snippet.type === "superChatEvent" && snippet.superChatDetails) {
        unifiedMessage.message.text = snippet.superChatDetails.userComment || ""
        unifiedMessage.message.isSuperChat = true
        unifiedMessage.message.superChatDetails = {
            amount:
                parseFloat(snippet.superChatDetails.amountMicros || "0") /
                1000000,
            currency: snippet.superChatDetails.currency || "USD",
            color: snippet.superChatDetails.tier?.toString() || "", // YouTube uses tiers instead of color directly
        }
    }

    // Pass the message to the handler
    handleChatMessage(unifiedMessage)
}

export async function sendYouTubeMessage(message: string) {
    try {
        const response = await youtubeClient.liveChatMessages.insert({
            part: ["snippet"],
            requestBody: {
                snippet: {
                    liveChatId: liveChatId,
                    type: "textMessageEvent",
                    textMessageDetails: {
                        messageText: message,
                    },
                },
            },
        })

        console.log("Message sent successfully:", response.data)
        return true
    } catch (error: any) {
        console.error("Error sending chat message:", error)

        // Check for specific error types
        if (error.response) {
            console.error("Response status:", error.response.status)
            console.error("Response data:", error.response.data)

            // Handle rate limiting
            if (error.response.status === 403) {
                console.error(
                    "Rate limited or permission denied. Check your quota and permissions."
                )
            }
        }

        return false
    }
}
