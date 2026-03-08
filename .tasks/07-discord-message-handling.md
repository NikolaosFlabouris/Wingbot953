# Task 07: Add Discord Message Handling

**Priority:** P2 (Missing Features)
**Area:** Discord Integration
**Branch:** `feature/07-discord-message-handling`
**Status:** TODO

## Problem

The Discord bot currently only has `GatewayIntentBits.Guilds` and handles `Events.ClientReady`. It can publish notifications (stream alerts, leaderboards) but cannot respond to any Discord messages. It's effectively a one-way notification bot.

## Implementation Plan

### 1. Add Required Intents
```typescript
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent
```

### 2. Add Message Handler
Listen for `Events.MessageCreate` and route messages through the existing `handleChatMessage()` system by converting Discord messages to `UnifiedChatMessage` format.

### 3. Message Response
Implement `sendChatMessage()` support for Discord platform - when a command produces a response, send it back to the Discord channel the message came from.

## Files to Modify

- `Server/Integrations/Discord.ts` - Add intents, message handler, send function
- `Common/UnifiedChatMessage.ts` - Add `"discord"` to platform type (currently missing)
- `Server/MessageHandling.ts` - Ensure Discord messages route correctly through command processing

## Acceptance Criteria

- [ ] `"discord"` is added as a valid platform in `UnifiedChatMessage`
- [ ] Discord bot has `GuildMessages` and `MessageContent` intents
- [ ] `Events.MessageCreate` handler converts Discord messages to `UnifiedChatMessage`
- [ ] Messages are routed through `handleChatMessage()` for command processing
- [ ] Command responses are sent back to the originating Discord channel
- [ ] Bot ignores its own messages (prevent loops)
- [ ] Messages are broadcast to WebSocket for unified chat display
- [ ] Null checks on channel fetches are added (currently missing)
- [ ] `npm run compile` passes
- [ ] `npm test` passes

## Notes

- The `MessageContent` intent requires enabling it in the Discord Developer Portal under "Privileged Gateway Intents". Document this in the PR description.
- Follow the existing Twitch/YouTube patterns for message conversion
- Discord messages have rich features (embeds, attachments, mentions) - for now, just extract text content
- Don't add slash commands in this task - that's Task 08
- Be careful with the `replyingTo` field - Discord has native reply support that could be mapped
