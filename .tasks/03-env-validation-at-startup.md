# Task 03: Validate Environment Variables at Startup

**Priority:** P0 (Crash Prevention)
**Area:** Core
**Branch:** `feature/03-env-validation-at-startup`
**Status:** TODO

## Problem

Throughout the codebase (especially `Server/Integrations/Twitch.ts`), environment variables are accessed with non-null assertions (`process.env.VARIABLE!`). If any required variable is missing, the bot will crash at an unpredictable point during initialization with an unhelpful error.

## Files to Modify

- `Wingbot953.ts` (add validation before anything initializes)
- Optionally create a small `Server/Config.ts` module

## Required Environment Variables

Identify all `process.env.*` usages across the codebase and validate the required ones:

- `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_USER_ID`, `TWITCH_REDIRECT_URI`
- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`
- `YOUTUBE_API_KEY`, `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REDIRECT_URI`
- `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`
- `STREAMERBROWSER`, `BOTBROWSER`

## Acceptance Criteria

- [ ] All required environment variables are checked at startup before any integration initializes
- [ ] Missing variables produce a clear error message listing what's missing
- [ ] The bot exits cleanly (not with an unhandled exception) if required vars are absent
- [ ] Non-null assertions (`!`) on `process.env` are removed in favor of validated values
- [ ] `npm run compile` passes
- [ ] `npm test` passes (tests run in simulation mode so env vars may not be present - handle this)

## Notes

- Keep it simple: a validation function at the top of `Wingbot953.ts` is sufficient
- Don't introduce a heavy config library - a plain function that checks and returns typed config is fine
- Be careful with test/simulation mode - the validation should be skippable or env vars should have test defaults
