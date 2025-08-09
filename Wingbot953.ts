import { DiscordSetup } from "./Server/Integrations/Discord";
import { TwitchSetup } from "./Server/Integrations/Twitch";
import { SpotifyManager } from "./Server/Integrations/Spotify";
import { QuizManager } from "./Server/Commands/Quiz";
import { HaloRunsSetup } from "./Server/Integrations/HaloRuns";
import { GenerateCommandsList } from "./Server/Commands/FunctionCommands";

import express = require("express");
import { YoutubeSetup } from "./Server/Integrations/YouTube";
import { createWebSocket } from "./Server/MessageHandling";
import { LiveSplitClient } from "./Server/Integrations/LiveSplit";
import { BadgeCache } from "./Server/Integrations/TwitchBadgeCache";

const server = express();
const port = 3000;

async function main() {
  server.listen(port);

  createWebSocket();

  await DiscordSetup();

  await SpotifyManager.getInstance().initialise(server);

  await TwitchSetup(server);

  await YoutubeSetup();

  await QuizManager.getInstance().initialise();

  await HaloRunsSetup();

  LiveSplitClient.getInstance().connect();

  GenerateCommandsList();

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\nShutting down...");
    LiveSplitClient.getInstance().disconnect(); // Cleanup when needed
    BadgeCache.destroy();
    process.exit(0);
  });
}

main();
