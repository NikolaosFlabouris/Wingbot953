import { DiscordSetup } from "./Server/Integrations/Discord"
import { TwitchSetup } from "./Server/Integrations/Twitch"
import { SpotifySetup } from "./Server/Integrations/Spotify"
import { QuizSetup } from "./Server/Commands/Quiz"
import { HaloRunsSetup } from "./Server/Integrations/HaloRuns"
import { GenerateCommandsList } from "./Server/Commands/FunctionCommands"

import express = require("express")
import { YoutubeSetup } from "./Server/Integrations/YouTube"
import { createWebSocket } from "./Server/MessageHandling"
import { LiveSplitClient } from "./Server/Integrations/LiveSplit"

const server = express()
const port = 3000

let liveSplit: LiveSplitClient

async function main() {
    server.listen(port)

    createWebSocket()

    await DiscordSetup()

    await SpotifySetup(server)

    await TwitchSetup(server)

    await YoutubeSetup()

    // Usage
    liveSplit = new LiveSplitClient()
    liveSplit.connect()
    // Graceful shutdown
    process.on("SIGINT", () => {
        console.log("\nShutting down...")
        liveSplit.disconnect()
        process.exit(0)
    })

    QuizSetup()

    HaloRunsSetup()

    GenerateCommandsList()
}

main()
