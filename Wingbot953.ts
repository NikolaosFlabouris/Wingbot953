import { DiscordSetup } from "./Server/Integrations/Discord";
import { TwitchManager } from "./Server/Integrations/Twitch";
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

  await DiscordSetup();

  await SpotifyManager.getInstance().initialise(server);

  await TwitchManager.getInstance().initialise(server);

  await YouTubeManager.getInstance().initialise(server);

  await QuizManager.getInstance().initialise();

  await HaloRunsSetup();

  LiveSplitClient.getInstance().connect();

  GenerateCommandsList();

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\nShutting down...");
    TwitchManager.getInstance().dispose();
    YouTubeManager.getInstance().dispose();
    SpotifyManager.getInstance().dispose();
    LiveSplitClient.getInstance().disconnect(); // Cleanup when needed
    BadgeCache.destroy();
    process.exit(0);
  });
}

main();
