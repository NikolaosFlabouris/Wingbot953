import { DiscordSetup } from "./Server/Integrations/Discord";
import { TwitchManager } from "./Server/Integrations/Twitch";
import { SpotifyManager } from "./Server/Integrations/Spotify";
import { QuizManager } from "./Server/Commands/Quiz";
import { HaloRunsSetup } from "./Server/Integrations/HaloRuns";
import { GenerateCommandsList } from "./Server/Commands/FunctionCommands";
import { YouTubeManager } from "./Server/Integrations/YouTube";
import { setupChatWebSocket } from "./Server/MessageHandling";
import { LiveSplitClient } from "./Server/Integrations/LiveSplit";
import { BadgeCache } from "./Server/Integrations/TwitchBadgeCache";
import { validateEnvironment } from "./Server/Config";
import { app, startServer } from "./Server/UnifiedServer";

async function main() {
  validateEnvironment();
  startServer();

  setupChatWebSocket();

  DiscordSetup();

  SpotifyManager.getInstance().initialise(app);

  await TwitchManager.getInstance().initialise(app);

  await YouTubeManager.getInstance().initialise(app);

  QuizManager.getInstance().initialise();

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

void main();
