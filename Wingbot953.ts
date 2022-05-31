import { TwitchSetup } from "./Integrations/Twitch"
import { SpotifySetup } from "./Integrations/Spotify"
import { QuizSetup } from "./Commands/Quiz"

async function main() {
    await SpotifySetup()

    await TwitchSetup()

    QuizSetup()
}

main()
