import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";

export interface UserData {
  socketId: string;
  clientId: string;
  userId?: string;
  joinedAt: number;
}
export interface RoomData {
  doc: Y.Doc;
  awareness: Awareness;
  clients: Set<string>;
  users?: Map<string, UserData>;
}

export interface RoomInfo {
  id: string;
  clients: number;
}

export interface AwarenessUpdate {
  clients: {
    [clientId: string]: any;
  };
}
