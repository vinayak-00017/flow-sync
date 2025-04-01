import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { RoomData, RoomInfo, UserData } from "../types";

// Singleton pattern for RoomManager
let roomManagerInstance: RoomManager | null = null;

export class RoomManager {
  private rooms: Map<string, RoomData>;

  constructor() {
    this.rooms = new Map<string, RoomData>();
  }

  // Get or create a room
  getRoom(roomId: string): RoomData {
    if (!this.rooms.has(roomId)) {
      const doc = new Y.Doc();
      const awareness = new Awareness(doc);
      this.rooms.set(roomId, {
        doc,
        awareness,
        clients: new Set<string>(),
      });
      console.log(`Created new room: ${roomId}`);
    }
    return this.rooms.get(roomId)!;
  }

  // Add client to a room
  addClient(
    roomId: string,
    socketId: string,
    userData?: { clientId?: string; userId?: string }
  ): void {
    const room = this.getRoom(roomId);
    room.clients.add(socketId);

    // user map
    if (!room.users) {
      room.users = new Map<string, UserData>();
    }

    //Add user data to the map
    room.users.set(socketId, {
      socketId,
      clientId: userData?.clientId || socketId,
      userId: userData?.userId,
      joinedAt: Date.now(),
    });
    console.log(`Client ${socketId} joined room ${roomId}`);
  }

  // Remove client from a room
  removeClient(roomId: string, socketId: string): boolean {
    if (this.rooms.has(roomId)) {
      const room = this.rooms.get(roomId)!;
      room.clients.delete(socketId);
      room.users?.delete(socketId);
      console.log(`Client ${socketId} left room ${roomId}`);

      // Clean up empty room
      if (room.clients.size === 0) {
        this.deleteRoom(roomId);
        return true;
      }
    }
    return false;
  }

  // Update socket Id for a client
  updateClientSocketId(oldSocketId: string, newSocketId: string): void {
    for (const [roomId, roomData] of this.rooms.entries()) {
      if (roomData.clients.has(oldSocketId)) {
        roomData.clients.delete(oldSocketId);
        roomData.clients.add(newSocketId);

        if (roomData.users?.has(oldSocketId)) {
          const userData = roomData.users.get(oldSocketId);
          roomData.users.set(newSocketId, {
            ...userData,
            socketId: newSocketId,
          } as UserData);
          roomData.users.delete(oldSocketId);
        }
        console.log(
          `Updated socket ID in room ${roomId}:${oldSocketId} -> ${newSocketId}`
        );
      }
    }
  }

  // Delete a room
  deleteRoom(roomId: string): void {
    if (this.rooms.has(roomId)) {
      this.rooms.delete(roomId);
      console.log(`Room ${roomId} deleted (empty)`);
    }
  }

  // List all rooms with client count
  listRooms(): RoomInfo[] {
    return Array.from(this.rooms.keys()).map((roomId) => ({
      id: roomId,
      clients: this.rooms.get(roomId)!.clients.size,
    }));
  }
}

// Export singleton getter
export const getRoomManager = (): RoomManager => {
  if (!roomManagerInstance) {
    roomManagerInstance = new RoomManager();
  }
  return roomManagerInstance;
};
