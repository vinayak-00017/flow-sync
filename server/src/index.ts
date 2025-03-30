import express, { Request, Response } from "express";
import cors from "cors";
import { Server } from "socket.io";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { join } from "node:path";

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());
require("dotenv").config();
const port = process.env.PORT || 3001;

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

//Rooms
const rooms = new Map();

app.get("/api/rooms", (req, res) => {
  const roomList = Array.from(rooms.keys()).map((roomId) => ({
    id: roomId,
    clients: rooms.get(roomId)?.clients.size || 0,
  }));
  res.json(roomList);
});

//Socket.IO for real-time communication
const io = new Server(server, {
  connectionStateRecovery: {},
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);
  let currentRoom: null = null;

  socket.on("join-room", (roomId) => {
    if (currentRoom && currentRoom !== roomId) {
      socket.leave(currentRoom);
    }

    // Remove from our tracking structure
    if (rooms.has(currentRoom)) {
      const roomData = rooms.get(currentRoom);
      if (roomData && roomData.clients) {
        roomData.clients.delete(socket.id);
        console.log(`Client ${socket.id} left room ${currentRoom}`);

        if (roomData.clients.size === 0) {
          rooms.delete(currentRoom);
          console.log(`Room ${currentRoom} deleted (empty)`);
        }
      }
    }

    currentRoom = roomId;
    socket.join(roomId);

    // Create collaborative document if it doesn't exist
    if (!rooms.has(roomId)) {
      const doc = new Y.Doc();
      const awareness = new Awareness(doc);
      rooms.set(roomId, {
        doc,
        awareness,
        clients: new Set(),
      });
    }
    rooms.get(roomId).clients.add(socket.id);
    console.log(`Clients ${socket.id} joined room ${roomId}`);

    const { doc, awareness } = rooms.get(roomId);

    // Send initial document state
    const initialState = Y.encodeStateAsUpdate(doc);
    socket.emit("sync-doc", Array.from(initialState));

    // Handle document updates
    socket.on("doc-update", (update) => {
      Y.applyUpdate(doc, new Uint8Array(update));
      socket.to(roomId).emit("doc-update", update);
    });

    // Handle cursor position and selection updates
    socket.on("awareness-update", (update) => {
      awareness.applyUpdate(update);
      socket.to(roomId).emit("awareness-update", update);
    });
  });

  socket.on("disconnect", () => {
    if (currentRoom && rooms.has(currentRoom)) {
      rooms.get(currentRoom).clients.delete(socket.id);

      if (rooms.get(currentRoom).clients.size === 0) {
        rooms.delete(currentRoom);
        console.log(`Room ${currentRoom} deleted (empty)`);
      }
    }
  });
});

// API endpoints
app.get("/", (req: Request, res: Response) => {
  res.send("Flow Sync Collaboration Server");
});

app.get("/api/rooms", (req: Request, res: Response) => {
  const roomList = Array.from(rooms.keys()).map((roomId) => ({
    id: roomId,
    clients: rooms.get(roomId)?.clients.size || 0,
  }));

  res.json(roomList);
});

// Start server
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
