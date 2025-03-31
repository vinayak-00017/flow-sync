import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { RoomData, RoomInfo } from "../types";

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
  addClient(roomId: string, clientId: string): void {
    const room = this.getRoom(roomId);
    room.clients.add(clientId);
    console.log(`Client ${clientId} joined room ${roomId}`);
  }

  // Remove client from a room
  removeClient(roomId: string, clientId: string): boolean {
    if (this.rooms.has(roomId)) {
      const room = this.rooms.get(roomId)!;
      room.clients.delete(clientId);
      console.log(`Client ${clientId} left room ${roomId}`);

      // Clean up empty room
      if (room.clients.size === 0) {
        this.deleteRoom(roomId);
        return true;
      }
    }
    return false;
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
