# Task 06: Handle Missing YouTube Message Types

**Priority:** P2 (Missing Features)
**Area:** YouTube Integration
**Branch:** `feature/06-youtube-message-types`
**Status:** TODO

## Problem

`Server/Integrations/YouTube.ts` only processes 2 of 7+ YouTube Live Chat message types in `processYouTubeMessage()`. The function checks for `textMessageEvent` and `superChatEvent` but ignores all others.

## Message Types to Add

1. **`superStickerEvent`** - Paid animated stickers (similar to Super Chat but visual). Extract amount, currency, sticker metadata. Broadcast to WebSocket.

2. **`newSponsorEvent`** - When someone becomes a new channel member. Announce in chat and broadcast to WebSocket. Consider triggering quiz auto-queue (matching Twitch sub behavior).

3. **`memberMilestoneEvent`** - Membership duration milestones. Announce the milestone duration. Broadcast to WebSocket.

4. **`membershipGiftingEvent`** - Gift memberships. Announce gifter and count. Consider triggering quiz auto-queue.

5. **`messageDeletedEvent`** - When a message is deleted by a moderator. Useful for moderation monitoring via WebSocket.

## Files to Modify

- `Server/Integrations/YouTube.ts` - Expand `processYouTubeMessage()` to handle new types
- `Common/UnifiedChatMessage.ts` - Add YouTube-specific fields if needed (e.g., `isSuperSticker`, `membershipDetails`)

## Acceptance Criteria

- [ ] Super Sticker events are processed with amount/currency data
- [ ] New membership events are announced and broadcast
- [ ] Membership milestone events are announced and broadcast
- [ ] Gift membership events are announced and broadcast
- [ ] New message types produce proper `UnifiedChatMessage` objects
- [ ] `npm run compile` passes
- [ ] `npm test` passes

## Notes

- Follow the existing pattern for `superChatEvent` processing in `processYouTubeMessage()`
- Check the YouTube Data API v3 `liveChatMessages` documentation for exact field names and structures
- The `youtubeSpecific` field in `UnifiedChatMessage` currently only has `isSuperChat` and `superChatDetails` - extend it for new types
- Consider adding these events to the simulation/test mode message generator too
