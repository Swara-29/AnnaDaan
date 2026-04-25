import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { startExpiryMonitor } from "./services/expiryService.js";

const start = async () => {
  await connectDB();
  const httpServer = http.createServer();
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  const app = createApp(io);
  httpServer.on("request", app);

  io.on("connection", (socket) => {
    socket.emit("connected", { message: "Realtime channel connected" });
  });
  startExpiryMonitor(io);

  const port = process.env.PORT || 5000;
  httpServer.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`AnnaDaan API running on port ${port}`);
  });
};

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server", error);
  process.exit(1);
});
