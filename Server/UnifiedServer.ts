import express from "express";
import * as http from "node:http";
import * as path from "node:path";
import WebSocket from "ws";

const app = express();
const server = http.createServer(app);

// Serve static client files (HTML, images, fonts, etc.)
app.use(express.static(path.join(__dirname, "..", "Client")));

// WebSocket servers (noServer mode — routed via HTTP upgrade)
const wssChat = new WebSocket.Server({ noServer: true });
const wssSplitData = new WebSocket.Server({ noServer: true });
const wssVirgil = new WebSocket.Server({ noServer: true });

// Route WebSocket upgrade requests by path
server.on("upgrade", (request, socket, head) => {
  const { pathname } = new URL(request.url!, `http://${request.headers.host}`);

  if (pathname === "/ws/chat") {
    wssChat.handleUpgrade(request, socket, head, (ws) => {
      wssChat.emit("connection", ws, request);
    });
  } else if (pathname === "/ws/splits") {
    wssSplitData.handleUpgrade(request, socket, head, (ws) => {
      wssSplitData.emit("connection", ws, request);
    });
  } else if (pathname === "/ws/virgil") {
    wssVirgil.handleUpgrade(request, socket, head, (ws) => {
      wssVirgil.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

const PORT = Number(process.env.PORT) || 3000;

function startServer(): void {
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`WebSocket endpoints: /ws/chat, /ws/splits, /ws/virgil`);
    console.log(`Static files served from Client/`);
  });
}

export { app, server, startServer, wssChat, wssSplitData, wssVirgil, PORT };
