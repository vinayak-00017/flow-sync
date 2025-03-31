import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { config } from "./config";
import { setupRoutes } from "./routes";
import { setupSocketHandlers } from "./socket";

export const startServer = () => {
  // Express and HTTP server setup
  const app = express();
  const server = createServer(app);

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Basic route for root path

  // Setup API routes
  setupRoutes(app);

  // Setup Socket.io handlers
  setupSocketHandlers(server);

  // Start server
  server.listen(config.port, () => {
    console.log(`Server running at http://localhost:${config.port}`);
  });
};
