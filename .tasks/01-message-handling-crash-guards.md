# Task 01: Message Handling Crash Guards

**Priority:** P0 (Bug / Crash Risk)
**Area:** Core
**Branch:** `feature/01-message-handling-crash-guards`
**Status:** TODO

## Problem

`Server/MessageHandling.ts` has several unguarded operations that can crash the process:

1. **No try-catch around `JSON.parse()`** for incoming WebSocket messages. Malformed JSON will throw an unhandled exception.
2. **No empty/null check on `msg.message.text`** before calling `.charAt(0)` or `.split(" ")`. An empty string or undefined text field will cause errors.
3. **Fire-and-forget async calls** use `void` prefix (e.g., `void QuizManager.handleMessage()`, `void CheckForWelcomeMessage()`) which silently swallows errors. These should at minimum log failures.

## Files to Modify

- `Server/MessageHandling.ts`

## Acceptance Criteria

- [ ] `JSON.parse()` of WebSocket messages is wrapped in try-catch with error logging
- [ ] `msg.message.text` is checked for existence and non-empty before command parsing
- [ ] Async fire-and-forget calls have `.catch()` handlers that log errors
- [ ] `npm test` passes
- [ ] `npm run compile` passes

## Notes

- Keep changes minimal - only add guards, do not refactor surrounding code
- The `void` calls are intentional fire-and-forget patterns; just add error logging, don't convert them to awaited calls
