# Task 10: Error Handling and Retry Logic

**Priority:** P2 (Robustness)
**Area:** Core
**Branch:** `feature/10-error-handling-and-retry`
**Status:** TODO

## Problem

API calls across all integrations fail silently or crash without recovery. There is no retry logic, no exponential backoff, and no consistent error handling pattern.

## Scope

### 1. Create a Retry Utility
Create a simple retry helper (e.g., `Server/Utils/Retry.ts`) that wraps async calls with:
- Configurable max retries (default: 3)
- Exponential backoff (e.g., 1s, 2s, 4s)
- Error logging on each retry

### 2. Apply to Critical API Calls
- **Twitch.ts** - API calls for stream status, subscriptions, followers, channel info, rewards
- **YouTube.ts** - Chat polling, stream discovery, message sending
- **HaloRuns.ts** - API data loading (currently returns zeros on failure)
- **Spotify.ts** - Search, playback control, token refresh

### 3. Structured Error Logging
Replace bare `console.log`/`console.error` with a consistent pattern that includes:
- Timestamp
- Integration name
- Operation being attempted
- Error details

## Files to Create

- `Server/Utils/Retry.ts`

## Files to Modify

- `Server/Integrations/Twitch.ts`
- `Server/Integrations/YouTube.ts`
- `Server/Integrations/HaloRuns.ts`
- `Server/Integrations/Spotify.ts`

## Acceptance Criteria

- [ ] Retry utility exists with configurable retries and exponential backoff
- [ ] At least the most critical API calls in each integration use the retry utility
- [ ] Failed API calls log the integration name, operation, and error details
- [ ] Transient failures (network timeouts, 5xx errors) trigger retries
- [ ] Permanent failures (4xx auth errors) do NOT retry
- [ ] `npm run compile` passes
- [ ] `npm test` passes
- [ ] Add unit tests for the retry utility itself

## Notes

- Keep the retry utility simple - no need for a library like `p-retry`
- Don't wrap every single call - focus on the calls that happen during normal operation (polling, periodic checks)
- One-time setup calls (OAuth flows) don't need retry - they'll fail fast anyway
- Be careful not to retry calls that have side effects (e.g., sending a chat message) unless idempotent
