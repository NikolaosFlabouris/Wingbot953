import { UnifiedChatMessage } from "../../Common/UnifiedChatMessage";
import { apiClient } from "../Integrations/Twitch";
import { sendChatMessage, Wingbot953Message } from "../MessageHandling";
import { Between, sleep } from "./Utils";
import fs from "fs";

const vipWelcomeFilePath = "./Data/Users/VIPWelcome.json";

var vipWelcome: VipWelcome[];

interface VipWelcome {
  Username: string[];
  UserId: string;
  Platform: string;
  Message: string[];
  Arrived: boolean;
}

export function LoadWelcomeMessages() {
  try {
    const data = fs.readFileSync(vipWelcomeFilePath, "utf8");
    vipWelcome = JSON.parse(data);

    for (var i = 0; i < vipWelcome.length; i++) {
      vipWelcome[i].Arrived = false;
    }
  } catch (err) {
    console.error(err);
  }
}

function SaveWelcomeMessages() {
  // Save the updated data to the file
  fs.writeFile(vipWelcomeFilePath, JSON.stringify(vipWelcome), (err) => {
    if (err) {
      console.error("Error writing to file:", err);
    } else {
      console.log("VIP welcome messages updated successfully.");
    }
  });
}

export async function CheckForVipWelcome(msg: UnifiedChatMessage) {
  for (var i = 0; i < vipWelcome.length; i++) {
    // Check for VIP message either by UserId or by Username
    if (
      (!vipWelcome[i].Arrived &&
        vipWelcome[i].Platform === msg.platform &&
        vipWelcome[i].UserId === msg.author.id) ||
      (!vipWelcome[i].Arrived &&
        vipWelcome[i].Platform === msg.platform &&
        vipWelcome[i].Username.findIndex((element: string) => {
          return element.toLowerCase() === msg.author.displayName.toLowerCase();
        }) >= 0)
    ) {
      console.log(
        `VIP welcome message found for ${msg.author.displayName} (${msg.author.id}) on ${msg.platform}.`,
        `\nFULL MESSAGE: ${JSON.stringify(msg)}`
      );

      var greetingIndex = Between(0, vipWelcome[i].Message.length - 1);

      vipWelcome[i].Arrived = true;

      let vipWelcomeMessage = structuredClone(Wingbot953Message);
      vipWelcomeMessage.platform = "twitch";
      vipWelcomeMessage.message.text = vipWelcome[i].Message[greetingIndex];

      await sleep(1500);
      sendChatMessage(vipWelcomeMessage);
      return;
    }
  }
}

export async function AddVipWelcome(
  username: string,
  userId: string,
  platform: string,
  greeting: string
) {
  let userFound: boolean = false;

  // Match by userId first
  for (var i = 0; i < vipWelcome.length; i++) {
    if (
      vipWelcome[i].UserId === userId &&
      vipWelcome[i].Platform === platform
    ) {
      userFound = true;
      vipWelcome[i].Message.push(greeting);

      // Save the updated data to the file
      SaveWelcomeMessages();
    }
  }

  // If not found by userId, match by username
  if (!userFound) {
    for (var i = 0; i < vipWelcome.length; i++) {
      if (
        vipWelcome[i].Username.findIndex((element: string) => {
          return element.toLowerCase() === username.toLowerCase();
        }) >= 0
      ) {
        console.log(
          `User found by Username and not UserId + Platform. Adding message and updating UserId + Platform.`
        );
        userFound = true;
        vipWelcome[i].Message.push(greeting);
        vipWelcome[i].UserId = userId;
        vipWelcome[i].Platform = platform;

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
        `Error: User ${username} not found. Cannot add VIP welcome message.`
      );
      return;
    }

    let newUser: VipWelcome = {
      Username: [username],
      UserId: user.id,
      Platform: platform,
      Message: [greeting],
      Arrived: false,
    };
    vipWelcome.push(newUser);

    // Save the updated data to the file
    SaveWelcomeMessages();
  }
}

async function UpdateGreetingsWithIDs() {
  LoadWelcomeMessages();
  console.log("Updating VIP welcome messages with IDs...");
  for (let i = 0; i < vipWelcome.length; i++) {
    vipWelcome[i].Platform = "twitch";
  }
  SaveWelcomeMessages();
}
