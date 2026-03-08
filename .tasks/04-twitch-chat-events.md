# Task 04: Handle Missing Twitch Chat Events

**Priority:** P1 (Missing Features)
**Area:** Twitch Integration
**Branch:** `feature/04-twitch-chat-events`
**Status:** TODO

## Problem

The bot uses `@twurple/chat` but only handles 6 of the ~36 available event types. Many common chat events are silently ignored.

## Currently Handled

- `onConnect`, `onMessage`, `onSub`, `onResub`, `onSubGift`, `onRaid`

## Events to Add

### High Value (implement these)
1. **`onCommunitySub`** - Community gift sub bombs (someone gifts 5/10/20+ subs at once). Should announce the gifter and count, trigger quiz auto-queue.
2. **`onAnnouncement`** - Channel announcements from moderators. Should relay to WebSocket for the unified chat display.
3. **`onBan`** / **`onTimeout`** - Moderation events. Log these and broadcast to WebSocket for monitoring.
4. **`onGiftPaidUpgrade`** - When a gifted sub converts to paid. Acknowledge the user.
5. **`onPrimePaidUpgrade`** - When a Prime sub converts to paid. Acknowledge the user.
6. **`onWhisper`** - Whisper messages. Log for admin monitoring (scope is already requested).
7. **`onCommunityPayForward`** / **`onStandardPayForward`** - Pay-forward events. Announce in chat.

### Lower Value (implement if straightforward)
8. **`onAction`** - /me messages. Relay to WebSocket with action styling.
9. **`onRaidCancel`** - Log raid cancellations.
10. **`onMessageRemove`** - Track deleted messages for moderation monitoring.

## Files to Modify

- `Server/Integrations/Twitch.ts` - Add event handlers
- `Common/UnifiedChatMessage.ts` - May need new message type fields

## Acceptance Criteria

- [ ] Community sub events are handled with chat announcement and quiz auto-queue
- [ ] Announcement messages are relayed to WebSocket
- [ ] Ban/timeout events are logged and broadcast to WebSocket
- [ ] Gift-paid-upgrade and prime-paid-upgrade are acknowledged
- [ ] Whisper messages are logged
- [ ] Pay-forward events are announced
- [ ] All new events produce appropriate `UnifiedChatMessage` objects for WebSocket broadcast
- [ ] `npm run compile` passes
- [ ] `npm test` passes

## Notes

- Follow the existing patterns in `Twitch.ts` for how `onSub`, `onResub`, etc. are structured
- Each handler should create a `UnifiedChatMessage` and call `handleChatMessage()` or broadcast via WebSocket
- Check @twurple/chat v8 docs for the exact handler signatures
