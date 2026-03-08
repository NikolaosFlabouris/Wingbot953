# Task 08: Add Discord Slash Commands

**Priority:** P2 (Missing Features)
**Area:** Discord Integration
**Branch:** `feature/08-discord-slash-commands`
**Status:** TODO

## Problem

Modern Discord bots are expected to use slash commands. The bot currently has no slash command support. Users in Discord should be able to use the same commands available in Twitch/YouTube chat.

## Implementation Plan

### 1. Register Slash Commands
Register key commands with Discord's API on bot startup:
- `/quiz` - Start a quiz round
- `/wr` - World Record lookup (with optional game/category parameters)
- `/pb` - Personal Best lookup
- `/song` - Current song info
- `/commands` - List available commands
- `/followage` - Check follow age (Discord equivalent or cross-platform)

### 2. Handle Interactions
Listen for `Events.InteractionCreate` and route slash command interactions through the existing command system or handle them directly.

### 3. Response Format
Use Discord's interaction reply system (`interaction.reply()`) for responses instead of channel messages.

## Files to Modify

- `Server/Integrations/Discord.ts` - Add slash command registration and interaction handler
- May need to extract command logic from `Server/Commands/FunctionCommands.ts` if functions are tightly coupled to chat message format

## Acceptance Criteria

- [ ] Slash commands are registered with Discord on bot startup
- [ ] At least 4-5 key commands are available as slash commands
- [ ] Slash commands produce appropriate responses via `interaction.reply()`
- [ ] Commands with parameters (e.g., `/wr game:halo2 category:legendary`) use Discord's option system
- [ ] `npm run compile` passes
- [ ] `npm test` passes

## Dependencies

- Task 07 (Discord Message Handling) should ideally be done first, but this task can be implemented independently

## Notes

- Use `SlashCommandBuilder` from discord.js
- Register commands per-guild (faster) rather than globally during development
- Discord slash commands have a 3-second response deadline - use `interaction.deferReply()` for commands that take longer
- Keep the command set small initially - can always add more later
