# Task 09: UnifiedChatMessage Interface Cleanup

**Priority:** P2 (Code Quality)
**Area:** Common
**Branch:** `feature/09-unified-chat-message-cleanup`
**Status:** TODO

## Problem

The `UnifiedChatMessage` interface in `Common/UnifiedChatMessage.ts` has several issues:

1. **Missing "discord" platform** - The `platform` field type doesn't include `"discord"`. The code uses `"all"` as a workaround.
2. **`emoteMap` field is never populated** - Twitch has emote handling code that resolves emote CDN URLs, but the results aren't stored in `emoteMap`.
3. **Excessive optional fields** - Nearly every field is optional, forcing null checks everywhere.

## Files to Modify

- `Common/UnifiedChatMessage.ts` - Update interface
- `Server/Integrations/Twitch.ts` - Populate `emoteMap` from existing emote parsing
- Any other files that construct `UnifiedChatMessage` objects (check Discord, YouTube integrations)

## Acceptance Criteria

- [ ] `"discord"` is added to the platform type union
- [ ] `emoteMap` is populated by Twitch integration (it already parses emotes - wire up the results)
- [ ] Review which fields should be required vs optional - make fields required where all platforms provide them (e.g., `id`, `timestamp`, `platform`, `message.text`, `author.displayName`)
- [ ] All existing code that constructs `UnifiedChatMessage` is updated to match any interface changes
- [ ] `npm run compile` passes
- [ ] `npm test` passes

## Notes

- This is a cross-cutting change - search for all places that create `UnifiedChatMessage` objects
- Be conservative about making fields required - only do it if ALL platforms genuinely provide the value
- The Twitch emote parsing in `onMessage` already extracts emote names and CDN URLs - just map them into `emoteMap`
- This task pairs well with Task 07 (Discord Message Handling) but can be done independently
