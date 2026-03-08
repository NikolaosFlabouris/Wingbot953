/**
 * Represents parsed search query components
 */
export interface ParsedQuery {
  title: string;
  artist?: string;
}

/**
 * Parses a search query into title and artist components.
 * Handles formats like "title by artist", "artist - title", "title (artist)"
 */
export function parseSearchQuery(query: string): ParsedQuery {
  const separators = [
    { regex: /\s+by\s+/i, artistSecond: true },
    { regex: /\s*-\s*/, artistSecond: false },
    { regex: /\s*[([{]/i, artistSecond: true },
  ];

  for (const { regex, artistSecond } of separators) {
    const parts = query.split(regex);
    if (parts.length === 2) {
      const title = parts[artistSecond ? 0 : 1].trim();
      let artist = parts[artistSecond ? 1 : 0].trim();
      artist = artist.replace(/[)\]}]$/, "").trim();
      return { title, artist };
    }
  }

  return { title: query.trim() };
}

/**
 * Extracts a Spotify track ID from various URL formats.
 * Supports open.spotify.com, spotify: URI, and play.spotify.com formats.
 */
export function extractSpotifyTrackId(url: string): string | null {
  const webUrlPattern = /open\.spotify\.com\/track\/([a-zA-Z0-9]+)/;
  const uriPattern = /spotify:track:([a-zA-Z0-9]+)/;
  const oldWebUrlPattern = /play\.spotify\.com\/track\/([a-zA-Z0-9]+)/;

  const match =
    url.match(webUrlPattern) ||
    url.match(uriPattern) ||
    url.match(oldWebUrlPattern);

  return match ? match[1] : null;
}

/**
 * Year classification result for the 2013 song check
 */
export type YearClassification =
  | { type: "exact"; year: 2013 }
  | { type: "close"; year: number }
  | { type: "not2013"; year: number };

/**
 * Classifies a song year relative to 2013.
 */
export function classifySongYear(year: number): YearClassification {
  if (year === 2013) {
    return { type: "exact", year: 2013 };
  } else if ([2011, 2012, 2014].includes(year)) {
    return { type: "close", year };
  } else {
    return { type: "not2013", year };
  }
}

/**
 * Checks if a user has permission to request songs.
 */
export function canRequestSong(author: {
  isSubscriber?: boolean;
  isModerator?: boolean;
  isOwner?: boolean;
}): boolean {
  return !!(author.isSubscriber || author.isModerator || author.isOwner);
}
