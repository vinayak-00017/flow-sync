import { Express, Request, Response } from "express";
import { getRoomManager } from "../socket/roomManager";

export const setupRoutes = (app: Express) => {
  // Room listing endpoint
  app.get("/api/rooms", (req: Request, res: Response) => {
    const roomManager = getRoomManager();
    const roomList = roomManager.listRooms();
    res.json(roomList);
  });
};
