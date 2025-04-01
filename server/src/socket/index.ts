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
  const temporaryDisconnects = new Map();

  // Handle socket connections
  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);
    let currentRoom: string | null = null;
    const roomManager = getRoomManager();

    // Get client ID from auth or connection data
    const clientId = socket.handshake.auth.clientId || socket.id;

    // Disconnect wiht previous socket
    if (clientSocketMap.has(clientId)) {
      const oldSocketId = clientSocketMap.get(clientId);
      console.log(`Client ${clientId} reconnected. Old socket:${oldSocketId}`);

      // Check if the old socket was in temporary disconnects
      // and clean it up to prevent timeout from executing
      for (const [socketId, data] of temporaryDisconnects.entries()) {
        if (data.clientId === clientId || socketId === oldSocketId) {
          console.log(`Cleaning up temp disconnect client: ${socketId}`);
          temporaryDisconnects.delete(socketId);
        }
      }

      //clean up old socket from rooms
      if (oldSocketId !== socket.id) {
        roomManager.updateClientSocketId(oldSocketId, socket.id);
      }
    }

    //update client socket mapping
    clientSocketMap.set(clientId, socket.id);

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
    socket.on("join-room", (data) => {
      const {
        roomId,
        clientId: joinClientId,
        userId,
      } = typeof data === "object"
        ? data
        : { roomId: data, clientId, userId: null };

      // Leave previous room if exists
      if (currentRoom && currentRoom !== roomId) {
        socket.leave(currentRoom);
        roomManager.removeClient(currentRoom, socket.id);
      }

      // Join new room
      currentRoom = roomId;
      socket.join(roomId);
      roomManager.addClient(roomId, socket.id, {
        clientId: joinClientId,
        userId,
      });

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
    });

    // Handle awareness (cursor, selection) updates
    socket.on("awareness-update", (data) => {
      if (!currentRoom) return;

      //Relay to others in the room
      socket.to(currentRoom).emit("awareness-update", {
        ...data,
        userId: socket.id,
      });
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log(`Socket ${socket.id} disconnected: ${reason}`);
      const isTemporaryDisconnect =
        reason === "transport close" ||
        reason === "transport error" ||
        reason === "ping timeout";

      if (!isTemporaryDisconnect) {
        if (currentRoom) {
          console.log(`Removing client ${socket.id} from room ${currentRoom}`);
          roomManager.removeClient(currentRoom, socket.id);
        }
        if (clientSocketMap.get(clientId) === socket.id) {
          clientSocketMap.delete(clientId);
        }
      } else {
        console.log(
          `Temporary disconnect, keeping ${socket.id} in room ${currentRoom}`
        );
        temporaryDisconnects.set(socket.id, {
          roomId: currentRoom,
          clientId: clientId,
          disconnectedAt: Date.now(),
        });

        //Cleanup Timer
        setTimeout(() => {
          if (temporaryDisconnects.has(socket.id)) {
            const disconnectInfo = temporaryDisconnects.get(socket.id);

            console.log(
              `Client ${socket.id} exceeded max disconnection time, removing from room ${currentRoom}`
            );
            roomManager.removeClient(disconnectInfo.roomId, socket.id);
            temporaryDisconnects.delete(socket.id);
          }
        }, 2.5 * 1000);
      }
    });
  });

  return io;
};
