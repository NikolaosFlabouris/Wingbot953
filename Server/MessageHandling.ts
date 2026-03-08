import { TwitchManager } from "./Integrations/Twitch";
import { CheckForWelcomeMessage } from "./Commands/VipWelcome";
import { QuizManager } from "./Commands/Quiz";
import { Between } from "./Commands/Utils";
import { commandMap } from "./Commands/GeneralCommands";
import { quoteMap } from "./Commands/Quotes";
import functionMap from "./Commands/FunctionCommands";
import { YouTubeManager } from "./Integrations/YouTube";
import WebSocket from "ws";
import { UnifiedChatMessage } from "../Common/UnifiedChatMessage";

// Store connected clients
const clients: WebSocket[] = [];

export const Wingbot953Message: UnifiedChatMessage = {
  platform: "all",
  channel: { name: "Wingman953" },
  author: {
    name: "Wingbot953",
    displayName: "Wingbot953",
  },
  message: {
    text: "",
  },
};

export function createWebSocket() {
  // Create WebSocket server
  const PORT = process.env.PORT || 8080;
  const wss = new WebSocket.Server({ port: Number(PORT) });

  console.log(`WebSocket server is running on port ${PORT}`);

  // Handle new connections
  wss.on("connection", (ws: WebSocket) => {
    console.log("Client connected");
    clients.push(ws);

    // Handle disconnection
    ws.on("close", () => {
      console.log("Client disconnected");
      const index = clients.indexOf(ws);
      if (index !== -1) {
        clients.splice(index, 1);
      }
    });

    ws.on("message", (rawData: WebSocket.RawData) => {
      let msg: UnifiedChatMessage;
      try {
        msg = JSON.parse(Buffer.from(rawData as Buffer).toString("utf8")) as UnifiedChatMessage;
      } catch (err) {
        console.error("Failed to parse incoming WebSocket message:", err);
        return;
      }

      if (!msg.message?.text) {
        return;
      }

      if (msg.channel.name !== "Admin" && msg.message.text.charAt(0) !== "!") {
        sendChatMessage(msg, false);
      }
      handleChatMessage(msg);
    });
  });
}

export function handleChatMessage(msg: UnifiedChatMessage) {
  // Example handling function that processes the message
  // console.log(`Received message from ${msg.author.name}: ${msg.message.text}`);

  // console.log(
  //   util.inspect(msg, {
  //     showHidden: false,
  //     depth: null,
  //     colors: true,
  //   })
  // );

  if (!msg.message?.text) {
    return;
  }

  if (msg.author.displayName.includes("Wingbot953")) {
    // console.log(`Message from ${msg.author.displayName}, ignoring.`);
    return;
  } else if (msg.author.displayName == "Admin" && msg.platform == "system") {
    // console.log("Message from Admin.")
  }

  // Add ID and timestamp if not provided
  // if (!msg.id) {
  //     msg.id = uuidv4()
  // }

  sendToWebSocketClients(msg);

  try {
    QuizManager.getInstance().handleMessage(msg);
  } catch (err) {
    console.error("QuizManager.handleMessage failed:", err);
  }

  Converse(msg.author.displayName, msg);

  if (TwitchManager.getInstance().live) {
    void CheckForWelcomeMessage(msg).catch((err) =>
      console.error("CheckForWelcomeMessage failed:", err)
    );
    void TwitchManager.getInstance().subscriberFirstMessageQuiz(msg).catch((err) =>
      console.error("subscriberFirstMessageQuiz failed:", err)
    );
  }

  /* COMMAND DICTIONARIES */
  let commandExecuted = SearchCommandDictionary(msg, commandMap);

  if (!commandExecuted) {
    commandExecuted = SearchCommandDictionary(msg, quoteMap);
  }
  if (!commandExecuted) {
    SearchCommandDictionary(msg, functionMap);
  }

  // if (!commandExecuted && msg.message.text.charAt(0) == "!") {
  //   let message = structuredClone(Wingbot953Message);
  //   message.platform = msg.platform;
  //   message.message.text = "Unknown command";
  //   message.replyingTo = msg;
  //   message.channel = msg.channel;

  //   sendChatMessage(message);
  // }
}

export function sendChatMessage(
  msg: UnifiedChatMessage,
  sendToWebSocket: boolean = true,
  sendToPlatform: boolean = true
) {
  // console.log(
  //     `Sending response to ${msg.replyingTo?.author.name || ""}: ${
  //         msg.message.text
  //     }`
  // )

  // console.log(
  //     util.inspect(msg, {
  //         showHidden: false,
  //         depth: null,
  //         colors: true,
  //     })
  // )

  if (
    (msg.platform === "youtube" || msg.platform === "all") &&
    sendToPlatform
  ) {
    // Handle YouTube-specific response logic
    void YouTubeManager.getInstance().sendMessage(msg.message.text).catch((err) =>
      console.error("YouTubeManager.sendMessage failed:", err)
    );
  }
  if ((msg.platform === "twitch" || msg.platform === "all") && sendToPlatform) {
    // Handle Twitch-specific response logic
    TwitchManager.getInstance().sendMessage(msg.message.text);
  }

  if (sendToWebSocket) {
    sendToWebSocketClients(msg);
  }
}

function sendToWebSocketClients(msg: UnifiedChatMessage) {
  if (!msg.timestamp) {
    msg.timestamp = new Date();
  }

  const messageString = JSON.stringify(msg);

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageString);
    }
  });
}

///
/// Searches the given command dictionary and performs the required
/// actions if a command is found.
///
interface CommandEntry {
  Command: string[];
  Message?: string[];
  Function?: (msg: UnifiedChatMessage) => void;
  Username?: string[];
  AllMessages?: boolean;
}

function SearchCommandDictionary(
  msg: UnifiedChatMessage,
  commandDictionary: CommandEntry[]
) {
  const command = msg.message.text.split(" ")[0].trim().toLowerCase();

  const commandMessage = structuredClone(Wingbot953Message);
  commandMessage.platform = msg.platform;

  for (const entry of commandDictionary) {
    // Check if the command exists.
    if (entry.Command.includes(command)) {
      // Check if the user is authorised.
      if (
        entry.Username &&
        !entry.Username.includes(msg.author.displayName)
      ) {
        continue;
      }

      if (entry.Function) {
        entry.Function(msg);
      } else if (entry.AllMessages && entry.Message) {
        // Send all messages.
        for (
          let commandMessageIndex = 0;
          commandMessageIndex < entry.Message.length;
          commandMessageIndex++
        ) {
          commandMessage.message.text =
            entry.Message[commandMessageIndex];
          sendChatMessage(commandMessage);
        }
      } else if (entry.Message) {
        // Pick a random message from the list and send.
        const commandMessageIndex = Between(
          0,
          entry.Message.length - 1
        );

        commandMessage.message.text =
          entry.Message[commandMessageIndex];
        sendChatMessage(commandMessage);
      }
      return true;
    }
  }
  return false;
}

const periodicTwitchMessages = [
  "/me Enjoying the stream? Check out below the stream for different ways to support the stream! Your support allows me to continue investing time into the channel and it is greatly appreciated!",
  "/me Got a song to share? Subs can add songs to the queue with !sr.",
  "/me Join the Wingman953 Discord Server here: https://discord.gg/6KPBTApkJ8",
  "/me I also stream on YouTube, make sure to subscribe there! https://www.youtube.com/@Wingman953",
  "You got this streamer! Keep up the good work!",
  "wingma14Jam",
];

const periodicYouTubeMessages = [
  "Enjoying the stream? Make sure to subscribe and check the description for different ways to support the stream! All support is greatly appreciated!",
  "Join the Wingman953 Discord Server here: https://discord.gg/6KPBTApkJ8",
  "You got this streamer! Keep up the good work!",
];

export function PeriodicTwitchMessages() {
  const periodicMessage = structuredClone(Wingbot953Message);
  periodicMessage.platform = "twitch";
  periodicMessage.message.text =
    periodicTwitchMessages[Between(0, periodicTwitchMessages.length - 1)];
  sendChatMessage(periodicMessage, false);
}

export function PeriodicYouTubeMessages() {
  const periodicMessage = structuredClone(Wingbot953Message);
  periodicMessage.platform = "youtube";
  periodicMessage.message.text =
    periodicYouTubeMessages[Between(0, periodicYouTubeMessages.length - 1)];
  sendChatMessage(periodicMessage, false);
}

function Converse(user: string, msg: UnifiedChatMessage) {
  const msgWords = msg.message.text.split(" ")[0].trim().toLowerCase();
  if (msgWords === "is" && Between(0, 99) < 40) {
    const converseMessage = structuredClone(Wingbot953Message);
    converseMessage.platform = msg.platform;
    converseMessage.message.text =
      converseResponses[Between(0, converseResponses.length - 1)];
    sendChatMessage(converseMessage);
  }
}

const converseResponses = [
  "yea jon",
  "correct jacob",
  "truthful sean",
  "definitely joseph",
  "exactly hurricane",
  "precisely vance",
  "affirmative nik",
  "absolutely andrew",
  "agreed matt",
  "excellent jack",
  "splendid grant",
  "unquestionably neil",
  "positively brent",
  "okeydokey brayden",
];
