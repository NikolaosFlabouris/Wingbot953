import {
  quoteMap,
  HandleHCEQuote,
  HandleH2Quote,
  HandleH3Quote,
  HandleOdstQuote,
  HandleReachQuote,
  HandleH4Quote,
  HandleH5Quote,
  HandleInfiniteQuote,
} from "../Commands/Quotes";
import {
  QuizManager,
  GetQuizLeaderboards,
  GetQuizScore,
  AddQuizScore,
  PublishLeaderboards,
} from "../Commands/Quiz";
import { HandleFastFact } from "../Commands/FastFacts";
import { SpotifyManager } from "../Integrations/Spotify";
import { commandMap } from "./GeneralCommands";
import { TwitchManager } from "../Integrations/Twitch";
import { HandleHaloRunsWr, HandleWingman953Pb } from "../Integrations/HaloRuns";
import { sendChatMessage, Wingbot953Message } from "../MessageHandling";
import { Between } from "./Utils";
import { UnifiedChatMessage } from "../../Common/UnifiedChatMessage";
import { LiveSplitClient } from "../Integrations/LiveSplit";

const commandsList: Array<string> = ["", ""];

// Generates and the commands list
export function GenerateCommandsList() {
  const list = [];

  // Generate commands list
  for (let i = 0; i < commandMap.length; i++) {
    if (
      list.indexOf(commandMap[i].Command[0]) < 0 &&
      commandMap[i].Command[0].includes("!")
    ) {
      list.push(commandMap[i].Command[0]);
    }
  }

  for (let i = 0; i < quoteMap.length; i++) {
    if (list.indexOf(quoteMap[i].Command[0]) < 0) {
      list.push(quoteMap[i].Command[0]);
    }
  }

  for (let i = 0; i < functionMap.length; i++) {
    if (list.indexOf(functionMap[i].Command[0]) < 0) {
      list.push(functionMap[i].Command[0]);
    }
  }

  list.sort();

  for (let i = 0; i < Math.floor(list.length / 2); i++) {
    commandsList[0] = commandsList[0] + " " + list[i];
  }

  for (let i = Math.floor(list.length / 2); i < list.length; i++) {
    commandsList[1] = commandsList[1] + " " + list[i];
  }
}

function HandleCommandsList(msg: UnifiedChatMessage) {
  // Commands list too long, split somehow
  let commandsListMessage = structuredClone(Wingbot953Message);
  commandsListMessage.platform = msg.platform;
  commandsListMessage.message.text = commandsList[0];
  sendChatMessage(commandsListMessage);
  commandsListMessage.message.text = commandsList[1];
  sendChatMessage(commandsListMessage);
}

///
/// Handles the command to produce random number.
///
export function HandleRandomNumberGeneration(msg: UnifiedChatMessage) {
  var originalMessage = msg.message.text;
  var command = originalMessage.split(" ")[0].trim().toLowerCase();

  // Check if 2 arguments have been given
  if (originalMessage.split(" ").length >= 3) {
    // Parse the numbers
    var lower = parseInt(originalMessage.split(" ")[1].trim(), 10);
    var upper = parseInt(originalMessage.split(" ")[2].trim(), 10);

    if (!Number.isNaN(lower) && !Number.isNaN(upper)) {
      var num = Between(lower, upper).toString();

      if (num == "15") {
        num = `${num} moment`;
      }

      if (num == "953") {
        num = `${num} hype`;
      }

      if (num == "2019") {
        num = `${num}, the Year of ODST!`;
      }

      let randomNumberMessage = structuredClone(Wingbot953Message);
      randomNumberMessage.platform = msg.platform;
      randomNumberMessage.message.text = `Your number is: ${num}.`;
      sendChatMessage(randomNumberMessage);
      return;
    }
  }

  let randomNumberMessage = structuredClone(Wingbot953Message);
  randomNumberMessage.platform = msg.platform;
  randomNumberMessage.message.text =
    "Usage: Randomly selects a number between the given numbers (inclusive): !random <number> <number>";
  sendChatMessage(randomNumberMessage);
  return;
}

const functionMap = [
  {
    Command: ["!commands", "!commandsList"],
    Function: HandleCommandsList,
  },
  {
    Command: ["!random", "!range", "!roll"],
    Function: HandleRandomNumberGeneration,
  },
  {
    Command: [
      "!cequote",
      "!cequotes",
      "!hcequote",
      "!hcequotes",
      "!h1quote",
      "!h1quotes",
    ],
    Function: HandleHCEQuote,
  },
  {
    Command: ["!h2quote", "!h2quotes"],
    Function: HandleH2Quote,
  },
  {
    Command: ["!h3quote", "!h3quotes"],
    Function: HandleH3Quote,
  },
  {
    Command: ["!odstquote", "!odstquotes"],
    Function: HandleOdstQuote,
  },
  {
    Command: ["!reachquote", "!reachquotes", "!hrquote", "!hrquotes"],
    Function: HandleReachQuote,
  },
  {
    Command: ["!h4quote", "!h4quotes"],
    Function: HandleH4Quote,
  },
  {
    Command: ["!h5quote", "!h5quotes"],
    Function: HandleH5Quote,
  },
  {
    Command: ["!infinitequote", "!infinitequotes"],
    Function: HandleInfiniteQuote,
  },
  {
    Command: ["!fastfact", "!odstfact"],
    Function: HandleFastFact,
  },
  // Twitch
  {
    Command: ["!followage"],
    Function: (msg: UnifiedChatMessage) => TwitchManager.getInstance().handleFollowAge(msg),
  },
  {
    Command: ["!uptime"],
    Function: (msg: UnifiedChatMessage) => TwitchManager.getInstance().handleUptime(msg),
  },
  // Spotify
  {
    Command: ["!song"],
    Function: (msg: UnifiedChatMessage) => SpotifyManager.getInstance().getCurrentSong(msg),
  },
  {
    Command: ["!sr", "!songrequest"],
    Function: (msg: UnifiedChatMessage) => SpotifyManager.getInstance().addSongToQueue(msg),
  },
  {
    Command: ["!songyear"],
    Function: (msg: UnifiedChatMessage) => SpotifyManager.getInstance().getSongYear(msg),
  },
  {
    Command: ["!2013"],
    Username: ["Wingman953", "Wingbot953", "thiccElite"],
    Function: (msg: UnifiedChatMessage) => SpotifyManager.getInstance().is2013Song(msg),
  },
  // HaloRuns
  {
    Command: ["!wr"],
    Function: HandleHaloRunsWr,
  },
  {
    Command: ["!pb"],
    Function: HandleWingman953Pb,
  },
  // Quiz
  {
    Command: ["!quizstart"],
    Username: ["Wingman953", "Wingbot953"],
    Function: () => QuizManager.getInstance().queueQuiz(),
  },
  {
    Command: ["!quizscore", "!score", "!points"],
    Function: GetQuizScore,
  },
  {
    Command: ["!addscore"],
    Username: ["Wingman953", "Wingbot953"],
    Function: AddQuizScore,
  },
  {
    Command: [
      "!quizleaderboard",
      "!quizleaderboards",
      "!leaderboards",
      "!leaderboard",
    ],
    Function: GetQuizLeaderboards,
  },
  // Admin
  {
    Command: [
      "!setsplittable",
      "!setsplittablegame",
      "!setlivesplitgame",
      "!setgame",
      "!settable",
    ],
    Username: ["Wingman953", "Wingbot953"],
    Function: (msg: UnifiedChatMessage) => {
      LiveSplitClient.getInstance().setGame(msg);
    },
  },
  {
    Command: ["!runad"],
    Username: ["Wingman953", "Wingbot953"],
    Function: (msg: UnifiedChatMessage) => TwitchManager.getInstance().runAd(msg),
  },
  {
    Command: ["!publishleaderboards"],
    Username: ["Wingman953", "Wingbot953"],
    Function: PublishLeaderboards,
  },
  // {
  //     Command: ["!publishnewleaderboard"],
  //     Username: ["Wingman953", "Wingbot953"],
  //     Function: PublishNewLeaderboard,
  // },
  // {
  //     Command: ["!createreward"],
  //     Username: ["Wingman953", "Wingbot953"],
  //     Function: CreateReward,
  // },
];

export default functionMap;
