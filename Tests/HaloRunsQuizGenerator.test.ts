import { describe, it, expect, vi, beforeEach } from "vitest";
import { TimeSpan } from "../Server/TimeSpan";

const mockGetHrGlobalData = vi.fn();
const mockGetHaloRunsWr = vi.fn();

vi.mock("../Server/Integrations/HaloRuns", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    getHrGlobalData: (...args: unknown[]) => mockGetHrGlobalData(...args),
    GetHaloRunsWr: (...args: unknown[]) => mockGetHaloRunsWr(...args),
  };
});

import {
  generateHaloRunsQuestion,
  generateTimeAnswers,
  lookupPeopleQuizAliases,
  lookupLevelQuizAliases,
} from "../Server/Integrations/HaloRunsQuizGenerator";
import type { HrGlobalData } from "../Server/Integrations/HaloRunsLogic";

function makeGlobalData(games?: HrGlobalData["Games"]): HrGlobalData {
  return {
    Games: games ?? [
      {
        Name: "Halo 3: ODST",
        Id: "odst-id",
        Categories: [{ Name: "Solo", Id: "solo-id" }],
        RunnableSegments: [
          { Name: "Full Game", Id: "fg-id" },
          { Name: "Tayari Plaza", Id: "tp-id" },
        ],
        Difficulties: [
          { Name: "Easy", Id: "easy-id" },
          { Name: "Legendary", Id: "leg-id" },
        ],
      },
    ],
  };
}

function makeWrResult(overrides: Record<string, unknown> = {}) {
  return {
    GameName: "Halo 3: ODST",
    Category: "Solo",
    RunnableSegment: "Tayari Plaza",
    Difficulty: "Easy",
    Time: TimeSpan.fromTime(0, 1, 30),
    Usernames: "GarishGoblin",
    Video: "https://example.com",
    Rank: 0,
    Points: 100,
    ...overrides,
  };
}

describe("lookupPeopleQuizAliases", () => {
  it("returns aliases for known runner (case-insensitive)", () => {
    const result = lookupPeopleQuizAliases("GarishGoblin");
    expect(result).not.toBeNull();
    expect(result![0]).toBe("GarishGoblin");
    expect(result).toContain("Garish");
  });

  it("matches case-insensitively", () => {
    const result = lookupPeopleQuizAliases("garishgoblin");
    expect(result).not.toBeNull();
    expect(result![0]).toBe("GarishGoblin");
  });

  it("returns null for unknown runner", () => {
    expect(lookupPeopleQuizAliases("UnknownRunner123")).toBeNull();
  });
});

describe("lookupLevelQuizAliases", () => {
  it("returns aliases for known level", () => {
    const result = lookupLevelQuizAliases("Halo 3: ODST", "Tayari Plaza");
    expect(result).not.toBeNull();
    expect(result![0]).toBe("Tayari Plaza");
  });

  it("matches level name case-insensitively", () => {
    const result = lookupLevelQuizAliases("Halo 3: ODST", "tayari plaza");
    expect(result).not.toBeNull();
    expect(result![0]).toBe("Tayari Plaza");
  });

  it("returns null for unknown game", () => {
    expect(lookupLevelQuizAliases("Unknown Game", "Some Level")).toBeNull();
  });

  it("returns null for unknown level in known game", () => {
    expect(
      lookupLevelQuizAliases("Halo 3: ODST", "Nonexistent Level")
    ).toBeNull();
  });

  it("maps Halo CE Classic to HCE levels", () => {
    const result = lookupLevelQuizAliases(
      "Halo CE Classic",
      "The Pillar of Autumn"
    );
    expect(result).not.toBeNull();
    expect(result![0]).toBe("The Pillar of Autumn");
  });

  it("maps Halo 2 MCC to H2 levels", () => {
    const result = lookupLevelQuizAliases("Halo 2 MCC", "Cairo Station");
    expect(result).not.toBeNull();
    expect(result![0]).toBe("Cairo Station");
  });
});

describe("generateTimeAnswers", () => {
  it("generates multiple formats for minutes and seconds", () => {
    const time = TimeSpan.fromTime(0, 52, 18);
    const answers = generateTimeAnswers(time);
    expect(answers).toContain("52:18");
    expect(answers).toContain("00:52:18");
    expect(answers).toContain("52mins 18secs");
    expect(answers).toContain("52m 18s");
  });

  it("generates formats with hours", () => {
    const time = TimeSpan.fromTime(1, 23, 45);
    const answers = generateTimeAnswers(time);
    expect(answers).toContain("1:23:45");
    expect(answers).toContain("01:23:45");
    expect(answers).toContain("1hr 23mins 45secs");
    expect(answers).toContain("1hrs 23mins 45secs");
    expect(answers).toContain("1h 23m 45s");
  });

  it("all answers represent the same time", () => {
    const time = TimeSpan.fromTime(0, 5, 3);
    const answers = generateTimeAnswers(time);
    expect(answers.length).toBeGreaterThan(1);
    // Primary answer should be from TimeSpan.string
    expect(answers[0]).toBe(time.string);
  });
});

describe("generateHaloRunsQuestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when HrGlobalData is undefined", async () => {
    mockGetHrGlobalData.mockReturnValue(undefined);
    const result = await generateHaloRunsQuestion();
    expect(result).toBeNull();
  });

  it("returns null when API returns TimeSpan.zero", async () => {
    mockGetHrGlobalData.mockReturnValue(makeGlobalData());
    mockGetHaloRunsWr.mockResolvedValue(
      makeWrResult({ Time: TimeSpan.zero })
    );
    const result = await generateHaloRunsQuestion();
    expect(result).toBeNull();
  });

  it("returns null when API returns TimeSpan.maxValue", async () => {
    mockGetHrGlobalData.mockReturnValue(makeGlobalData());
    mockGetHaloRunsWr.mockResolvedValue(
      makeWrResult({ Time: TimeSpan.maxValue })
    );
    const result = await generateHaloRunsQuestion();
    expect(result).toBeNull();
  });

  it("returns null when runner is not in People_Quiz", async () => {
    mockGetHrGlobalData.mockReturnValue(makeGlobalData());
    mockGetHaloRunsWr.mockResolvedValue(
      makeWrResult({ Usernames: "UnknownRunner999" })
    );
    const result = await generateHaloRunsQuestion();
    expect(result).toBeNull();
  });

  it('generates a "who" question with correct aliases', async () => {
    mockGetHrGlobalData.mockReturnValue(makeGlobalData());
    mockGetHaloRunsWr.mockResolvedValue(makeWrResult());

    // Run multiple times to hit the "who" question type
    let whoQuestion = null;
    for (let i = 0; i < 50; i++) {
      const result = await generateHaloRunsQuestion();
      if (result && result.question.startsWith("Who has")) {
        whoQuestion = result;
        break;
      }
    }

    if (whoQuestion) {
      expect(whoQuestion.categoryName).toBe("HaloRuns Records");
      expect(whoQuestion.answers).toContain("GarishGoblin");
      expect(whoQuestion.answers).toContain("Garish");
      expect(whoQuestion.question).toContain("Solo");
    }
  });

  it('generates a "time" question with multiple accepted formats', async () => {
    mockGetHrGlobalData.mockReturnValue(makeGlobalData());
    mockGetHaloRunsWr.mockResolvedValue(makeWrResult());

    let timeQuestion = null;
    for (let i = 0; i < 50; i++) {
      const result = await generateHaloRunsQuestion();
      if (result && result.question.startsWith("What is")) {
        timeQuestion = result;
        break;
      }
    }

    if (timeQuestion) {
      expect(timeQuestion.categoryName).toBe("HaloRuns Records");
      expect(timeQuestion.answers.length).toBeGreaterThan(1);
      expect(timeQuestion.question).toContain("Solo");
    }
  });

  it('generates a "which level" question for IL segments', async () => {
    mockGetHrGlobalData.mockReturnValue(
      makeGlobalData([
        {
          Name: "Halo 3: ODST",
          Id: "odst-id",
          Categories: [{ Name: "Solo", Id: "solo-id" }],
          RunnableSegments: [{ Name: "Tayari Plaza", Id: "tp-id" }],
          Difficulties: [
            { Name: "Easy", Id: "easy-id" },
            { Name: "Legendary", Id: "leg-id" },
          ],
        },
      ])
    );
    mockGetHaloRunsWr.mockResolvedValue(makeWrResult());

    let levelQuestion = null;
    for (let i = 0; i < 100; i++) {
      const result = await generateHaloRunsQuestion();
      if (result && result.question.startsWith("Which level")) {
        levelQuestion = result;
        break;
      }
    }

    if (levelQuestion) {
      expect(levelQuestion.categoryName).toBe("HaloRuns Records");
      expect(levelQuestion.answers).toContain("Tayari Plaza");
      expect(levelQuestion.question).toContain("difficulty");
    }
  });

  it('"which level" is excluded for Full Game segments', async () => {
    mockGetHrGlobalData.mockReturnValue(
      makeGlobalData([
        {
          Name: "Halo 3: ODST",
          Id: "odst-id",
          Categories: [{ Name: "Solo", Id: "solo-id" }],
          RunnableSegments: [{ Name: "Full Game", Id: "fg-id" }],
          Difficulties: [
            { Name: "Easy", Id: "easy-id" },
            { Name: "Legendary", Id: "leg-id" },
          ],
        },
      ])
    );
    mockGetHaloRunsWr.mockResolvedValue(
      makeWrResult({ RunnableSegment: "Full Game" })
    );

    for (let i = 0; i < 30; i++) {
      const result = await generateHaloRunsQuestion();
      if (result) {
        expect(result.question).not.toMatch(/^Which level/);
      }
    }
  });

  it("returns null when segment is worth less than 100 points", async () => {
    mockGetHrGlobalData.mockReturnValue(makeGlobalData());
    mockGetHaloRunsWr.mockResolvedValue(makeWrResult({ Points: 50 }));
    const result = await generateHaloRunsQuestion();
    expect(result).toBeNull();
  });

  it("handles tied records with multiple runners", async () => {
    mockGetHrGlobalData.mockReturnValue(makeGlobalData());
    mockGetHaloRunsWr.mockResolvedValue(
      makeWrResult({ Usernames: "GarishGoblin & Goatrope" })
    );

    let whoQuestion = null;
    for (let i = 0; i < 50; i++) {
      const result = await generateHaloRunsQuestion();
      if (result && result.question.startsWith("Who has")) {
        whoQuestion = result;
        break;
      }
    }

    if (whoQuestion) {
      expect(whoQuestion.answers).toContain("GarishGoblin");
      expect(whoQuestion.answers).toContain("Garish");
      expect(whoQuestion.answers).toContain("Goatrope");
      expect(whoQuestion.answers).toContain("Goat");
    }
  });

  it("excludes Multi Game", async () => {
    mockGetHrGlobalData.mockReturnValue(
      makeGlobalData([
        {
          Name: "Multi Game",
          Id: "mg-id",
          Categories: [{ Name: "Solo", Id: "solo-id" }],
          RunnableSegments: [{ Name: "Full Game", Id: "fg-id" }],
          Difficulties: [
            { Name: "Easy", Id: "easy-id" },
            { Name: "Legendary", Id: "leg-id" },
          ],
        },
      ])
    );

    const result = await generateHaloRunsQuestion();
    expect(result).toBeNull();
  });

  it("excludes games without Solo category", async () => {
    mockGetHrGlobalData.mockReturnValue(
      makeGlobalData([
        {
          Name: "Halo 3",
          Id: "h3-id",
          Categories: [{ Name: "Coop", Id: "coop-id" }],
          RunnableSegments: [{ Name: "Full Game", Id: "fg-id" }],
          Difficulties: [
            { Name: "Easy", Id: "easy-id" },
            { Name: "Legendary", Id: "leg-id" },
          ],
        },
      ])
    );

    const result = await generateHaloRunsQuestion();
    expect(result).toBeNull();
  });

  it("excludes games without Easy or Legendary difficulty", async () => {
    mockGetHrGlobalData.mockReturnValue(
      makeGlobalData([
        {
          Name: "Halo 3",
          Id: "h3-id",
          Categories: [{ Name: "Solo", Id: "solo-id" }],
          RunnableSegments: [{ Name: "Full Game", Id: "fg-id" }],
          Difficulties: [{ Name: "Normal", Id: "norm-id" }],
        },
      ])
    );

    const result = await generateHaloRunsQuestion();
    expect(result).toBeNull();
  });
});
