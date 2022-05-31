"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetCurrentSong = exports.SpotifySetup = void 0;
const spotify_web_api_node_1 = __importDefault(require("spotify-web-api-node"));
const open_1 = __importDefault(require("open"));
const readline_1 = __importDefault(require("readline"));
const Twitch_js_1 = require("./Twitch.js");
require("dotenv/config");
var scopes = ["user-read-currently-playing"];
let spotifyApi;
function SpotifySetup() {
    return __awaiter(this, void 0, void 0, function* () {
        spotifyApi = new spotify_web_api_node_1.default({
            clientId: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
            redirectUri: process.env.SPOTIFY_REDIRECT_URI,
        });
        var authorizeURL = spotifyApi.createAuthorizeURL(scopes, "Wingbot953Integration");
        var authWindow = (0, open_1.default)(authorizeURL);
        var rl = readline_1.default.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        yield new Promise((response) => rl.question("Please enter in the Spotify token: ", (ans) => {
            rl.close();
            spotifyApi.authorizationCodeGrant(ans).then(function (data) {
                // Set the access token on the API object to use it in later calls
                spotifyApi.setAccessToken(data.body["access_token"]);
                spotifyApi.setRefreshToken(data.body["refresh_token"]);
                var tokenRefreshInterval = setInterval(RefreshToken, data.body["expires_in"] * 1000);
                console.log("SpotifyAPI setup complete.");
            }, function (err) {
                console.log("Something went wrong with authorizationCodeGrant!", err);
            });
            response(ans);
        }));
    });
}
exports.SpotifySetup = SpotifySetup;
function RefreshToken() {
    spotifyApi.refreshAccessToken().then(function (data) {
        console.log("The access token has been refreshed!");
        // Save the access token so that it's used in future calls
        spotifyApi.setAccessToken(data.body["access_token"]);
    }, function (err) {
        console.log("Could not refresh access token", err);
    });
}
function GetCurrentSong() {
    spotifyApi.getMyCurrentPlayingTrack().then(function (data) {
        if (data.body.item) {
            var message = `Now playing: ${data.body.item.name} by ${data.body.item.artists[0].name}`;
            for (var i = 1; i < data.body.item.artists.length; i++) {
                message += `, ${data.body.item.artists[i].name}`;
            }
            (0, Twitch_js_1.SendMessage)("!song", message);
        }
        else {
            (0, Twitch_js_1.SendMessage)("!song", "No song is currently playing.");
        }
    }, function (err) {
        console.log("Something went wrong with getMyCurrentPlayingTrack!", err);
    });
}
exports.GetCurrentSong = GetCurrentSong;
