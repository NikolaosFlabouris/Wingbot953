import { DiscordSetup } from './Integrations/Discord'
import { TwitchSetup } from "./Integrations/Twitch"
import { SpotifySetup } from "./Integrations/Spotify"
import { QuizSetup } from "./Commands/Quiz"

import express = require("express")

const server = express()
const port = 3000

async function main() {
    server.listen(port)

    await DiscordSetup()

    await SpotifySetup(server)

    await TwitchSetup(server)

    QuizSetup()
}

main()
