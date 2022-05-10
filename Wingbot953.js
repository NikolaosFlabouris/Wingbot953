import { TwitchSetup } from "./Integrations/Twitch.js"
import { SpotifySetup } from "./Integrations/Spotify.js"

async function main() {
    await TwitchSetup()
    //await SpotifySetup()
}

main()
