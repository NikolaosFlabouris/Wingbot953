# Task 14: Spotify Queue Viewing and Duplicate Detection

**Priority:** P3 (Enhancement)
**Area:** Spotify Integration
**Branch:** `feature/14-spotify-queue-and-dupes`
**Status:** TODO

## Problem

1. **No queue viewing** - Users can request songs with `!sr` but have no way to see what's currently queued.
2. **No duplicate detection** - The same song can be requested multiple times in a row.

## Implementation Plan

### Queue Command
Add a `!queue` command that shows the current Spotify playback queue (or at least the next few tracks). The Spotify Web API has a `getMyCurrentPlaybackState` endpoint and a queue endpoint.

### Duplicate Detection
Before adding a song to the queue, check if it's already in the recent request history. Maintain a simple in-memory list of recently requested track IDs (last N requests or last M minutes).

## Files to Modify

- `Server/Integrations/Spotify.ts` - Add queue retrieval and dupe checking logic
- `Server/Commands/FunctionCommands.ts` or equivalent - Register `!queue` command

## Acceptance Criteria

- [ ] `!queue` command shows the next 3-5 tracks in the Spotify queue
- [ ] Duplicate requests within a configurable window (e.g., last 20 songs) are rejected with a friendly message
- [ ] Duplicate detection uses track ID (not name) to avoid false positives from different versions of the same song
- [ ] `npm run compile` passes
- [ ] `npm test` passes

## Notes

- Spotify's queue API may have limitations - it might only return the user's queue, not auto-play suggestions
- Keep the dupe list in-memory only (no persistence needed - resets on bot restart is fine)
- The `!queue` response should be concise for chat - just track names and artists, not full metadata
