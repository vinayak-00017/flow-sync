import { Server as HttpServer } from "node:http";
import { Server, Socket } from "socket.io";
import * as Y from "yjs";
import { getRoomManager } from "./roomManager";
import { config } from "../config";
import { AwarenessUpdate } from "../types";
import { timestamp } from "drizzle-orm/gel-core";

// Setup and configure Socket.io
export const setupSocketHandlers = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: true,
    },
    cors: {
      origin: config.clientUrl,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Map to track client IDs to socket IDs
  const clientSocketMap = new Map();

  // Handle socket connections
  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);
    let currentRoom: string | null = null;
    const roomManager = getRoomManager();

    // Get client ID from auth or connection data
    const clientId = socket.handshake.auth.clientId || socket.id;

    // Handle document updates
    socket.on("doc-update", (update) => {
      if (!currentRoom) return;
      const { doc } = roomManager.getRoom(currentRoom);
      try {
        Y.applyUpdate(doc, new Uint8Array(update));
        //Broadcast to others in the same room
        socket.to(currentRoom).emit("doc-update", update);
      } catch (err) {
        console.error("Error applying document update:", err);
      }
    });

    // Join room handler
    socket.on("join-room", (roomId) => {
      // Leave previous room if exists
      if (currentRoom && currentRoom !== roomId) {
        socket.leave(currentRoom);
        roomManager.removeClient(currentRoom, socket.id);
      }

      // Join new room
      currentRoom = roomId;
      socket.join(roomId);
      roomManager.addClient(roomId, socket.id);

      // Get room data
      const { doc } = roomManager.getRoom(roomId);

      // Send initial document state
      const initialState = Y.encodeStateAsUpdate(doc);
      socket.emit("sync-doc", Array.from(initialState));

      // Let otehrs know someone joined
      socket.to(roomId).emit("user-joined", {
        userId: socket.id,
        timestamp: Date.now(),
      });

      // Handle awareness (cursor, selection) updates
      socket.on("awareness-update", (data) => {
        if (!currentRoom) return;

        //Relay to others in the room
        socket.to(currentRoom).emit("awareness-update", {
          ...data,
          userId: socket.id,
        });

        // Handle disconnection
        socket.on("disconnect", () => {
          if (currentRoom) {
            roomManager.removeClient(currentRoom, socket.id);
          }
        });
      });
    });
  });

  return io;
};
