# Task 13: Emit Missing EventBus Events

**Priority:** P2 (Code Quality)
**Area:** Core
**Branch:** `feature/13-eventbus-emit-missing-events`
**Status:** TODO

## Problem

`Server/Integrations/EventBus.ts` defines event types for YouTube and Discord that are never emitted:
- `YOUTUBE_STREAM_STARTED` - defined but never emitted
- `YOUTUBE_STREAM_ENDED` - defined but never emitted
- `DISCORD_CONNECTED` - defined but never emitted
- `DISCORD_DISCONNECTED` - defined but never emitted

Only `TWITCH_STREAM_STARTED` and `TWITCH_STREAM_ENDED` are actually used.

## Files to Modify

- `Server/Integrations/YouTube.ts` - Emit stream start/end events when YouTube livestream is detected/lost
- `Server/Integrations/Discord.ts` - Emit connected event in `ClientReady` handler; emit disconnected on error/close
- `Server/Integrations/EventBus.ts` - Add typed event payloads if needed

## Acceptance Criteria

- [ ] `YOUTUBE_STREAM_STARTED` is emitted when a YouTube livestream is discovered
- [ ] `YOUTUBE_STREAM_ENDED` is emitted when a YouTube livestream ends or is no longer found
- [ ] `DISCORD_CONNECTED` is emitted when the Discord client fires `ClientReady`
- [ ] `DISCORD_DISCONNECTED` is emitted on Discord client error or disconnection
- [ ] No orphaned/unused event type definitions remain in EventBus
- [ ] Consider adding event payload types for type safety
- [ ] `npm run compile` passes
- [ ] `npm test` passes

## Notes

- YouTube already detects stream start/end internally (it starts/stops chat polling) - just add the EventBus emit at those points
- Discord's `Events.ClientReady` already fires - just add the emit there
- For Discord disconnect, listen for the `Events.Error` or client disconnect events
- These events enable future features like cross-platform notifications ("YouTube stream is live!")
