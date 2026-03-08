# Task 18: Implement Whisper Message Processing

**Priority:** P2 (Feature)
**Area:** Twitch Integration
**Branch:** `feature/18-whisper-message-processing`
**Status:** TODO

## Problem

The `onWhisper` handler in `Server/Integrations/Twitch.ts` is registered but has no implementation. Whisper messages (DMs sent to the bot on Twitch) need a dedicated processing pipeline and interface, separate from public chat messages.

## Implementation Plan

### 1. Create a Whisper Interface
Define a dedicated interface for whisper messages (distinct from `UnifiedChatMessage` which is designed for public chat). Consider:
- Sender identity (username, user ID, display name)
- Message text
- Timestamp
- Whether the whisper is a command or informational

### 2. Implement Whisper Processing
In the `onWhisper` handler:
- Parse the whisper into the new interface
- Support a subset of bot commands via whisper (e.g., `!pb`, `!wr`, `!commands`)
- Respond to the user via whisper (using `chatClient.whisper()`)
- Log whisper activity for admin monitoring (without logging message content to avoid leaking private messages)

### 3. Admin Monitoring
- Broadcast a sanitised whisper event to WebSocket (sender name + timestamp, NOT content)
- Optionally allow an admin flag to enable full content monitoring

## Files to Create

- `Common/WhisperMessage.ts` — Whisper message interface

## Files to Modify

- `Server/Integrations/Twitch.ts` — Implement `onWhisper` handler body

## Acceptance Criteria

- [ ] Whisper message interface is defined
- [ ] `onWhisper` handler processes incoming whispers
- [ ] Bot can respond to whispered commands
- [ ] Whisper activity is logged without leaking message content
- [ ] `npm run compile` passes
- [ ] `npm test` passes
- [ ] Lint passes

## Notes

- The `onWhisper` handler signature is already registered in Twitch.ts — just fill in the body
- Twitch whisper API has rate limits — don't send more than 3 whispers per second
- The bot already requests the `whispers:edit` OAuth scope
- Do NOT log whisper message content in production console output
