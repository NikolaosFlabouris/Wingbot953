import SpotifyWebApi from "spotify-web-api-node"
import open from "open"
import { SendMessage, isLive } from "./Twitch.js"
import "dotenv/config"

import express = require("express")

const scopes: Array<string> = ["user-read-currently-playing"]

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

export function GetCurrentSong() {

    if (!isLive) {
        SendMessage("!song", "No song is currently playing.")
        return;
    }

    spotifyApi.getMyCurrentPlayingTrack().then(
        function (data) {
            if (data.body.item) {
                let message = `Now playing: ${data.body.item.name} by ${
                    (data.body.item as any).artists[0].name
                }`

                for (
                    let i = 1;
                    i < (data.body.item as any).artists.length;
                    i++
                ) {
                    message += `, ${(data.body.item as any).artists[i].name}`
                }

                SendMessage("!song", message)
            } else {
                SendMessage("!song", "No song is currently playing.")
            }
        },
        function (err: any) {
            console.log(
                "Something went wrong with getMyCurrentPlayingTrack!",
                err
            )
        }
    )
}
