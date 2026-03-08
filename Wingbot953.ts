import { DiscordSetup } from "./Server/Integrations/Discord";
import { TwitchManager } from "./Server/Integrations/Twitch";
import { TwitchEventSubManager } from "./Server/Integrations/TwitchEventSub";
import { SpotifyManager } from "./Server/Integrations/Spotify";
import { QuizManager } from "./Server/Commands/Quiz";
import { HaloRunsSetup } from "./Server/Integrations/HaloRuns";
import { GenerateCommandsList } from "./Server/Commands/FunctionCommands";
import { YouTubeManager } from "./Server/Integrations/YouTube";
import { createWebSocket } from "./Server/MessageHandling";
import { LiveSplitClient } from "./Server/Integrations/LiveSplit";
import { BadgeCache } from "./Server/Integrations/TwitchBadgeCache";

import * as http from "node:http";

const server = http.createServer();
const port = 3000;

async function main() {
  server.listen(port);
  console.log(`Server listening on port ${port}`);

  createWebSocket();

  DiscordSetup();

  SpotifyManager.getInstance().initialise(server);

  await TwitchManager.getInstance().initialise(server);

  // Initialize EventSub after Twitch auth is complete
  const twitchApi = TwitchManager.getInstance().api;
  const twitchStreamer = TwitchManager.getInstance().streamer;
  if (twitchApi && twitchStreamer) {
    await TwitchEventSubManager.getInstance().initialise(
      twitchApi,
      twitchStreamer.id
    );
  } else {
    console.log("Skipping EventSub initialisation - Twitch auth not complete.");
  }

  await YouTubeManager.getInstance().initialise(server);

  QuizManager.getInstance().initialise();

  await HaloRunsSetup();

  LiveSplitClient.getInstance().connect();

  GenerateCommandsList();

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\nShutting down...");
    TwitchEventSubManager.getInstance().dispose();
    TwitchManager.getInstance().dispose();
    YouTubeManager.getInstance().dispose();
    SpotifyManager.getInstance().dispose();
    LiveSplitClient.getInstance().disconnect(); // Cleanup when needed
    BadgeCache.destroy();
    process.exit(0);
  });
}

void main();
