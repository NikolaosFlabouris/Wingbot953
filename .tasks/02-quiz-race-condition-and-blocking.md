# Task 02: Quiz Race Condition and Permanent Block Fix

**Priority:** P0 (Bug)
**Area:** Quiz System
**Branch:** `feature/02-quiz-race-condition-and-blocking`
**Status:** TODO

## Problem

### Race Condition
In `Server/Commands/Quiz.ts`, `FirstToAnswerQuiz` sets `state = QuizState.FINISHED` directly without synchronization. If multiple users answer simultaneously, there is a window where answers can be double-processed before the state transition takes effect.

### Permanent Block
The `isBlocked` flag prevents concurrent quizzes but has no timeout or reset mechanism. If an exception is thrown during quiz execution, `isBlocked` stays `true` forever, permanently disabling the quiz system until the bot restarts.

## Files to Modify

- `Server/Commands/Quiz.ts`

## Acceptance Criteria

- [ ] Quiz state transitions are guarded to prevent double-processing of correct answers
- [ ] `isBlocked` has a safety timeout (e.g., 120 seconds) that auto-resets if the quiz doesn't complete normally
- [ ] `isBlocked` is reset in a `finally` block or equivalent pattern so exceptions don't permanently block the system
- [ ] Existing quiz tests still pass
- [ ] `npm run compile` passes

## Notes

- The `AllCorrectAnswersQuiz` should also be checked for similar timing issues with duplicate answer entries
- Be careful not to change quiz gameplay behavior - only add safety guards
- Consider wrapping the quiz execution flow in try/finally to guarantee `isBlocked = false` on completion
