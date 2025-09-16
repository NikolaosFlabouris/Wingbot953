# Wingbot953

A multi-platform chatbot that connects to Twitch, YouTube, and Discord simultaneously, providing a unified chat experience with quiz functionality, integrations with external services, and a web interface for monitoring.

## Features

### Multi-Platform Integration
- **Twitch**: Chat integration with subscriber detection and moderation features
- **YouTube**: Live stream chat monitoring with manual polling controls
- **Discord**: Community server integration
- **Unified Chat System**: All platforms use a consistent message handling system

### Core Functionality
- **Quiz System**: Interactive quiz games with leaderboards and VIP status rewards
- **Spotify Integration**: Music requests and now-playing functionality for streams
- **LiveSplit Integration**: Real-time speedrun split tracking
- **HaloRuns API**: Speedrunning leaderboard integration
- **WebSocket Broadcasting**: Real-time message monitoring for OBS overlays

### Admin Controls
- **YouTube Polling Override**: Manual control over YouTube stream monitoring (force on/off/auto)
- **Ad Break Management**: Configurable ad break announcements
- **VIP Welcome System**: Automated welcome messages for VIP users
- **Real-time Monitoring**: Web interface for chat monitoring and admin controls

## Architecture

### Project Structure
```
Wingbot953/
├── Build/                    # Compiled JavaScript output
├── Client/                   # HTML interfaces for OBS overlays
├── Common/                   # Shared TypeScript interfaces
├── Data/                     # Configuration and content files
│   ├── QuizQuestions/        # Quiz questions by game category
│   ├── QuizLeaderboards/     # Leaderboard data
│   ├── Tokens/               # Authentication tokens
│   └── Users/                # User data and VIP lists
├── Server/                   # Main bot logic
│   ├── Commands/             # Modular command handlers
│   └── Integrations/         # Platform-specific handlers
└── Wingbot953.ts            # Main entry point
```

### Key Components
- **`Wingbot953.ts`**: Main entry point that initializes all services
- **`MessageHandling.ts`**: Central hub for processing chat messages
- **Integration Managers**: Singleton pattern for Twitch, YouTube, Discord, Spotify
- **Command System**: Modular command handlers with dictionary pattern
- **EventBus**: Centralized event communication between services

## Setup and Installation

### Prerequisites
- Node.js 23.x or higher
- TypeScript
- Platform API credentials (see Environment Variables)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/NikolaosFlabouris/Wingbot953.git
   cd Wingbot953
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (see Environment Variables section)

4. Compile TypeScript:
   ```bash
   npm run compile
   ```

5. Start the bot:
   ```bash
   npm start
   ```

### Development Commands
```bash
npm run compile    # Compile TypeScript to JavaScript
npm run build      # Same as compile
npm start          # Run the compiled bot
npx eslint . --ext .ts    # Run linting
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

### Required
| Variable | Description |
|----------|-------------|
| `TWITCH_CLIENT_ID` | Twitch application client ID |
| `TWITCH_CLIENT_SECRET` | Twitch application client secret |
| `TWITCH_BOT_USERNAME` | Bot account username for Twitch |
| `TWITCH_CHANNEL_NAME` | Target Twitch channel name |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key |
| `YOUTUBE_CHANNEL_ID` | Target YouTube channel ID |
| `DISCORD_BOT_TOKEN` | Discord bot token |
| `DISCORD_CHANNEL_ID` | Target Discord channel ID |

### Optional
| Variable | Description |
|----------|-------------|
| `SPOTIFY_CLIENT_ID` | Spotify Web API client ID |
| `SPOTIFY_CLIENT_SECRET` | Spotify Web API client secret |
| `HALO_RUNS_API_KEY` | HaloRuns API access key |

## Usage

### Bot Commands
- **Quiz Commands**: `!quiz`, `!leaderboard`, `!quizvip`
- **Random Generation**: `!rng [min] [max]`, `!dice`
- **YouTube Controls**: `!youtube_toggle_on/off/auto`, `!youtube_status`
- **Spotify**: `!spotify`, `!song`, `!request [song]`
- **Speedrun**: `!splits`, `!pb`, `!leaderboard [category]`

### Admin Commands (Bot Owner Only)
- `!youtube_toggle_on` - Force YouTube polling ON
- `!youtube_toggle_off` - Force YouTube polling OFF
- `!youtube_toggle_auto` - Set YouTube polling to auto mode
- `!youtube_status` - Check YouTube polling status
- `!publishleaderboard` - Publish quiz leaderboards

### Web Interface
The bot serves web interfaces on:
- **Port 8080**: WebSocket server for real-time chat monitoring
- **Port 3000**: Express server for OAuth callbacks and admin interfaces

Access the unified chat interface at `http://localhost:3000/UnifiedChat.html` for OBS overlays and admin controls.

## Features in Detail

### Quiz System
- Supports multiple game categories with JSON-based question storage
- Automatic leaderboard tracking with VIP status rewards
- Subscriber-only quiz features for Twitch
- Real-time score updates and announcements

### YouTube Integration
- Automatic detection of live streams
- Manual override controls (force on/off/auto modes)
- Integration with Twitch stream status
- Real-time chat monitoring and message relay

### Unified Chat System
All platforms use the `UnifiedChatMessage` interface for consistent processing:
- Platform-agnostic message handling
- Consistent command routing
- Cross-platform user recognition
- Real-time message broadcasting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following the existing code style
4. Run linting: `npx eslint . --ext .ts`
5. Test your changes thoroughly
6. Submit a pull request

## License

This project is private. All rights reserved.