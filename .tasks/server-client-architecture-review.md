# Server-Client Architecture Review

**Status**: Review / Recommendation
**Date**: 2026-03-11

## Current Architecture

The project runs **4 independent network listeners** across 3 ports:

| Port | Protocol | Location | Purpose |
|------|----------|----------|---------|
| 3000 | HTTP | `Wingbot953.ts:15` | OAuth callbacks (`/twitch/callback`, `/spotify/callback`, `/youtube/callback`) |
| 8080 | WebSocket | `MessageHandling.ts:29` | Chat message broadcasting (UnifiedChat.html) |
| 8081 | WebSocket | `LiveSplit.ts:81` | Virgil mood/expression state (Virgil.html) |
| 8082 | WebSocket | `LiveSplit.ts:82` | Split data for OBS overlays (ObsBackground, CharacterProfile, SplitStats) |

### Clients and their connections

| Client HTML | Connects to | Purpose |
|-------------|-------------|---------|
| `UnifiedChat.html` | `ws://localhost:8080` | Admin chat monitor |
| `Virgil.html` | `ws://localhost:8081` | Character expression overlay |
| `ObsBackground.html` | `ws://localhost:8082` | Dynamic background gradient |
| `CharacterProfile.html` | `ws://localhost:8082` | Character profile image |
| `SplitStats.html` | `ws://localhost:8082` | Split statistics table |

## Key Issues

### 1. No static file serving
The HTTP server on port 3000 is a raw `http.createServer()` with no static file serving. Client HTML files must be opened via `file://` protocol or served externally. Relative asset paths (`./images/`, `./fonts/`) may break depending on how OBS resolves them.

### 2. Three separate WebSocket servers on three ports
Each WebSocket server is independently created with its own port. This is fragile — port conflicts, firewall rules, and OBS configuration all multiply with each additional port.

### 3. Fragile HTTP request handler chaining
Each OAuth integration (`Twitch.ts:388`, `Spotify.ts:303`, `YouTube.ts:451`) calls `server.removeAllListeners("request")`, stores the old listeners, and re-attaches its own handler. This is order-dependent and error-prone — if a new integration is added or initialization order changes, handlers can silently break.

### 4. Hardcoded ports everywhere
Ports are hardcoded in both server code and client HTML files (`ws://localhost:8080`, `ws://localhost:8081`, `ws://localhost:8082`). Changing a port requires editing multiple files across server and client code.

### 5. No unified entry point for web clients
There's no dashboard or index page linking to the various client views. Each client is accessed independently.

## Recommendations

### 1. Use Express as a single HTTP server

Replace the raw `http.createServer()` with Express for proper routing, static file serving, and middleware support — all on one port (3000).

```typescript
import express from "express";
import path from "path";
import { createServer } from "http";

const app = express();
const server = createServer(app);

// Serve client files and assets
app.use(express.static(path.join(__dirname, "../Client")));

// OAuth routes become clean Express routes
app.get("/twitch/callback", twitchOAuthHandler);
app.get("/spotify/callback", spotifyOAuthHandler);
app.get("/youtube/callback", youtubeOAuthHandler);

server.listen(3000);
```

This eliminates the `removeAllListeners("request")` chaining pattern entirely.

### 2. Consolidate WebSocket servers onto one port using path-based routing

Instead of 3 WebSocket servers on 3 ports, use a single `ws` server attached to the HTTP server with path-based routing:

```typescript
import { WebSocketServer } from "ws";

const wssChat = new WebSocketServer({ noServer: true });
const wssVirgil = new WebSocketServer({ noServer: true });
const wssSplitData = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const { pathname } = new URL(request.url!, `http://${request.headers.host}`);

  if (pathname === "/ws/chat") {
    wssChat.handleUpgrade(request, socket, head, (ws) => wssChat.emit("connection", ws, request));
  } else if (pathname === "/ws/virgil") {
    wssVirgil.handleUpgrade(request, socket, head, (ws) => wssVirgil.emit("connection", ws, request));
  } else if (pathname === "/ws/splits") {
    wssSplitData.handleUpgrade(request, socket, head, (ws) => wssSplitData.emit("connection", ws, request));
  } else {
    socket.destroy();
  }
});
```

Clients would then connect to:
- `ws://localhost:3000/ws/chat` instead of `ws://localhost:8080`
- `ws://localhost:3000/ws/virgil` instead of `ws://localhost:8081`
- `ws://localhost:3000/ws/splits` instead of `ws://localhost:8082`

### 3. Centralize port/URL configuration

Create a shared config for ports and paths. In client HTML, use relative WebSocket URLs:

```javascript
const protocol = location.protocol === "https:" ? "wss:" : "ws:";
const socket = new WebSocket(`${protocol}//${location.host}/ws/splits`);
```

This eliminates all hardcoded `localhost:808x` references.

### 4. Serve client assets properly

With Express serving static files from `Client/`, all relative paths resolve correctly. OBS browser sources point to `http://localhost:3000/SplitStats.html` instead of `file://` paths.

### 5. Optional: Add an index/dashboard page

A simple `Client/index.html` at `http://localhost:3000/` listing links to each overlay and admin view.

## Proposed Architecture

```
Port 3000 (single server)
├── HTTP (Express)
│   ├── GET /                        → Dashboard/index
│   ├── GET /UnifiedChat.html        → Chat monitor (static)
│   ├── GET /SplitStats.html         → Split stats (static)
│   ├── GET /Virgil.html             → Expression overlay (static)
│   ├── GET /ObsBackground.html      → Background overlay (static)
│   ├── GET /CharacterProfile.html   → Character profile (static)
│   ├── GET /images/*, /fonts/*      → Static assets
│   ├── GET /twitch/callback         → Twitch OAuth
│   ├── GET /spotify/callback        → Spotify OAuth
│   └── GET /youtube/callback        → YouTube OAuth
│
└── WebSocket (upgrade)
    ├── /ws/chat                     → Chat broadcasting
    ├── /ws/virgil                   → Virgil mood state
    └── /ws/splits                   → LiveSplit data
```

**Result**: From 4 listeners on 3 ports → 1 server on 1 port. Changes can be made incrementally (add Express first, then consolidate WebSockets, then update client URLs).
