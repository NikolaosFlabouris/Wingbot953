/**
 * Validates that all required environment variables are present at startup.
 * Exits cleanly with a clear error message if any are missing.
 *
 * Skipped when DEBUG=TRUE (simulation/test mode).
 */
export function validateEnvironment(): void {
  if (process.env.DEBUG === "TRUE") {
    console.log("DEBUG mode - skipping environment variable validation.");
    return;
  }

  const required: readonly string[] = [
    // Twitch
    "TWITCH_CLIENT_ID",
    "TWITCH_CLIENT_SECRET",
    "TWITCH_REDIRECT_URI",
    // Spotify
    "SPOTIFY_CLIENT_ID",
    "SPOTIFY_CLIENT_SECRET",
    "SPOTIFY_REDIRECT_URI",
    // YouTube
    "YOUTUBE_CLIENT_ID",
    "YOUTUBE_CLIENT_SECRET",
    "YOUTUBE_REDIRECT_URI",
    // Discord
    "DISCORD_TOKEN",
    // Browsers (for OAuth flows)
    "STREAMERBROWSER",
    "BOTBROWSER",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("Missing required environment variables:");
    for (const key of missing) {
      console.error(`  - ${key}`);
    }
    console.error(
      "\nSet these in your .env file or environment before starting the bot."
    );
    process.exit(1);
  }
}
