# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Compile
```bash
npm run compile    # Compiles TypeScript to JavaScript
npm run build      # Same as compile - builds the project
npm start          # Runs the compiled bot from Build/Wingbot953.js
```

### Linting
The project uses ESLint with TypeScript support. While no npm script is defined, you can run:
```bash
npx eslint . --ext .ts
```

## Architecture Overview

Wingbot953 is a multi-platform chatbot that connects to Twitch, YouTube, and Discord simultaneously. The bot provides a unified chat experience with quiz functionality, integrations with external services, and a web interface for monitoring.

### Core Components

**Main Entry Point**: `Wingbot953.ts` - Initializes all services and integrations
**Message Handling**: `Server/MessageHandling.ts` - Central hub for processing all chat messages
**Platform Integrations**: `Server/Integrations/` - Individual handlers for Twitch, YouTube, Discord, Spotify, etc.
**Commands System**: `Server/Commands/` - Modular command handlers including quiz system
**Data Layer**: `Data/` - JSON files containing quiz questions, leaderboards, and configuration

### Key Architecture Patterns

1. **Unified Message System**: All platforms use `UnifiedChatMessage` interface for consistent message handling
2. **Command Dictionary Pattern**: Commands are defined in arrays with Command, Message, and Function properties
3. **WebSocket Broadcasting**: Real-time message broadcasting to connected web clients for monitoring
4. **Integration Singleton Pattern**: LiveSplit and other integrations use singleton pattern for connection management

### Platform Integration Flow

1. Messages arrive from Twitch/YouTube/Discord platforms
2. `MessageHandling.ts` processes and routes messages through command dictionaries
3. Commands execute functions or return predefined messages
4. Responses are sent back to originating platform and broadcast via WebSocket

### Quiz System

The quiz system is a central feature with:
- **Questions**: Stored in `Data/QuizQuestions/` by game category
- **Leaderboards**: Tracked in `Data/QuizLeaderboards/`
- **VIP System**: Top performers get VIP status
- **Subscriber Integration**: Special quiz features for Twitch subscribers

### Data Organization

- **Build/**: Compiled JavaScript output
- **Client/**: HTML interfaces for OBS overlays and monitoring
- **Common/**: Shared TypeScript interfaces
- **Data/**: Configuration and content files (JSON)
- **Server/**: Main bot logic and integrations

### External Integrations

- **LiveSplit**: Real-time speedrun split tracking
- **HaloRuns API**: Speedrunning leaderboard integration
- **Twitch/YouTube APIs**: Chat and streaming platform integration
- **Discord**: Community server integration
- **Spotify**: Music integration for stream requests

## Development Notes

- The bot uses TypeScript with Node.js 23.x
- Environment variables required for platform tokens and API keys
- WebSocket server runs on port 8080 for real-time monitoring
- Express server on port 3000 for OAuth callbacks and web interfaces
- All builds output to `Build/` directory maintaining source structure