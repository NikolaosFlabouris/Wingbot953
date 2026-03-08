# Task 15: LiveSplit Reconnection Logic and Constructor Fix

**Priority:** P3 (Robustness)
**Area:** LiveSplit Integration
**Branch:** `feature/15-livesplit-reconnection`
**Status:** TODO

## Problem

### No Reconnection
If LiveSplit closes or the TCP connection drops, the bot continues polling a dead socket with no recovery. The user must restart the bot to reconnect.

### Singleton Constructor Bug
In `Server/Integrations/LiveSplit.ts` (line ~44), `this.getInstance()` is called inside the constructor, which is incorrect for the singleton pattern.

### Hardcoded Host
LiveSplit connection is hardcoded to `localhost:16834`. Can't connect to a remote LiveSplit instance.

## Files to Modify

- `Server/Integrations/LiveSplit.ts`

## Acceptance Criteria

- [ ] When the TCP connection to LiveSplit drops, the bot automatically attempts to reconnect with exponential backoff (e.g., 5s, 10s, 20s, up to 60s max)
- [ ] Reconnection attempts are logged clearly
- [ ] The singleton constructor bug is fixed
- [ ] LiveSplit host/port are configurable (env var or config, defaulting to `localhost:16834`)
- [ ] When LiveSplit is unavailable, the bot continues running normally (no crashes)
- [ ] `npm run compile` passes
- [ ] `npm test` passes

## Notes

- The TCP socket `on('close')` and `on('error')` events should trigger reconnection
- During reconnection, LiveSplit commands should return graceful "not connected" responses rather than crashing
- Cap the backoff at a reasonable interval (60s) and keep retrying indefinitely
- The WebSocket servers on 8081/8082 should continue running during reconnection (they just won't have data to broadcast)
