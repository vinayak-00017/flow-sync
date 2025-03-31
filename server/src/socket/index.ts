import { Server as HttpServer } from "node:http";
import { Server, Socket } from "socket.io";
import * as Y from "yjs";
import { getRoomManager } from "./roomManager";
import { config } from "../config";
import { AwarenessUpdate } from "../types";

// Setup and configure Socket.io
export const setupSocketHandlers = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    connectionStateRecovery: {},
    cors: {
      origin: config.clientUrl,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Handle socket connections
  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);
    let currentRoom: string | null = null;
    const roomManager = getRoomManager();

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

      // Add client to room manager
      roomManager.addClient(roomId, socket.id);

      // Get room data
      const { doc, awareness } = roomManager.getRoom(roomId);

      // Send initial document state
      const initialState = Y.encodeStateAsUpdate(doc);
      socket.emit("sync-doc", Array.from(initialState));

      // Handle document updates
      socket.on("doc-update", (update) => {
        Y.applyUpdate(doc, new Uint8Array(update));
        socket.to(roomId).emit("doc-update", update);
      });

      // Handle awareness (cursor, selection) updates
      socket.on("awareness-update", (update: AwarenessUpdate) => {
        if (update && update.clients) {
          const states = awareness.getStates();

          // Process each client's state from the update
          Object.entries(update.clients).forEach(([clientId, state]) => {
            states.set(parseInt(clientId), state);
          });

          // Notify others about the change
          socket.to(roomId).emit("awareness-update", {
            added: [],
            update: [parseInt(socket.id)],
            removed: [],
          });
        }
      });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      if (currentRoom) {
        roomManager.removeClient(currentRoom, socket.id);
      }
    });
  });

  return io;
};
