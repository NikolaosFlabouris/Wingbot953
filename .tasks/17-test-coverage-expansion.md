# Task 17: Expand Test Coverage

**Priority:** P3 (Quality)
**Area:** Tests
**Branch:** `feature/17-test-coverage-expansion`
**Status:** TODO

## Problem

The test suite covers utility functions and some logic modules well, but key areas are untested:

### Currently Tested
- Utils (SecondsToDuration, Between, SelectFromList, numberToOrdinal)
- VipWelcome logic (LoadWelcomeMessages, CheckForWelcomeMessage, AddWelcomeMessage)
- Quiz (basic initialization)
- MessageHandling (basic flow)
- DiscordLogic, EventBus, HaloRunsLogic, SpotifyLogic, TwitchLogic, YouTubeLogic

### Not Tested
1. **SearchCommandDictionary** - The core command matching logic in MessageHandling
2. **Command edge cases** - Empty args, special characters, very long messages
3. **Quiz state transitions** - State machine correctness across quiz types
4. **Error scenarios** - What happens when API calls fail, files are missing, connections drop
5. **Leaderboard persistence** - Read/write/corruption recovery

## Files to Create

- `Tests/SearchCommandDictionary.test.ts`
- `Tests/CommandEdgeCases.test.ts`
- `Tests/QuizStateMachine.test.ts`
- Additional test files as needed

## Files to Reference

- `Server/MessageHandling.ts` - For SearchCommandDictionary logic
- `Server/Commands/Quiz.ts` - For quiz state transitions
- `Server/Commands/FunctionCommands.ts` - For command edge cases
- `Server/Commands/Utils.ts` - For parsing edge cases

## Acceptance Criteria

- [ ] `SearchCommandDictionary` has tests covering: exact match, no match, partial match, case sensitivity, restricted commands
- [ ] Command parsing edge cases are tested: empty args, extra spaces, special characters
- [ ] Quiz state transitions are tested: start → active → finished, concurrent answers, timeout behavior
- [ ] At least one error scenario test per major integration logic file
- [ ] All new tests pass with `npm test`
- [ ] Existing tests still pass

## Notes

- Follow the existing test patterns in `Tests/` - they use Vitest with `describe`/`it` blocks
- The `*Logic.ts` files were specifically extracted for testability - leverage them
- Use the simulation/mock patterns already established (check how existing tests handle dependencies)
- Focus on testing pure logic, not integration points that require live connections
- Don't test trivial getters/setters - focus on logic with branches and edge cases
