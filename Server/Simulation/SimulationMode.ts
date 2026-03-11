// Prevent any writes to production data files (e.g. QuizLeaderboards.json).
// This MUST be set before any other imports to ensure LeaderboardManager.saveLeaderboards()
// is blocked from the moment the module loads.
process.env.DEBUG = "TRUE"

import { handleChatMessage, sendChatMessage, setupChatWebSocket } from "../MessageHandling"
import { GenerateCommandsList } from "../Commands/FunctionCommands"
import {
    generateSimulatedMessage,
    generateSimulatedSpecialEvent,
    simulationProfiles,
    SimulationProfile,
} from "./SimulatedData"
import { startServer, server } from "../UnifiedServer"

/**
 * Simulation Mode for Wingbot953
 *
 * Starts the bot with:
 * - Real Express server (port 3000) with WebSocket endpoints and static file serving
 * - Simulated chat messages from both Twitch and YouTube platforms
 * - No real API connections (Twitch, YouTube, Discord, Spotify, etc.)
 * - DEBUG=TRUE to prevent writes to production data files
 *
 * Usage: node Build/Server/Simulation/SimulationMode.js [profile]
 * Profiles: normal, commands, quiz, quiet
 */

let twitchInterval: NodeJS.Timeout | undefined
let youtubeInterval: NodeJS.Timeout | undefined
let specialEventInterval: NodeJS.Timeout | undefined

function startSimulation(profile: SimulationProfile) {
    console.log(`\n=== SIMULATION MODE ===`)
    console.log(`Profile: ${profile.name}`)
    console.log(`Description: ${profile.description}`)
    console.log(`Message interval: ${profile.intervalMs}ms`)
    console.log(`Weights: General=${profile.weights[0]}% Commands=${profile.weights[1]}% Quiz=${profile.weights[2]}%`)
    console.log(`========================\n`)

    // Generate Twitch messages
    twitchInterval = setInterval(() => {
        const msg = generateSimulatedMessage("twitch", profile)
        console.log(`[SIM-TWITCH] ${msg.author.displayName}: ${msg.message.text}`)
        handleChatMessage(msg)
    }, profile.intervalMs)

    // Generate YouTube messages at a slightly different rate
    youtubeInterval = setInterval(() => {
        const msg = generateSimulatedMessage("youtube", profile)
        console.log(`[SIM-YOUTUBE] ${msg.author.displayName}: ${msg.message.text}`)
        handleChatMessage(msg)
    }, profile.intervalMs * 1.5)

    // Generate special events (follows, hype trains, polls, subs, raids, bans, etc.) at a slower rate
    specialEventInterval = setInterval(() => {
        const event = generateSimulatedSpecialEvent()
        console.log(`[SIM-EVENT] ${event.botMessage.twitchSpecific?.messageType ?? "event"}: ${event.botMessage.message.text}`)
        sendChatMessage(event.botMessage, true, false)
        if (event.userMessage) {
            console.log(`[SIM-EVENT-USER] ${event.userMessage.author.displayName}: ${event.userMessage.message.text}`)
            handleChatMessage(event.userMessage)
        }
    }, profile.intervalMs * 5)
}

function stopSimulation() {
    if (twitchInterval) {
        clearInterval(twitchInterval)
        twitchInterval = undefined
    }
    if (youtubeInterval) {
        clearInterval(youtubeInterval)
        youtubeInterval = undefined
    }
    if (specialEventInterval) {
        clearInterval(specialEventInterval)
        specialEventInterval = undefined
    }
}

async function main() {
    // Parse profile from command line args
    const profileArg = process.argv[2] || "normal"
    const profile = simulationProfiles[profileArg]

    if (!profile) {
        console.error(`Unknown profile: ${profileArg}`)
        console.error(`Available profiles: ${Object.keys(simulationProfiles).join(", ")}`)
        process.exit(1)
    }

    // Start unified server (Express + WebSocket on single port)
    startServer()

    setupChatWebSocket()
    GenerateCommandsList()

    // Start simulation
    startSimulation(profile)

    // Graceful shutdown
    process.on("SIGINT", () => {
        console.log("\nShutting down simulation...")
        stopSimulation()
        server.close()
        process.exit(0)
    })
}

void main()
