import https from "https";

import { CommandNaming } from "../../Data/Naming/CommandNaming";
import { sendChatMessage, Wingbot953Message } from "../MessageHandling";
import { UnifiedChatMessage } from "../../Common/UnifiedChatMessage";
import { TimeSpan } from "../TimeSpan";
import { numberToOrdinal } from "../Commands/Utils";

const hrApiHostName = "https://api.haloruns.com/";

const Wingman953HrId = "c6f4a6e2-b5b8-4012-acb5-53bbf9dc54f9";

const hrGeneralUrl = "/content/metadata/global.json";
const wingman953ProfileUrl = `/content/users/${Wingman953HrId}/career.json`;

let hrGeneralJson: any;
let wingman953ProfileJson: any;

export interface HaloRunsTime {
  GameName: string;
  Category: string;
  RunnableSegment: string;
  Difficulty: string;
  Time: TimeSpan;
  Usernames: string;
  Video: string;
  Rank: number;
}

export async function HaloRunsSetup() {
  try {
    // Read HR Global data
    const generalResponse = await new Promise((resolve, reject) => {
      const req = https.get(hrApiHostName + hrGeneralUrl, (res) => {
        let data = "";
        res.on("data", (stream) => (data += stream));
        res.on("end", () => resolve(data));
      });
      req.on("error", reject);
    });
    hrGeneralJson = JSON.parse(generalResponse as string);

    // Read Wingman953 HR Profile data
    const profileResponse = await new Promise((resolve, reject) => {
      const req = https.get(hrApiHostName + wingman953ProfileUrl, (res) => {
        let data = "";
        res.on("data", (stream) => (data += stream));
        res.on("end", () => resolve(data));
      });
      req.on("error", reject);
    });
    wingman953ProfileJson = JSON.parse(profileResponse as string);
  } catch (error: any) {
    console.log("Error fetching data:", error.message);
  }
}

export async function HandleHaloRunsWr(msg: UnifiedChatMessage) {
  let msgSplitArray = msg.message.text.toLowerCase().split(" ");

  if (msgSplitArray.length === 1 && msg.message.text.toLowerCase() === "!wr") {
    let hrMessage = structuredClone(Wingbot953Message);
    hrMessage.platform = msg.platform;

    let haloRunsTime = await GetHaloRunsWr(
      "Halo 3: ODST",
      "Solo",
      "Full Game",
      "Easy"
    );

    hrMessage.message.text = `The HaloRuns Record for ${haloRunsTime.GameName}, ${haloRunsTime.Category}, ${haloRunsTime.RunnableSegment}, ${haloRunsTime.Difficulty} is ${haloRunsTime.Time.string} by ${haloRunsTime.Usernames} | ${haloRunsTime.Video}`;
    sendChatMessage(hrMessage);

    haloRunsTime = await GetHaloRunsWr(
      "Halo 3: ODST",
      "Solo",
      "Full Game",
      "Legendary"
    );
    hrMessage.message.text = `The HaloRuns Record for ${haloRunsTime.GameName}, ${haloRunsTime.Category}, ${haloRunsTime.RunnableSegment}, ${haloRunsTime.Difficulty} is ${haloRunsTime.Time.string} by ${haloRunsTime.Usernames} | ${haloRunsTime.Video}`;
    sendChatMessage(hrMessage);
    return;
  } else if (msgSplitArray.length != 5) {
    let hrMessage = structuredClone(Wingbot953Message);
    hrMessage.platform = msg.platform;
    hrMessage.message.text = `Incorrect number of parameters for !wr command`;
    sendChatMessage(hrMessage);
    return;
  }

  let hrNames: string[] = FindHaloRunsCompatibleNames(
    msgSplitArray[1].trim().toLowerCase(), //gameName
    msgSplitArray[2].trim().toLowerCase(), //category
    msgSplitArray[3].trim().toLowerCase(), //runnableSegment
    msgSplitArray[4].trim().toLowerCase(), //difficulty
    msg
  );

  if (hrNames.length === 4) {
    const haloRunsTime = await GetHaloRunsWr(
      hrNames[0],
      hrNames[1],
      hrNames[2],
      hrNames[3]
    );

    let hrMessage = structuredClone(Wingbot953Message);
    hrMessage.platform = msg.platform;

    if (haloRunsTime.Time === TimeSpan.zero) {
      hrMessage.message.text = `Failed to find HaloRuns Record. Please check the parameters and try again.`;
    } else if (haloRunsTime.Time === TimeSpan.maxValue) {
      hrMessage.message.text = `There is no HaloRuns Record for ${haloRunsTime.GameName} ${haloRunsTime.Category} ${haloRunsTime.RunnableSegment} ${haloRunsTime.Difficulty}`;
    } else {
      hrMessage.message.text = `The HaloRuns Record for ${haloRunsTime.GameName}, ${haloRunsTime.Category}, ${haloRunsTime.RunnableSegment}, ${haloRunsTime.Difficulty} is ${haloRunsTime.Time.string} by ${haloRunsTime.Usernames} | ${haloRunsTime.Video}`;
    }
    sendChatMessage(hrMessage);
  }
}

export async function GetHaloRunsWr(
  hrGameName: string,
  hrCategory: string,
  hrRunnableSegment: string,
  hrDifficulty: string
): Promise<HaloRunsTime> {
  // Search HaloRuns global.json for Game, Category and Runnable Segment IDs

  let wrHaloRunsTime: HaloRunsTime = {
    GameName: hrGameName,
    Category: hrCategory,
    RunnableSegment: hrRunnableSegment,
    Difficulty: hrDifficulty,
    Time: TimeSpan.zero,
    Usernames: "",
    Video: "",
    Rank: 0,
  };

  console.log(hrGameName, hrCategory, hrRunnableSegment, hrDifficulty);

  let hrGameIndex = hrGeneralJson.Games.findIndex((element: any) => {
    return element.Name === hrGameName;
  });

  if (hrGameIndex < 0) {
    // hrMessage.message.text = "Failed to find game on HaloRuns"
    return wrHaloRunsTime;
  }

  let hrCategoryIndex = hrGeneralJson.Games[hrGameIndex].Categories.findIndex(
    (element: any) => {
      return element.Name === hrCategory;
    }
  );

  if (hrCategoryIndex < 0) {
    // hrMessage.message.text = "Failed to find category on HaloRuns"
    console.log("Failed to find category on HaloRuns");
    return wrHaloRunsTime;
  }

  let hrRunnableSegmentIndex = hrGeneralJson.Games[
    hrGameIndex
  ].RunnableSegments.findIndex((element: any) => {
    return element.Name === hrRunnableSegment;
  });

  if (hrRunnableSegmentIndex < 0) {
    // hrMessage.message.text = "Failed to find runnable segment on HaloRuns"
    console.log("Failed to find runnable segment on HaloRuns");
    return wrHaloRunsTime;
  }

  let hrDifficultyIndex = hrGeneralJson.Games[
    hrGameIndex
  ].Difficulties.findIndex((element: any) => {
    return element.Name === hrDifficulty;
  });

  if (hrDifficultyIndex < 0) {
    // hrMessage.message.text = "Failed to find difficulty on HaloRuns"
    console.log("Failed to find difficulty on HaloRuns");
    return wrHaloRunsTime;
  }

  let hrGameId: string = hrGeneralJson.Games[hrGameIndex].Id;

  let hrCategoryId: string =
    hrGeneralJson.Games[hrGameIndex].Categories[hrCategoryIndex].Id;

  let hrRunnableSegmentId: string =
    hrGeneralJson.Games[hrGameIndex].RunnableSegments[hrRunnableSegmentIndex]
      .Id;

  let hrDifficultyId: string =
    hrGeneralJson.Games[hrGameIndex].Difficulties[hrDifficultyIndex].Id;

  // Perform HaloRuns API request
  let apiUrl =
    hrApiHostName +
    `/content/boards/${hrGameId}/${hrCategoryId}/leaderboard/${hrRunnableSegmentId}/${hrDifficultyId}.json`;

  let leaderboardJson: any;

  return new Promise((resolve, reject) => {
    const req = https.get(
      apiUrl,
      function (res: {
        on: (arg0: string, arg1: { (stream: string): void }) => void;
      }) {
        let data = "";

        res.on("data", function (stream: string) {
          data += stream;
        });

        req.on("error", function (e: { message: any }) {
          console.log(e.message);
          resolve(wrHaloRunsTime);
          return;
        });

        res.on("end", function () {
          // Parse leaderboard for WR info

          try {
            leaderboardJson = JSON.parse(data);

            if (leaderboardJson.Entries.length === 0) {
              // hrMessage.message.text = `There is no HaloRuns Record for ${hrGameName} ${hrCategory} ${hrRunnableSegment} ${hrDifficulty}`
              wrHaloRunsTime.Time = TimeSpan.maxValue;
              return wrHaloRunsTime;
            }

            let wrUsernames: string = "";
            let wrVideo: string = "";

            let stillWrTime = true;
            let entriesIndex = 0;

            while (
              stillWrTime &&
              entriesIndex < leaderboardJson.Entries.length
            ) {
              if (
                leaderboardJson.Entries[entriesIndex].Points ===
                leaderboardJson.Entries[0].Points
              ) {
                if (entriesIndex === 0) {
                  wrUsernames +=
                    leaderboardJson.Entries[0].Participants[0].Username;

                  wrVideo =
                    leaderboardJson.Entries[0].Participants[0].EvidenceLink;
                } else {
                  wrUsernames += ` & ${leaderboardJson.Entries[entriesIndex].Participants[0].Username}`;
                }

                for (
                  let i = 1;
                  i < leaderboardJson.Entries[entriesIndex].Participants.length;
                  i++
                ) {
                  wrUsernames += `, ${leaderboardJson.Entries[0].Participants[i].Username}`;
                }

                entriesIndex++;
              } else {
                stillWrTime = false;
              }
            }

            wrHaloRunsTime.Time = TimeSpan.fromSeconds(
              parseInt(leaderboardJson.Entries[0].Duration, 10)
            );
            wrHaloRunsTime.Usernames = wrUsernames;
            wrHaloRunsTime.Video = wrVideo;

            resolve(wrHaloRunsTime);
          } catch {
            // hrMessage.message.text = `Failed to access HaloRuns Leaderboards`
            console.log("Failed to access HaloRuns Leaderboards");
            resolve(wrHaloRunsTime);
          }
        });
      }
    );
  });
}

export function HandleWingman953Pb(msg: UnifiedChatMessage) {
  let msgSplitArray = msg.message.text.toLowerCase().split(" ");

  if (msgSplitArray.length === 1 && msg.message.text.toLowerCase() === "!pb") {
    let pbMessage = structuredClone(Wingbot953Message);
    pbMessage.platform = msg.platform;

    let haloRunsTime = GetHaloRunsPb(
      "Halo 3: ODST",
      "Solo",
      "Full Game",
      "Easy"
    );
    pbMessage.message.text = `Wingman953's PB for ${haloRunsTime.GameName}, ${
      haloRunsTime.Category
    }, ${haloRunsTime.RunnableSegment}, ${haloRunsTime.Difficulty} is ${
      haloRunsTime.Time.string
    } [${numberToOrdinal(haloRunsTime.Rank)}] | ${haloRunsTime.Video}`;
    sendChatMessage(pbMessage);

    haloRunsTime = GetHaloRunsPb(
      "Halo 3: ODST",
      "Solo",
      "Full Game",
      "Legendary"
    );
    pbMessage.message.text = `Wingman953's PB for ${haloRunsTime.GameName}, ${
      haloRunsTime.Category
    }, ${haloRunsTime.RunnableSegment}, ${haloRunsTime.Difficulty} is ${
      haloRunsTime.Time.string
    } [${numberToOrdinal(haloRunsTime.Rank)}] | ${haloRunsTime.Video}`;
    sendChatMessage(pbMessage);
    return;
  } else if (msgSplitArray.length != 5) {
    let hrMessage = structuredClone(Wingbot953Message);
    hrMessage.platform = msg.platform;
    hrMessage.message.text = `Incorrect number of parameters for !pb command`;
    sendChatMessage(hrMessage);
    return;
  }

  let hrNames: string[] = FindHaloRunsCompatibleNames(
    msgSplitArray[1].trim().toLowerCase(), //gameName
    msgSplitArray[2].trim().toLowerCase(), //category
    msgSplitArray[3].trim().toLowerCase(), //runnableSegment
    msgSplitArray[4].trim().toLowerCase(), //difficulty
    msg
  );

  if (hrNames.length === 4) {
    const haloRunsTime = GetHaloRunsPb(
      hrNames[0],
      hrNames[1],
      hrNames[2],
      hrNames[3]
    );

    let pbMessage = structuredClone(Wingbot953Message);
    pbMessage.platform = msg.platform;

    if (haloRunsTime.Time === TimeSpan.zero) {
      pbMessage.message.text = `Failed to find Wingman953's PB. Please check the parameters and try again.`;
    } else if (haloRunsTime.Time === TimeSpan.maxValue) {
      pbMessage.message.text = `Wingman953 does not have a PB for ${haloRunsTime.GameName} ${haloRunsTime.Category} ${haloRunsTime.RunnableSegment} ${haloRunsTime.Difficulty}`;
    } else {
      pbMessage.message.text = `Wingman953's PB for ${haloRunsTime.GameName}, ${
        haloRunsTime.Category
      }, ${haloRunsTime.RunnableSegment}, ${haloRunsTime.Difficulty} is ${
        haloRunsTime.Time.string
      } [${numberToOrdinal(haloRunsTime.Rank)}] | ${haloRunsTime.Video}`;
    }
    sendChatMessage(pbMessage);
  }
}

export function GetHaloRunsPb(
  hrGameName: string,
  hrCategory: string,
  hrRunnableSegment: string,
  hrDifficulty: string
): HaloRunsTime {
  let pbHaloRunsTime: HaloRunsTime = {
    GameName: hrGameName,
    Category: hrCategory,
    RunnableSegment: hrRunnableSegment,
    Difficulty: hrDifficulty,
    Time: TimeSpan.zero,
    Usernames: "",
    Video: "",
    Rank: -1,
  };

  console.log(hrGameName, hrCategory, hrRunnableSegment, hrDifficulty);

  // Search HaloRuns global.json for Game and Runnable Segment IDs
  let hrGameIndex = hrGeneralJson.Games.findIndex((element: any) => {
    return element.Name === hrGameName;
  });

  if (hrGameIndex < 0) {
    // hrMessage.message.text = "Failed to find game on HaloRuns"
    console.log("Failed to find game on HaloRuns");
    return pbHaloRunsTime;
  }

  let hrRunnableSegmentIndex = hrGeneralJson.Games[
    hrGameIndex
  ].RunnableSegments.findIndex((element: any) => {
    return element.Name === hrRunnableSegment;
  });

  if (hrRunnableSegmentIndex < 0) {
    // hrMessage.message.text = "Failed to find runnable segment on HaloRuns"
    console.log("Failed to find runnable segment on HaloRuns");
    return pbHaloRunsTime;
  }

  let hrDifficultyIndex = hrGeneralJson.Games[
    hrGameIndex
  ].Difficulties.findIndex((element: any) => {
    return element.Name === hrDifficulty;
  });

  if (hrDifficultyIndex < 0) {
    // hrMessage.message.text = "Failed to find difficulty on HaloRuns"
    console.log("Failed to find difficulty on HaloRuns");
    return pbHaloRunsTime;
  }

  let hrGameId: string = hrGeneralJson.Games[hrGameIndex].Id;

  let hrRunnableSegmentId: string =
    hrGeneralJson.Games[hrGameIndex].RunnableSegments[hrRunnableSegmentIndex]
      .Id;

  let hrDifficultyId: string =
    hrGeneralJson.Games[hrGameIndex].Difficulties[hrDifficultyIndex].Id;

  let pbRuns = wingman953ProfileJson.RunsByCategory.Solo;

  if (!hrCategory.includes("Coop")) {
    pbRuns = wingman953ProfileJson.RunsByCategory[hrCategory];

    for (let runIndex = 0; runIndex < pbRuns.length; runIndex++) {
      if (
        pbRuns[runIndex].GameId === hrGameId &&
        pbRuns[runIndex].RunnableSegmentId === hrRunnableSegmentId &&
        pbRuns[runIndex].DifficultyId === hrDifficultyId
      ) {
        pbHaloRunsTime.Video = pbRuns[runIndex].Participants[0].EvidenceLink;

        pbHaloRunsTime.Time = TimeSpan.fromSeconds(
          parseInt(pbRuns[runIndex].Duration, 10)
        );
        pbHaloRunsTime.Usernames = pbRuns[runIndex].Participants[0].Username;

        pbHaloRunsTime.Rank = pbRuns[runIndex].RankInfo.Rank;

        return pbHaloRunsTime;
      }
    }
  }

  if (hrCategory.includes("Coop")) {
    pbRuns = wingman953ProfileJson.RunsByCategory[hrCategory];

    let pbTimeSecs: number = 99999999;
    let pbTime: number = -1;
    let coopUsernames: string = "";
    let pbVideo: string = "";
    let pbRank: number = -1;

    for (let runIndex = 0; runIndex < pbRuns.length; runIndex++) {
      if (
        pbRuns[runIndex].GameId === hrGameId &&
        pbRuns[runIndex].RunnableSegmentId === hrRunnableSegmentId &&
        pbRuns[runIndex].DifficultyId === hrDifficultyId
      ) {
        if (parseInt(pbRuns[runIndex].Duration, 10) < pbTimeSecs) {
          pbTimeSecs = parseInt(pbRuns[runIndex].Duration, 10);
          pbTime = parseInt(pbRuns[runIndex].Duration, 10);

          pbVideo = pbRuns[runIndex].Participants[0].EvidenceLink;
          pbRank = pbRuns[runIndex].RankInfo.Rank;

          coopUsernames = " with ";

          for (let i = 0; i < pbRuns[runIndex].Participants.length; i++) {
            if (pbRuns[runIndex].Participants[i].UserId === Wingman953HrId) {
              continue;
            }

            coopUsernames += `${pbRuns[runIndex].Participants[i].Username}, `;
          }

          coopUsernames = coopUsernames.substring(0, coopUsernames.length - 2);
        }
      }
    }

    if (pbTime > 0) {
      // hrMessage.message.text = `Wingman953's PB for ${hrGameName}, ${hrCategory}, ${hrRunnableSegment}, ${hrDifficulty} is ${pbTime}${coopUsernames} | ${pbVideo}`

      pbHaloRunsTime.Time = TimeSpan.fromSeconds(pbTime);
      pbHaloRunsTime.Usernames = coopUsernames;
      pbHaloRunsTime.Video = pbVideo;
      pbHaloRunsTime.Rank = pbRank;

      return pbHaloRunsTime;
    }
  }

  // hrMessage.message.text = `Wingman953 does not have a submitted time for ${hrGameName}, ${hrCategory}, ${hrRunnableSegment}, ${hrDifficulty}`
  console.log(
    `Wingman953 does not have a submitted time for ${hrGameName}, ${hrCategory}, ${hrRunnableSegment}, ${hrDifficulty}`
  );
  return pbHaloRunsTime;
}

export function FindHaloRunsCompatibleNames(
  gameName: string,
  category: string,
  runnableSegment: string,
  difficulty: string,
  msg: UnifiedChatMessage
) {
  let hrGameName = FindCommandMatch(CommandNaming.Games, gameName);

  let hrMessage = structuredClone(Wingbot953Message);
  hrMessage.platform = msg.platform;

  if (hrGameName === "") {
    hrMessage.message.text = "Failed to parse game";
    sendChatMessage(hrMessage);
    return [];
  }

  let hrCategory = FindCommandMatch(CommandNaming.Categories, category);

  if (hrCategory === "") {
    hrMessage.message.text = "Failed to parse category";
    sendChatMessage(hrMessage);
    return [];
  }

  let hrRunnableSegment = "";

  for (const propertyGame in CommandNaming.Levels) {
    if (
      CommandNaming.Levels[propertyGame].Game.findIndex((element: string) => {
        return element === hrGameName;
      }) >= 0
    ) {
      hrRunnableSegment = FindCommandMatch(
        CommandNaming.Levels[propertyGame],
        runnableSegment
      );
    }
  }

  if (hrRunnableSegment === "") {
    hrMessage.message.text = "Failed to parse runnable segment";
    sendChatMessage(hrMessage);
    return [];
  }

  let hrDifficulty = FindCommandMatch(CommandNaming.Difficulty, difficulty);

  if (hrDifficulty === "") {
    hrMessage.message.text = "Failed to parse difficulty";
    sendChatMessage(hrMessage);
    return [];
  }

  return [hrGameName, hrCategory, hrRunnableSegment, hrDifficulty];
}

function FindCommandMatch(
  commandList: { [key: string]: string[] },
  command: string
) {
  for (const property in commandList) {
    if (
      commandList[property].findIndex((element: string) => {
        return element.toLowerCase() === command;
      }) >= 0
    ) {
      return commandList[property][0];
    }
  }

  return "";
}
