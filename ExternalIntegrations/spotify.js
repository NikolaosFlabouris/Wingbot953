import SpotifyWebApi from "spotify-web-api-node"
import open from "open"
import readline from "readline"
import { SendMessage } from "../Wingbot953.js"
import "dotenv/config"

var scopes = ["user-read-currently-playing"]
var refreshTimeSec
var authCode
var tokenRefreshInterval
var spotifyApiActive = false

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI,
})

var authorizeURL = spotifyApi.createAuthorizeURL(scopes)

SpotifySetup()

export async function SpotifySetup() {
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    })

    if (spotifyApiActive) {
        var authWindow = open(authorizeURL)

        await new Promise((response) =>
            rl.question("Please enter in the token: ", (ans) => {
                rl.close()
                authCode = ans
                response(ans)
            })
        )

        spotifyApi.authorizationCodeGrant(authCode).then(
            function (data) {
                // Set the access token on the API object to use it in later calls
                spotifyApi.setAccessToken(data.body["access_token"])
                spotifyApi.setRefreshToken(data.body["refresh_token"])
                tokenRefreshInterval = setInterval(
                    RefreshToken,
                    data.body["expires_in"] * 1000
                )

                console.log("SpotifyAPI setup complete.")
            },
            function (err) {
                console.log("Something went wrong!", err)
            }
        )
    }
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

export function GetCurrentSong() {
    if (!spotifyApiActive) {
        SendMessage(
            "!song",
            "No song is currently playing or song is currently unavailable."
        )
        return
    }

    spotifyApi.getMyCurrentPlayingTrack().then(
        function (data) {
            if (data.body.item) {
                var message =
                    "Now playing: " +
                    data.body.item.name +
                    " by " +
                    data.body.item.artists[0].name

                for (var i = 1; i < data.body.item.artists.length; i++) {
                    message += ", " + data.body.item.artists[i].name
                }

                SendMessage("!song", message)
            } else {
                SendMessage("!song", "No song is currently playing.")
            }
        },
        function (err) {
            console.log("Something went wrong!", err)
        }
    )
}
