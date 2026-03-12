import { getHrGlobalData, GetHaloRunsWr } from "./HaloRuns";
import type { HrGame } from "./HaloRunsLogic";
import { TimeSpan } from "../TimeSpan";
import { Between } from "../Commands/Utils";
import { People_Quiz } from "../../Data/Naming/Objects/People_Quiz";
import { Levels_Quiz } from "../../Data/Naming/GamesAndLevels/Levels_Quiz";
import type { QuestionData } from "../Commands/Quiz";

type LevelClass = Record<string, string[]>;

const GAME_TO_LEVELS_MAP: Record<string, LevelClass> = {
  "Halo CE": Levels_Quiz.HCE as unknown as LevelClass,
  "Halo CE Classic": Levels_Quiz.HCE as unknown as LevelClass,
  "Halo 2": Levels_Quiz.H2 as unknown as LevelClass,
  "Halo 2 MCC": Levels_Quiz.H2 as unknown as LevelClass,
  "Halo 3": Levels_Quiz.H3 as unknown as LevelClass,
  "Halo 3: ODST": Levels_Quiz.ODST as unknown as LevelClass,
  "Halo: Reach": Levels_Quiz.Reach as unknown as LevelClass,
  "Halo 4": Levels_Quiz.H4 as unknown as LevelClass,
  "Halo 5": Levels_Quiz.H5 as unknown as LevelClass,
  "Halo Infinite": Levels_Quiz.Infinite as unknown as LevelClass,
};

const DIFFICULTIES = ["Easy", "Legendary"] as const;

function isEligibleGame(game: HrGame): boolean {
  if (game.Name === "Multi Game") return false;

  const hasSolo = game.Categories.some((c) => c.Name === "Solo");
  const hasEasy = game.Difficulties.some((d) => d.Name === "Easy");
  const hasLegendary = game.Difficulties.some((d) => d.Name === "Legendary");

  return hasSolo && hasEasy && hasLegendary;
}

export function lookupPeopleQuizAliases(username: string): string[] | null {
  const props = Object.getOwnPropertyNames(People_Quiz);
  for (const prop of props) {
    const aliases = (People_Quiz as unknown as Record<string, string[]>)[prop];
    if (
      Array.isArray(aliases) &&
      aliases.length > 0 &&
      aliases[0].toLowerCase() === username.toLowerCase()
    ) {
      return aliases;
    }
  }
  return null;
}

export function lookupLevelQuizAliases(
  gameName: string,
  segmentName: string,
): string[] | null {
  const levelClass = GAME_TO_LEVELS_MAP[gameName];
  if (!levelClass) return null;

  const props = Object.getOwnPropertyNames(levelClass);
  for (const prop of props) {
    const aliases = (levelClass as unknown as Record<string, string[]>)[prop];
    if (
      Array.isArray(aliases) &&
      aliases.length > 0 &&
      aliases[0].toLowerCase() === segmentName.toLowerCase()
    ) {
      return aliases;
    }
  }
  return null;
}

export function generateTimeAnswers(time: TimeSpan): string[] {
  const answers: string[] = [];
  const h = time.hours;
  const m = time.minutes;
  const s = time.seconds;

  // Primary format from TimeSpan.string (e.g. "52:18", "1:23:45")
  answers.push(time.string);

  // Padded format with leading zeros (e.g. "00:52:18", "01:23:45")
  const padded = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  if (!answers.includes(padded)) answers.push(padded);

  // Unpadded hh:mm:ss (e.g. "0:52:18")
  const unpadded = `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  if (!answers.includes(unpadded)) answers.push(unpadded);

  // Natural language formats
  if (h > 0) {
    answers.push(`${h}hr ${m}mins ${s}secs`);
    answers.push(`${h}hrs ${m}mins ${s}secs`);
    answers.push(`${h}h ${m}m ${s}s`);
  } else {
    answers.push(`${m}mins ${s}secs`);
    answers.push(`${m}m ${s}s`);
    if (m > 0) {
      answers.push(`${m}min ${s}sec`);
    }
  }

  return answers;
}

export async function generateHaloRunsQuestion(): Promise<QuestionData | null> {
  const globalData = getHrGlobalData();
  if (!globalData) {
    console.log("HaloRuns global data not available for quiz generation");
    return null;
  }

  const eligibleGames = globalData.Games.filter(isEligibleGame);
  if (eligibleGames.length === 0) {
    console.log("No eligible HaloRuns games found for quiz generation");
    return null;
  }

  const game = eligibleGames[Between(0, eligibleGames.length - 1)];
  const difficulty = DIFFICULTIES[Between(0, DIFFICULTIES.length - 1)];
  const segment =
    game.RunnableSegments[Between(0, game.RunnableSegments.length - 1)];

  const wrResult = await GetHaloRunsWr(
    game.Name,
    "Solo",
    segment.Name,
    difficulty,
  );

  if (
    wrResult.Time.totalMilliseconds === 0 ||
    wrResult.Time.totalMilliseconds === TimeSpan.maxValue.totalMilliseconds
  ) {
    console.log(
      `No valid WR for ${game.Name} Solo ${segment.Name} ${difficulty}`,
    );
    return null;
  }

  if (wrResult.Points < 100) {
    console.log(
      `Skipping ${game.Name} Solo ${segment.Name} ${difficulty} — only worth ${wrResult.Points} points`,
    );
    return null;
  }

  // Parse usernames (tied records separated by " & ")
  const usernames = wrResult.Usernames.split(" & ").map((u) => u.trim());

  // Validate all record holders exist in People_Quiz before generating any question type
  const allRunnerAliases: string[][] = [];
  for (const username of usernames) {
    const aliases = lookupPeopleQuizAliases(username);
    if (!aliases) {
      console.log(
        `HaloRuns quiz: Runner "${username}" not found in People_Quiz`,
      );
      return null;
    }
    allRunnerAliases.push(aliases);
  }

  // Build list of question types we can generate
  const questionTypes: string[] = ["who", "time"];
  const isFullGame = segment.Name === "Full Game";
  if (!isFullGame) {
    const levelAliases = lookupLevelQuizAliases(game.Name, segment.Name);
    if (levelAliases) {
      questionTypes.push("level");
    }
  }

  const questionType = questionTypes[Between(0, questionTypes.length - 1)];

  if (questionType === "who") {
    const allAliases = allRunnerAliases.flat();

    return {
      question: `Who has the HaloRuns Record for ${game.Name}, ${segment.Name}, Solo on ${difficulty}?`,
      answer: allAliases[0],
      answers: allAliases,
      categoryName: "HaloRuns Records",
      categoryIndex: -1,
      questionIndex: -1,
    };
  }

  if (questionType === "time") {
    const timeAnswers = generateTimeAnswers(wrResult.Time);

    return {
      question: `What is the HaloRuns Record time for ${game.Name}, ${segment.Name}, Solo on ${difficulty}?`,
      answer: timeAnswers[0],
      answers: timeAnswers,
      categoryName: "HaloRuns Records",
      categoryIndex: -1,
      questionIndex: -1,
    };
  }

  // "level" question type
  const levelAliases = lookupLevelQuizAliases(game.Name, segment.Name);
  if (!levelAliases) {
    // Shouldn't happen since we checked above, but safety fallback
    return null;
  }

  return {
    question: `Which level did ${allRunnerAliases[0][0]} complete in ${wrResult.Time.string} on the ${difficulty} difficulty?`,
    answer: levelAliases[0],
    answers: levelAliases,
    categoryName: "HaloRuns Records",
    categoryIndex: -1,
    questionIndex: -1,
  };
}
