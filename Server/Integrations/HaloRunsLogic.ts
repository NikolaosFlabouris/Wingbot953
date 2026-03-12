import { CommandNaming } from "../../Data/Naming/CommandNaming";
import { TimeSpan } from "../TimeSpan";

export interface HrNamedEntity {
  Name: string;
  Id: string;
}

export interface HrGame {
  Name: string;
  Id: string;
  Categories: HrNamedEntity[];
  RunnableSegments: HrNamedEntity[];
  Difficulties: HrNamedEntity[];
}

export interface HrGlobalData {
  Games: HrGame[];
}

export interface HrParticipant {
  Username: string;
  UserId: string;
  EvidenceLink: string;
}

export interface HrRun {
  GameId: string;
  RunnableSegmentId: string;
  DifficultyId: string;
  Duration: string;
  Participants: HrParticipant[];
  RankInfo: { Rank: number };
}

export interface HrProfileData {
  RunsByCategory: Record<string, HrRun[]>;
}

export interface HrLeaderboardEntry {
  Points: number;
  Duration: string;
  Participants: HrParticipant[];
}

export interface HrLeaderboardData {
  Entries: HrLeaderboardEntry[];
}

export interface HaloRunsTime {
  GameName: string;
  Category: string;
  RunnableSegment: string;
  Difficulty: string;
  Time: TimeSpan;
  Usernames: string;
  Video: string;
  Rank: number;
  Points: number;
}

export type ResolveNamesResult =
  | { success: true; names: [string, string, string, string] }
  | { success: false; error: string };

/**
 * Finds a matching command in a command dictionary.
 * Returns the canonical name (first element) if found, empty string otherwise.
 */
export function findCommandMatch(
  commandList: { [key: string]: string[] },
  command: string
): string {
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

/**
 * Resolves user-provided abbreviations into canonical HaloRuns names.
 * Pure function - returns result or error message without side effects.
 */
export function resolveHaloRunsNames(
  gameName: string,
  category: string,
  runnableSegment: string,
  difficulty: string
): ResolveNamesResult {
  const hrGameName = findCommandMatch(CommandNaming.Games, gameName);
  if (hrGameName === "") {
    return { success: false, error: "Failed to parse game" };
  }

  const hrCategory = findCommandMatch(CommandNaming.Categories, category);
  if (hrCategory === "") {
    return { success: false, error: "Failed to parse category" };
  }

  let hrRunnableSegment = "";
  for (const propertyGame in CommandNaming.Levels) {
    if (
      CommandNaming.Levels[propertyGame].Game.findIndex((element: string) => {
        return element === hrGameName;
      }) >= 0
    ) {
      hrRunnableSegment = findCommandMatch(
        CommandNaming.Levels[propertyGame],
        runnableSegment
      );
    }
  }

  if (hrRunnableSegment === "") {
    return { success: false, error: "Failed to parse runnable segment" };
  }

  const hrDifficulty = findCommandMatch(CommandNaming.Difficulty, difficulty);
  if (hrDifficulty === "") {
    return { success: false, error: "Failed to parse difficulty" };
  }

  return {
    success: true,
    names: [hrGameName, hrCategory, hrRunnableSegment, hrDifficulty],
  };
}

/**
 * Parses leaderboard data to extract world record information.
 * Pure function - operates on already-fetched and parsed data.
 */
export function parseLeaderboardEntries(
  leaderboardData: HrLeaderboardData,
  gameName: string,
  category: string,
  runnableSegment: string,
  difficulty: string
): HaloRunsTime {
  const result: HaloRunsTime = {
    GameName: gameName,
    Category: category,
    RunnableSegment: runnableSegment,
    Difficulty: difficulty,
    Time: TimeSpan.zero,
    Usernames: "",
    Video: "",
    Rank: 0,
    Points: 0,
  };

  if (leaderboardData.Entries.length === 0) {
    result.Time = TimeSpan.maxValue;
    return result;
  }

  let wrUsernames = "";
  let wrVideo = "";
  let stillWrTime = true;
  let entriesIndex = 0;

  while (stillWrTime && entriesIndex < leaderboardData.Entries.length) {
    if (
      leaderboardData.Entries[entriesIndex].Points ===
      leaderboardData.Entries[0].Points
    ) {
      if (entriesIndex === 0) {
        wrUsernames += leaderboardData.Entries[0].Participants[0].Username;
        wrVideo = leaderboardData.Entries[0].Participants[0].EvidenceLink;
      } else {
        wrUsernames += ` & ${leaderboardData.Entries[entriesIndex].Participants[0].Username}`;
      }

      for (
        let i = 1;
        i < leaderboardData.Entries[entriesIndex].Participants.length;
        i++
      ) {
        wrUsernames += `, ${leaderboardData.Entries[0].Participants[i].Username}`;
      }

      entriesIndex++;
    } else {
      stillWrTime = false;
    }
  }

  result.Time = TimeSpan.fromSeconds(
    parseInt(leaderboardData.Entries[0].Duration, 10)
  );
  result.Usernames = wrUsernames;
  result.Video = wrVideo;
  result.Points = leaderboardData.Entries[0].Points;

  return result;
}

/**
 * Searches profile data for a personal best matching the given criteria.
 * Pure function - operates on pre-fetched data.
 */
export function searchProfileForPb(
  globalData: HrGlobalData,
  profileData: HrProfileData,
  gameName: string,
  category: string,
  runnableSegment: string,
  difficulty: string,
  ownerId: string
): HaloRunsTime {
  const result: HaloRunsTime = {
    GameName: gameName,
    Category: category,
    RunnableSegment: runnableSegment,
    Difficulty: difficulty,
    Time: TimeSpan.zero,
    Usernames: "",
    Video: "",
    Rank: -1,
    Points: 0,
  };

  const hrGameIndex = globalData.Games.findIndex((g) => g.Name === gameName);
  if (hrGameIndex < 0) return result;

  const hrSegmentIndex = globalData.Games[
    hrGameIndex
  ].RunnableSegments.findIndex((s) => s.Name === runnableSegment);
  if (hrSegmentIndex < 0) return result;

  const hrDifficultyIndex = globalData.Games[
    hrGameIndex
  ].Difficulties.findIndex((d) => d.Name === difficulty);
  if (hrDifficultyIndex < 0) return result;

  const gameId = globalData.Games[hrGameIndex].Id;
  const segmentId =
    globalData.Games[hrGameIndex].RunnableSegments[hrSegmentIndex].Id;
  const difficultyId =
    globalData.Games[hrGameIndex].Difficulties[hrDifficultyIndex].Id;

  const pbRuns = profileData.RunsByCategory[category];
  if (!pbRuns) return result;

  if (!category.includes("Coop")) {
    for (const run of pbRuns) {
      if (
        run.GameId === gameId &&
        run.RunnableSegmentId === segmentId &&
        run.DifficultyId === difficultyId
      ) {
        result.Video = run.Participants[0].EvidenceLink;
        result.Time = TimeSpan.fromSeconds(parseInt(run.Duration, 10));
        result.Usernames = run.Participants[0].Username;
        result.Rank = run.RankInfo.Rank;
        return result;
      }
    }
  }

  if (category.includes("Coop")) {
    let pbTimeSecs = 99999999;
    let pbTime = -1;
    let coopUsernames = "";
    let pbVideo = "";
    let pbRank = -1;

    for (const run of pbRuns) {
      if (
        run.GameId === gameId &&
        run.RunnableSegmentId === segmentId &&
        run.DifficultyId === difficultyId
      ) {
        if (parseInt(run.Duration, 10) < pbTimeSecs) {
          pbTimeSecs = parseInt(run.Duration, 10);
          pbTime = parseInt(run.Duration, 10);
          pbVideo = run.Participants[0].EvidenceLink;
          pbRank = run.RankInfo.Rank;
          coopUsernames = " with ";

          for (const participant of run.Participants) {
            if (participant.UserId === ownerId) continue;
            coopUsernames += `${participant.Username}, `;
          }

          coopUsernames = coopUsernames.substring(
            0,
            coopUsernames.length - 2
          );
        }
      }
    }

    if (pbTime > 0) {
      result.Time = TimeSpan.fromSeconds(pbTime);
      result.Usernames = coopUsernames;
      result.Video = pbVideo;
      result.Rank = pbRank;
      return result;
    }
  }

  return result;
}
