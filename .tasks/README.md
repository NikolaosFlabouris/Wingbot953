# Task Tracker

Tasks identified from a full project review (2026-03-08). Each `.md` file in this directory describes a self-contained unit of work to be picked up by an agent, implemented in a feature branch, and submitted as a PR.

## Workflow

1. Pick up a task file
2. Create a branch: `feature/<task-filename-without-extension>`
3. Implement the changes described in the task
4. Run `npm test` and `npm run compile` to verify
5. Commit and create a PR referencing the task
6. Mark the task status as `DONE` in the task file

## Priority Legend

- **P0** - Bugs / crash risks - fix first
- **P1** - High value missing features
- **P2** - Medium value improvements
- **P3** - Low priority / nice-to-have

## Task Index

| # | File | Priority | Area | Summary |
|---|------|----------|------|---------|
| 01 | `01-message-handling-crash-guards.md` | P0 | Core | Add null/empty checks and try-catch guards in MessageHandling |
| 02 | `02-quiz-race-condition-and-blocking.md` | P0 | Quiz | Fix race condition in quiz state and permanent block bug |
| 03 | `03-env-validation-at-startup.md` | P0 | Core | Validate required env vars on boot with clear errors |
| 04 | `04-twitch-chat-events.md` | P1 | Twitch | Handle missing @twurple/chat events (community subs, announcements, bans, etc.) |
| 05 | `05-twitch-eventsub.md` | P1 | Twitch | Install @twurple/eventsub and handle hype trains, predictions, polls, follows, shoutouts |
| 06 | `06-youtube-message-types.md` | P2 | YouTube | Handle Super Stickers, memberships, milestones, gift memberships |
| 07 | `07-discord-message-handling.md` | P2 | Discord | Add message intent, message handler, and basic command responses |
| 08 | `08-discord-slash-commands.md` | P2 | Discord | Add Discord slash command support |
| 09 | `09-unified-chat-message-cleanup.md` | P2 | Common | Add "discord" platform, populate emoteMap, reduce optional fields |
| 10 | `10-error-handling-and-retry.md` | P2 | Core | Add retry with backoff for API calls, structured error handling |
| 11 | `11-quiz-leaderboard-safety.md` | P2 | Quiz | Atomic leaderboard writes, configurable timings, bounds checks |
| 12 | `12-command-parsing-safety.md` | P2 | Commands | Fix string split bounds, parseInt validation, VipWelcome platform bug |
| 13 | `13-eventbus-emit-missing-events.md` | P2 | Core | Emit YouTube and Discord EventBus events that are defined but unused |
| 14 | `14-spotify-queue-and-dupes.md` | P3 | Spotify | Add queue viewing command and duplicate request detection |
| 15 | `15-livesplit-reconnection.md` | P3 | LiveSplit | Add reconnection logic and fix singleton constructor bug |
| 16 | `16-websocket-unification.md` | P3 | Architecture | Unify WebSocket servers (8080/8081/8082) and add client reconnection |
| 17 | `17-test-coverage-expansion.md` | P3 | Tests | Add tests for SearchCommandDictionary, error scenarios, integration paths |
