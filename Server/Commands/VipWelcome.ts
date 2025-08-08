import { UnifiedChatMessage } from "../../Common/UnifiedChatMessage";
import { apiClient } from "../Integrations/Twitch";
import { sendChatMessage, Wingbot953Message } from "../MessageHandling";
import { Between, sleep } from "./Utils";
import fs from "fs";

const WelcomeMessageFilePath = "./Data/Users/VIPWelcome.json";

var welcomeMessages: WelcomeMessage[];

interface WelcomeMessage {
  Username: string[];
  UserId: string;
  Platform: string;
  Message: string[];
  Arrived: boolean;
}

export function LoadWelcomeMessages() {
  try {
    const data = fs.readFileSync(WelcomeMessageFilePath, "utf8");
    welcomeMessages = JSON.parse(data);

    for (var i = 0; i < welcomeMessages.length; i++) {
      welcomeMessages[i].Arrived = false;
    }
  } catch (err) {
    console.error(err);
  }
}

function SaveWelcomeMessages() {
  // Save the updated data to the file
  fs.writeFile(
    WelcomeMessageFilePath,
    JSON.stringify(welcomeMessages),
    (err) => {
      if (err) {
        console.error("Error writing to file:", err);
      } else {
        console.log("Welcome messages updated successfully.");
      }
    }
  );
}

export async function CheckForWelcomeMessage(msg: UnifiedChatMessage) {
  for (var i = 0; i < welcomeMessages.length; i++) {
    // Check for welcome message either by UserId or by Username
    if (
      (!welcomeMessages[i].Arrived &&
        welcomeMessages[i].Platform === msg.platform &&
        welcomeMessages[i].UserId === msg.author.id) ||
      (!welcomeMessages[i].Arrived &&
        welcomeMessages[i].Platform === msg.platform &&
        welcomeMessages[i].Username.findIndex((element: string) => {
          return element.toLowerCase() === msg.author.displayName.toLowerCase();
        }) >= 0)
    ) {
      console.log(
        `Welcome message found for ${msg.author.displayName} (${msg.author.id}) on ${msg.platform}.`,
        `\nFULL MESSAGE: ${JSON.stringify(msg)}`
      );

      var greetingIndex = Between(0, welcomeMessages[i].Message.length - 1);

      welcomeMessages[i].Arrived = true;

      let welcome = structuredClone(Wingbot953Message);
      welcome.platform = "twitch";
      welcome.message.text = welcomeMessages[i].Message[greetingIndex];

      await sleep(1500);
      sendChatMessage(welcome);
      return;
    }
  }
}

export async function AddWelcomeMessage(
  username: string,
  userId: string,
  platform: string,
  greeting: string
) {
  let userFound: boolean = false;

  // Match by userId first
  for (var i = 0; i < welcomeMessages.length; i++) {
    if (
      welcomeMessages[i].UserId === userId &&
      welcomeMessages[i].Platform === platform
    ) {
      userFound = true;
      welcomeMessages[i].Message.push(greeting);

      // Save the updated data to the file
      SaveWelcomeMessages();
    }
  }

  // If not found by userId, match by username
  if (!userFound) {
    for (var i = 0; i < welcomeMessages.length; i++) {
      if (
        welcomeMessages[i].Username.findIndex((element: string) => {
          return element.toLowerCase() === username.toLowerCase();
        }) >= 0
      ) {
        console.log(
          `User found by Username and not UserId + Platform. Adding message and updating UserId + Platform.`
        );
        userFound = true;
        welcomeMessages[i].Message.push(greeting);
        welcomeMessages[i].UserId = userId;
        welcomeMessages[i].Platform = platform;

        // Save the updated data to the file
        SaveWelcomeMessages();
      }
    }
  }

  // If not found by username, add a new entry
  if (!userFound) {
    let user = await apiClient.users.getUserByName(username);
    if (!user) {
      console.log(
        `Error: User ${username} not found. Cannot add welcome message.`
      );
      return;
    }

    let newUser: WelcomeMessage = {
      Username: [username],
      UserId: user.id,
      Platform: platform,
      Message: [greeting],
      Arrived: false,
    };
    welcomeMessages.push(newUser);

    // Save the updated data to the file
    SaveWelcomeMessages();
  }
}

async function UpdateGreetingsWithIDs() {
  LoadWelcomeMessages();
  console.log("Updating welcome messages with IDs...");
  for (let i = 0; i < welcomeMessages.length; i++) {
    welcomeMessages[i].Platform = "twitch";
  }
  SaveWelcomeMessages();
}
