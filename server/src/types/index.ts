import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";

export interface RoomData {
  doc: Y.Doc;
  awareness: Awareness;
  clients: Set<string>;
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
