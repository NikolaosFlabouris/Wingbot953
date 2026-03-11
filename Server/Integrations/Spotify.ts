import SpotifyWebApi from "spotify-web-api-node";
import open from "open";
import { TwitchManager } from "./Twitch.js";
import * as dotenv from "dotenv";
dotenv.config({ quiet: true });
import type { Express } from "express";

import { sendChatMessage, Wingbot953Message } from "../MessageHandling.js";
import { UnifiedChatMessage } from "../../Common/UnifiedChatMessage";
import {
  parseSearchQuery,
  extractSpotifyTrackId,
  classifySongYear,
  canRequestSong,
} from "./SpotifyLogic";

/**
 * Spotify OAuth scopes required for the application
 */
const SPOTIFY_SCOPES: Array<string> = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "playlist-read-private",
];

/**
 * Represents track information from Spotify API
 */
interface CurrentTrack {
  name: string;
  artists: string[];
  id: string;
  albumName: string;
  albumArt: string | null;
  isPlaying: boolean;
  releaseYear?: number;
}

/**
 * Represents a simplified track for playlist operations
 */
interface Track {
  id: string;
  name: string;
  artists: string[];
}

/**
 * Singleton manager class for managing Spotify integration and functionality
 *
 * This class encapsulates all Spotify-related operations including:
 * - OAuth authentication and token management
 * - Current track information retrieval
 * - Song search and queue management
 * - Playlist operations
 *
 * The class maintains a single authenticated connection to the Spotify API
 * and provides methods for interacting with the user's Spotify account.
 * Implemented as a singleton to ensure only one instance manages the Spotify connection.
 *
 * @example
 * ```typescript
 * const spotify = SpotifyManager.getInstance()
 * await spotify.initialize(expressApp)
 * await spotify.getCurrentSong(chatMessage)
 * ```
 */
export class SpotifyManager {
  private static instance: SpotifyManager;
  private spotifyApi!: SpotifyWebApi;
  private tokenRefreshInterval?: NodeJS.Timeout;
  private isAuthenticated: boolean = false;

  /**
   * Private constructor to prevent direct instantiation
   * Use getInstance() to get the singleton instance
   */
  private constructor() {}

  /**
   * Gets the singleton instance of SpotifyManager
   * @returns The singleton instance of SpotifyManager
   */
  public static getInstance(): SpotifyManager {
    if (!SpotifyManager.instance) {
      SpotifyManager.instance = new SpotifyManager();
    }
    return SpotifyManager.instance;
  }

  /**
   * Initializes the Spotify service with OAuth authentication
   * @param expressApp Express app instance for handling OAuth callback
   */
  public initialise(expressApp: Express): void {
    this.spotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI,
    });

    const authorizeURL = this.spotifyApi.createAuthorizeURL(
      SPOTIFY_SCOPES,
      "Wingbot953Integration"
    );

    // Register the Spotify OAuth callback route
    expressApp.get("/spotify/callback", (req, res) => {
      void (async () => {
        console.log("Spotify Callback received");

        const code = req.query.code as string | undefined;

        if (!code) {
          res.status(400).type("text/plain").send("Missing authorization code");
          return;
        }

        try {
          const data = await this.spotifyApi.authorizationCodeGrant(code);

          this.spotifyApi.setAccessToken(data.body["access_token"]);
          this.spotifyApi.setRefreshToken(data.body["refresh_token"]);

          // Clear any existing refresh interval
          if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
          }

          this.tokenRefreshInterval = setInterval(
            () => void this.refreshToken(),
            data.body["expires_in"] * 1000
          );

          this.isAuthenticated = true;
          console.log("SpotifyAPI setup complete.");

          // Send success response
          res.status(200).type("text/html").send(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Spotify Authentication Complete</title>
                <style>
                  body {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 50px;
                    background: linear-gradient(135deg, #1DB954, #191414);
                    color: white;
                    margin: 0;
                  }
                  .container {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 15px;
                    padding: 40px;
                    max-width: 500px;
                    margin: 0 auto;
                    backdrop-filter: blur(10px);
                  }
                  .success {
                    color: #1DB954;
                    font-size: 2.5em;
                    margin-bottom: 20px;
                  }
                  h2 {
                    margin-bottom: 30px;
                    font-size: 1.5em;
                  }
                  p {
                    font-size: 1.2em;
                    margin-bottom: 30px;
                  }
                  #countdown {
                    font-weight: bold;
                    color: #1DB954;
                    font-size: 1.3em;
                  }
                  button {
                    background: #1DB954;
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    font-size: 1.1em;
                    border-radius: 25px;
                    cursor: pointer;
                    transition: background 0.3s;
                  }
                  button:hover {
                    background: #1ed760;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="success">✓</div>
                  <h2>Spotify Authentication Successful</h2>
                  <p>Wingbot953 is now connected to your Spotify account!</p>
                  <p>This window will close in <span id="countdown">1</span> seconds...</p>
                  <button onclick="window.close()">Close Now</button>
                </div>

                <script>
                  let count = 1;
                  const countdown = document.getElementById('countdown');

                  const timer = setInterval(() => {
                    count--;
                    countdown.textContent = count;

                    if (count <= 0) {
                      clearInterval(timer);
                      window.close();
                      setTimeout(() => {
                        document.querySelector('.container').innerHTML =
                          '<div class="success">✓</div><h2>Please close this tab manually</h2><p>Authentication completed successfully!</p>';
                      }, 500);
                    }
                  }, 1000);
                </script>
              </body>
            </html>
          `);
        } catch (err: unknown) {
          console.log("Something went wrong with authorizationCodeGrant!", err);
          res.status(500).type("text/html").send(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Spotify Authentication Failed</title>
                <style>
                  body {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 50px;
                    background: linear-gradient(135deg, #FF4444, #AA0000);
                    color: white;
                    margin: 0;
                  }
                  .container {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 15px;
                    padding: 40px;
                    max-width: 500px;
                    margin: 0 auto;
                    backdrop-filter: blur(10px);
                  }
                  .error {
                    color: #FF4444;
                    font-size: 2.5em;
                    margin-bottom: 20px;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="error">✗</div>
                  <h2>Spotify Authentication Failed</h2>
                  <p>Please try again.</p>
                  <button onclick="window.close()">Close Window</button>
                </div>
              </body>
            </html>
          `);
        }
      })();
    });

    void open(authorizeURL);
  }

  /**
   * Refreshes the Spotify access token
   * @private
   */
  private async refreshToken(): Promise<void> {
    try {
      const data = await this.spotifyApi.refreshAccessToken();
      console.log("The Spotify access token has been refreshed!");
      this.spotifyApi.setAccessToken(data.body["access_token"]);
    } catch (err) {
      console.log("Could not refresh access token", err);
      this.isAuthenticated = false;
    }
  }

  /**
   * Helper method to send chat messages with consistent formatting
   * @private
   */
  private sendResponse(msg: UnifiedChatMessage, text: string): void {
    const response = structuredClone(Wingbot953Message);
    response.platform = msg.platform;
    response.message.text = text;
    sendChatMessage(response);
  }

  /**
   * Cleans up resources when service is no longer needed
   */
  public dispose(): void {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = undefined;
    }
  }

  /**
   * Gets and displays information about the currently playing song
   * @param msg The unified chat message containing platform and user info
   */
  public async getCurrentSong(msg: UnifiedChatMessage): Promise<void> {
    if (!TwitchManager.getInstance().live) {
      this.sendResponse(msg, "No song is currently playing.");
      return;
    }

    if (!this.isAuthenticated) {
      this.sendResponse(msg, "Spotify is not connected.");
      return;
    }

    const currentTrack = await this.getCurrentlyPlaying();
    if (currentTrack) {
      this.sendResponse(
        msg,
        `Currently playing: ${currentTrack.name} by ${currentTrack.artists.join(
          ", "
        )}`
      );
    } else {
      this.sendResponse(msg, "No song is currently playing.");
    }
  }

  /**
   * Gets and displays the release year of the currently playing song
   * @param msg The unified chat message containing platform and user info
   */
  public async getSongYear(msg: UnifiedChatMessage): Promise<void> {
    if (!TwitchManager.getInstance().live) {
      this.sendResponse(msg, "No song is currently playing.");
      return;
    }

    if (!this.isAuthenticated) {
      this.sendResponse(msg, "Spotify is not connected.");
      return;
    }

    const currentTrack = await this.getCurrentlyPlaying();
    if (currentTrack && currentTrack.releaseYear) {
      this.sendResponse(
        msg,
        `${currentTrack.name} by ${currentTrack.artists.join(", ")} is from ${
          currentTrack.releaseYear
        }.`
      );
    } else {
      this.sendResponse(msg, "No song is currently playing.");
    }
  }

  /**
   * Checks if the currently playing song is from 2013 or 2013-ish years
   * @param msg The unified chat message containing platform and user info
   */
  public async is2013Song(msg: UnifiedChatMessage): Promise<void> {
    if (!TwitchManager.getInstance().live) {
      this.sendResponse(msg, "No song is currently playing.");
      return;
    }

    if (!this.isAuthenticated) {
      this.sendResponse(msg, "Spotify is not connected.");
      return;
    }

    const currentTrack = await this.getCurrentlyPlaying();
    if (!currentTrack || !currentTrack.releaseYear) {
      this.sendResponse(msg, "No song is currently playing.");
      return;
    }

    const year = currentTrack.releaseYear;
    const artistsString = currentTrack.artists.join(", ");
    const classification = classifySongYear(year);

    if (classification.type === "exact") {
      this.sendResponse(
        msg,
        `wingma14Jam ${currentTrack.name} by ${artistsString} is a 2013 song! wingma14Jam`
      );
    } else if (classification.type === "close") {
      this.sendResponse(
        msg,
        `${currentTrack.name} by ${artistsString} is a 2013-ish song! It is from ${year}.  wingma14Jam`
      );
    } else {
      this.sendResponse(
        msg,
        `${currentTrack.name} by ${artistsString} is not a 2013 song. It is from ${year}.`
      );
    }
  }

  /**
   * Get the currently playing track from Spotify
   * @private
   * @returns Current track information or null if nothing is playing
   */
  private async getCurrentlyPlaying(): Promise<CurrentTrack | null> {
    try {
      const response = await this.spotifyApi.getMyCurrentPlayingTrack();

      if (
        !response.body ||
        !response.body.item ||
        response.body.item.type !== "track"
      ) {
        return null;
      }

      const track = response.body.item;

      const albumInfo = await this.spotifyApi.getAlbum(track.album.id);

      // The release date format can be YYYY, YYYY-MM, or YYYY-MM-DD
      // Extract just the year portion
      const releaseDate = albumInfo.body.release_date;
      const releaseYear = parseInt(releaseDate.split("-")[0]);

      return {
        name: track.name,
        artists: track.artists.map((artist) => artist.name),
        id: track.id,
        albumName: track.album.name,
        albumArt: track.album.images[0]?.url || null,
        isPlaying: response.body.is_playing,
        releaseYear: releaseYear,
      };
    } catch (error) {
      console.error(
        "Something went wrong with getMyCurrentPlayingTrack:",
        error
      );
      return null;
    }
  }

  /**
   * Finds a playlist by name (case-insensitive)
   * @private
   * @param playlistName The name of the playlist to search for
   * @returns The playlist ID if found, null otherwise
   */
  private async findPlaylistByName(
    playlistName: string
  ): Promise<string | null> {
    try {
      let offset = 0;
      const limit = 50;

      while (true) {
        const response = await this.spotifyApi.getUserPlaylists({
          limit,
          offset,
        });

        if (!response.body.items.length) {
          break;
        }

        const playlist = response.body.items.find(
          (p) => p.name.toLowerCase() === playlistName.toLowerCase()
        );

        if (playlist) {
          return playlist.id;
        }

        offset += limit;

        if (offset >= response.body.total) {
          break;
        }
      }

      return null;
    } catch (error) {
      console.error("Error finding playlist:", error);
      return null;
    }
  }

  /**
   * Gets all tracks from a playlist
   * @private
   * @param playlistId The Spotify playlist ID
   * @returns Array of track objects
   */
  private async getAllPlaylistTracks(
    playlistId: string
  ): Promise<SpotifyApi.PlaylistTrackObject[]> {
    const tracks: SpotifyApi.PlaylistTrackObject[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await this.spotifyApi.getPlaylistTracks(playlistId, {
        limit,
        offset,
      });

      tracks.push(...response.body.items);

      offset += limit;
      if (offset >= response.body.total) {
        break;
      }
    }

    return tracks;
  }

  /**
   * Gets random tracks from a playlist specified by name
   * @private
   * @param playlistName Name of the playlist to search for
   * @param numberOfTracks Number of random tracks to select
   * @returns Array of random tracks or null if playlist not found
   */
  private async getRandomTracksFromPlaylistByName(
    playlistName: string,
    numberOfTracks: number
  ): Promise<Track[] | null> {
    try {
      const playlistId = await this.findPlaylistByName(playlistName);

      if (!playlistId) {
        console.error(`Playlist "${playlistName}" not found`);
        return null;
      }

      const allTracks = await this.getAllPlaylistTracks(playlistId);
      const validTracks = allTracks.filter((item) => item.track !== null);
      const selectedTracks: SpotifyApi.PlaylistTrackObject[] = [];
      const tracksCopy = [...validTracks];

      // Select random tracks or all tracks if less than the requested number
      const numTracksToSelect = Math.min(numberOfTracks, tracksCopy.length);

      for (let i = 0; i < numTracksToSelect; i++) {
        const randomIndex = Math.floor(Math.random() * tracksCopy.length);
        const selectedTrack = tracksCopy.splice(randomIndex, 1)[0];
        selectedTracks.push(selectedTrack);
      }

      return selectedTracks.map((item) => {
        if (!item.track) {
          console.error(
            "Error getting random tracks:",
            "Unexpected null track found"
          );
          throw new Error("Unexpected null track found");
        }
        return {
          id: item.track.id,
          name: item.track.name,
          artists: item.track.artists.map((artist) => artist.name),
        };
      });
    } catch (error) {
      console.error("Error getting random tracks:", error);
      return null;
    }
  }

  /**
   * Adds random tracks from a playlist to the Spotify queue
   * @param playlistName Name of the playlist to select tracks from
   * @param numberOfTracks Number of tracks to add to the queue
   * @returns Promise that resolves when tracks are added
   */
  public async addTracksFromPlaylistToQueue(
    playlistName: string,
    numberOfTracks: number
  ): Promise<void> {
    try {
      if (!this.isAuthenticated) {
        console.error("Spotify is not authenticated");
        return;
      }

      const randomTracks = await this.getRandomTracksFromPlaylistByName(
        playlistName,
        numberOfTracks
      );

      if (randomTracks) {
        console.log(
          `* Randomly selected ${randomTracks.length} from playlist "${playlistName}":`
        );

        const addPromises = randomTracks.map((track) =>
          this.spotifyApi
            .addToQueue(`spotify:track:${track.id}`)
            .catch((error) =>
              console.error(`Failed to add track ${track.name}:`, error)
            )
        );

        await Promise.allSettled(addPromises);
      } else {
        console.error(`Could not find or access playlist: ${playlistName}`);
      }
    } catch (error) {
      console.error("Error in addTracksFromPlaylistToQueue: ", error);
    }
  }

  /**
   * Adds a song to the Spotify queue based on search query or URL
   * @param msg The unified chat message containing the song request
   */
  public async addSongToQueue(msg: UnifiedChatMessage): Promise<void> {
    if (!TwitchManager.getInstance().live) {
      this.sendResponse(msg, "Cannot add song to queue right now.");
      return;
    }

    if (!this.isAuthenticated) {
      this.sendResponse(msg, "Spotify is not connected.");
      return;
    }

    if (!canRequestSong(msg.author)) {
      this.sendResponse(
        msg,
        "Only subscribers, and moderators can add songs to the queue."
      );
      return;
    }

    const originalMessage = msg.message.text;
    const indexOfSpace = originalMessage.indexOf(" ");

    if (indexOfSpace === -1) {
      this.sendResponse(
        msg,
        "Failed to add song. Format: !sr <link> | !sr <song name> by <artist>"
      );
      return;
    }

    const query = originalMessage.substring(indexOfSpace + 1);

    // Check if the query is a Spotify URL
    const trackId = extractSpotifyTrackId(query);
    if (trackId) {
      try {
        const response = (await this.spotifyApi.getTrack(trackId)).body;
        await this.spotifyApi.addToQueue(`spotify:track:${response.id}`);
        this.sendResponse(
          msg,
          `Added to queue: ${response.name} by ${response.artists
            .map((artist) => artist.name)
            .join(", ")}`
        );
      } catch (error) {
        console.error("Error retrieving track from URL:", error);
        this.sendResponse(msg, "Failed to add song from URL.");
      }
      return;
    }

    const bestMatch = await this.fuzzySearchSpotifySong(query);
    if (bestMatch) {
      try {
        await this.spotifyApi.addToQueue(`spotify:track:${bestMatch.id}`);
        this.sendResponse(
          msg,
          `Added to queue: ${bestMatch.name} by ${bestMatch.artists
            .map((a) => a.name)
            .join(", ")}`
        );
      } catch (error) {
        console.error("Error adding track from search:", error);
        this.sendResponse(msg, "Failed to add song from search.");
      }
    } else {
      this.sendResponse(msg, "No results found for song request.");
    }
  }

  /**
   * Performs a fuzzy search for a song on Spotify
   * @private
   * @param query The search query (song name, optionally with artist)
   * @returns The best matching track or null if no match found
   */
  private async fuzzySearchSpotifySong(
    query: string
  ): Promise<SpotifyApi.TrackObjectFull | null> {
    console.log("Fuzzy search query:", query);

    try {
      const parsedQuery = parseSearchQuery(query);
      console.log("Parsed query:", parsedQuery);

      // Construct Spotify search query
      let spotifyQuery = parsedQuery.title;
      if (parsedQuery.artist) {
        spotifyQuery += ` artist:${parsedQuery.artist}`;
      }

      // Get potential matches from Spotify
      const searchResults = await this.spotifyApi.searchTracks(spotifyQuery, {
        limit: 20,
      });

      if (!searchResults.body.tracks?.items.length) {
        console.log("No search results found for song request");
        return null;
      }

      return searchResults.body.tracks.items[0];
    } catch (error) {
      console.error("Error in fuzzy search:", error);
      return null;
    }
  }

}
