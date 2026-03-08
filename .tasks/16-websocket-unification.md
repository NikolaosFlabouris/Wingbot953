# Task 16: Unify WebSocket Servers and Add Client Reconnection

**Priority:** P3 (Architecture)
**Area:** Architecture
**Branch:** `feature/16-websocket-unification`
**Status:** TODO

## Problem

### Multiple WebSocket Servers
The bot runs 3 separate WebSocket servers:
- **Port 8080** - Main message broadcasting (MessageHandling)
- **Port 8081** - LiveSplit split stats
- **Port 8082** - LiveSplit table info

This is unnecessary complexity. A single WebSocket server with message type routing would be cleaner.

### No Client Reconnection
The HTML files in `Client/` (UnifiedChat.html, SplitStats.html, etc.) connect to WebSocket once. If the bot restarts, the OBS browser sources lose their connection permanently until manually refreshed.

## Implementation Plan

### WebSocket Unification
Use a single WebSocket server (port 8080) with typed messages:
```json
{ "type": "chat_message", "data": { ... } }
{ "type": "split_stats", "data": { ... } }
{ "type": "table_info", "data": { ... } }
```

Clients subscribe to the message types they care about, or just filter on the `type` field.

### Client Reconnection
Add reconnection logic to the HTML client files:
- On WebSocket close, attempt to reconnect after a short delay (2-3 seconds)
- Show a visual indicator when disconnected (optional)
- Exponential backoff up to 30 seconds

## Files to Modify

- `Server/MessageHandling.ts` - Unified WebSocket message format
- `Server/Integrations/LiveSplit.ts` - Send to main WebSocket instead of separate servers
- `Client/UnifiedChat.html` - Add reconnection logic
- `Client/SplitStats.html` - Add reconnection logic
- `Client/Virgil.html` - Add reconnection logic
- `Client/CharacterProfile.html` - Add reconnection logic

## Acceptance Criteria

- [ ] Single WebSocket server on port 8080 handles all message types
- [ ] Messages include a `type` field for client-side filtering
- [ ] LiveSplit data is broadcast through the main WebSocket
- [ ] All client HTML files have automatic reconnection with backoff
- [ ] Ports 8081 and 8082 are no longer used
- [ ] `npm run compile` passes
- [ ] `npm test` passes

## Notes

- This is a larger refactor - be careful to maintain backward compatibility in the message format for existing clients
- The client reconnection logic can be shared via a small JS snippet included in each HTML file
- Consider whether OBS browser sources support WebSocket reconnection natively (they don't - custom logic needed)
- If unification is too risky, just adding client reconnection is still valuable
