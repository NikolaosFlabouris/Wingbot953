import { DiscordSetup } from "./Server/Integrations/Discord"
import { TwitchSetup } from "./Server/Integrations/Twitch"
import { SpotifySetup } from "./Server/Integrations/Spotify"
import { QuizSetup } from "./Server/Commands/Quiz"
import { HaloRunsSetup } from "./Server/Integrations/HaloRuns"
import { GenerateCommandsList } from "./Server/Commands/FunctionCommands"

import express = require("express")
import { YoutubeSetup } from "./Server/Integrations/YouTube"
import { createWebSocket } from "./Server/MessageHandling"

const server = express()
const port = 3000

async function main() {
    server.listen(port)

    createWebSocket()

    await DiscordSetup()

    await SpotifySetup(server)

    await TwitchSetup(server)

    await YoutubeSetup()

    QuizSetup()

    HaloRunsSetup()

    GenerateCommandsList()
}

main()
