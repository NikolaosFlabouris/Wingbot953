# Task 12: Command Parsing Safety Fixes

**Priority:** P2 (Bugs)
**Area:** Commands
**Branch:** `feature/12-command-parsing-safety`
**Status:** TODO

## Problem

Several command parsing functions have unsafe string operations that can produce undefined values or incorrect behavior.

### Issues

1. **Utils.ts** - Multiple `.split(" ")[1]` calls without checking that the array has a second element. If a user types just `!command` with no argument, index 1 is undefined.

2. **FunctionCommands.ts** - `parseInt()` results are not validated. `parseInt("abc")` returns `NaN`, which propagates through `Between()` and produces unexpected behavior.

3. **VipWelcome.ts (line ~71)** - Welcome messages always send to Twitch regardless of the originating platform. If a user triggers a welcome via YouTube or Discord (future), the response goes to the wrong platform.

4. **VipWelcome.ts (line ~34)** - `fs.writeFile()` uses callback pattern but errors are only logged, not propagated or handled.

## Files to Modify

- `Server/Commands/Utils.ts`
- `Server/Commands/FunctionCommands.ts`
- `Server/Commands/VipWelcome.ts`

## Acceptance Criteria

- [ ] All `.split(" ")[n]` accesses check array length before accessing index
- [ ] `parseInt()` results are checked for `NaN` before use, with appropriate error messages to the user
- [ ] VipWelcome sends responses to the platform the message originated from, not hardcoded Twitch
- [ ] VipWelcome file write errors are handled properly (at minimum logged with context)
- [ ] `npm run compile` passes
- [ ] `npm test` passes
- [ ] Add test cases for edge cases (empty args, non-numeric input to number commands)

## Notes

- For the split issue, return an appropriate user-facing message like "Usage: !command <argument>" when args are missing
- For parseInt, return a message like "Please provide a valid number" rather than failing silently
- The VipWelcome platform fix may require passing the platform through from the UnifiedChatMessage
