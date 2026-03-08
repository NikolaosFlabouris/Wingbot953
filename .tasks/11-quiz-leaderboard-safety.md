# Task 11: Quiz Leaderboard Safety and Configurable Timings

**Priority:** P2 (Data Safety + Code Quality)
**Area:** Quiz System
**Branch:** `feature/11-quiz-leaderboard-safety`
**Status:** TODO

## Problem

### Leaderboard Write Safety
Leaderboard file operations in `Server/Commands/Quiz.ts` are not atomic. If the process crashes during a `writeFile`, the leaderboard data is corrupted or lost. The `isLoading`/`isSaving` flags prevent concurrent calls but don't handle crash scenarios.

### Hardcoded Timings
Quiz timing values are magic numbers scattered through the code:
- 17000ms notification delay
- 25000ms question time
- 3s slow mode duration
- `Between(0, 99)` for percentage roll checks

### Bounds Checking
`selectRandomQuestion` can produce invalid indices when `totalQuestionCount` is 0.

## Files to Modify

- `Server/Commands/Quiz.ts`

## Acceptance Criteria

### Leaderboard Safety
- [ ] Leaderboard writes use a write-to-temp-then-rename pattern (atomic on most filesystems)
- [ ] If a write fails, the previous leaderboard file is preserved
- [ ] Add basic error handling around `readFile` for corrupted JSON

### Configurable Timings
- [ ] Quiz timing constants are extracted to named constants at the top of the file or a config object
- [ ] Values have descriptive names (e.g., `NOTIFICATION_DELAY_MS`, `QUESTION_TIME_MS`, `SLOW_MODE_DURATION_S`)
- [ ] The magic `Between(0, 99)` percentage checks have comments or named constants explaining the thresholds

### Bounds Checking
- [ ] `selectRandomQuestion` handles `totalQuestionCount === 0` gracefully
- [ ] Callers of `selectRandomQuestion` handle null returns (check line ~970-971)

### General
- [ ] `npm run compile` passes
- [ ] `npm test` passes

## Notes

- For atomic writes: write to `leaderboard.json.tmp`, then rename to `leaderboard.json`. `fs.rename` is atomic on the same filesystem.
- Don't over-engineer the config - named constants at the top of the file are sufficient
- The `Between(0, 99) < 30` pattern is a 30% chance roll - a comment or `QUIZ_TRIGGER_CHANCE_PERCENT = 30` constant makes this clear
