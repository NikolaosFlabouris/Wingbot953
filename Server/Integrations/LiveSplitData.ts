export interface SplitDetails {
  name: string;
  character: string;
}

export const h1SplitNames: { [key: number]: SplitDetails } = {
  0: { name: "The Pillar of Autumn", character: "Master Chief" },
  1: { name: "Halo", character: "Master Chief" },
  2: { name: "The Truth and Reconciliation", character: "Master Chief" },
  3: { name: "The Silent Cartographer", character: "Master Chief" },
  4: { name: "Assault on the Control Room", character: "Master Chief" },
  5: { name: "343 Guilty Spark", character: "Master Chief" },
  6: { name: "The Library", character: "Master Chief" },
  7: { name: "Two Betrayals", character: "Master Chief" },
  8: { name: "Keyes", character: "Master Chief" },
  9: { name: "The Maw", character: "Master Chief" },
};

export const h2SplitNames: { [key: number]: SplitDetails } = {
  0: { name: "Cairo Station", character: "Master Chief" },
  1: { name: "Outskirts", character: "Master Chief" },
  2: { name: "Metropolis", character: "Master Chief" },
  3: { name: "The Arbiter", character: "Arbiter" },
  4: { name: "The Oracle", character: "Arbiter" },
  5: { name: "Delta Halo", character: "Master Chief" },
  6: { name: "Regret", character: "Master Chief" },
  7: { name: "Sacred Icon", character: "Arbiter" },
  8: { name: "Quarantine Zone", character: "Arbiter" },
  9: { name: "Gravemind", character: "Master Chief" },
  10: { name: "Uprising", character: "Arbiter" },
  11: { name: "High Charity", character: "Master Chief" },
  12: { name: "The Great Journey", character: "Arbiter" },
};

export const h3SplitNames: { [key: number]: SplitDetails } = {
  0: { name: "Sierra 117", character: "Master Chief" },
  1: { name: "Crow's Nest", character: "Master Chief" },
  2: { name: "Tsavo Highway", character: "Master Chief" },
  3: { name: "The Storm", character: "Master Chief" },
  4: { name: "Floodgate", character: "Master Chief" },
  5: { name: "The Ark", character: "Master Chief" },
  6: { name: "The Covenant", character: "Master Chief" },
  7: { name: "Cortana", character: "Master Chief" },
  8: { name: "Halo", character: "Master Chief" },
};

export const odstSplitNames: { [key: number]: SplitDetails } = {
  0: { name: "Prepare to Drop", character: "Rookie" },
  1: { name: "Tayari Plaza", character: "Buck" },
  2: { name: "Streets: Drone Optic", character: "Rookie" },
  3: { name: "Uplift Reserve", character: "Dutch" },
  4: { name: "Streets: Gauss Turret", character: "Rookie" },
  5: { name: "ONI Alpha Site", character: "Dutch" },
  6: { name: "Mombasa Streets 3", character: "Rookie" },
  7: { name: "Kizingo Blvd.", character: "Mickey" },
  8: { name: "Mombasa Streets 4", character: "Rookie" },
  9: { name: "NMPD HQ", character: "Romeo" },
  10: { name: "Mombasa Streets 5", character: "Rookie" },
  11: { name: "Kikowani Station", character: "Buck" },
  12: { name: "Mombasa Streets 6", character: "Rookie" },
  13: { name: "Data Hive", character: "Rookie" },
  14: { name: "Coastal Highway", character: "Rookie" },
};

export const reachSplitNames: { [key: number]: SplitDetails } = {
  0: { name: "Winter Contingency", character: "Noble 6" },
  1: { name: "ONI: Sword Base", character: "Noble 6" },
  2: { name: "Nightfall", character: "Noble 6" },
  3: { name: "Tip of the Spear", character: "Noble 6" },
  4: { name: "Long Night of Solace", character: "Noble 6" },
  5: { name: "Exodus", character: "Noble 6" },
  6: { name: "New Alexandria", character: "Noble 6" },
  7: { name: "The Package", character: "Noble 6" },
  8: { name: "The Pillar of Autumn", character: "Noble 6" },
};

export const h4SplitNames: { [key: number]: SplitDetails } = {
  0: { name: "Dawn", character: "Master Chief" },
  1: { name: "Requiem", character: "Master Chief" },
  2: { name: "Forerunner", character: "Master Chief" },
  3: { name: "Infinity", character: "Master Chief" },
  4: { name: "Reclaimer", character: "Master Chief" },
  5: { name: "Shutdown", character: "Master Chief" },
  6: { name: "Composer", character: "Master Chief" },
  7: { name: "Midnight", character: "Master Chief" },
};

export const h5SplitNames: { [key: number]: SplitDetails } = {
  0: { name: "Osiris", character: "Locke" },
  1: { name: "Blue Team", character: "Master Chief" },
  2: { name: "Glassed", character: "Locke" },
  3: { name: "Meridian Station", character: "Locke" },
  4: { name: "Unconfirmed", character: "Locke" },
  5: { name: "Evacuation", character: "Locke" },
  6: { name: "Reunion", character: "Master Chief" },
  7: { name: "Swords of Sanghelios", character: "Locke" },
  8: { name: "Alliance", character: "Locke" },
  9: { name: "Enemy Lines", character: "Locke" },
  10: { name: "Before the Storm", character: "Locke" },
  11: { name: "Battle of Sunaion", character: "Locke" },
  12: { name: "Genesis", character: "Locke" },
  13: { name: "The Breaking", character: "Master Chief" },
  14: { name: "Guardians", character: "Locke" },
};

export const infiniteSplitNames: { [key: number]: SplitDetails } = {};

export const gameToSplitMapping: {
  [key: string]: { [key: number]: SplitDetails };
} = {
  "Halo CE": h1SplitNames,
  "Halo CE Classic": h1SplitNames,
  "Halo 2": h2SplitNames,
  "Halo 2 MCC": h2SplitNames,
  "Halo 3": h3SplitNames,
  "Halo 3: ODST": odstSplitNames,
  "Halo: Reach": reachSplitNames,
  "Halo 4": h4SplitNames,
  "Halo 5": h5SplitNames,
  "Halo Infinite": infiniteSplitNames,
};

/**
 * Finds the character for a given segment name within a split table.
 */
export function findCharacterForSegment(
  splitNames: { [key: number]: SplitDetails },
  segmentName: string
): string {
  for (const [, value] of Object.entries(splitNames)) {
    if (value.name === segmentName) {
      return value.character;
    }
  }
  return "";
}

/**
 * Determines Virgil's mood based on run delta and split comparison.
 * - Ahead of comparison (negative delta) → Happy
 * - Best split was faster than comparison → Happy
 * - Behind comparison (positive delta) → Disappointed
 * - Otherwise → Neutral
 */
export function determineVirgilMood(
  deltaMs: number,
  bestSplitMs: number,
  comparisonSplitMs: number
): string {
  if (deltaMs < 0) return "Happy";
  if (bestSplitMs > comparisonSplitMs) return "Happy";
  if (deltaMs > 0) return "Disappointed";
  return "Neutral";
}

/**
 * Formats a time string for display, hiding "00:00" as empty.
 */
export function formatTimeDisplay(timeString: string): string {
  return timeString === "00:00" ? "" : timeString;
}
