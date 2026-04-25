import cors from "cors";
import express from "express";
import authRoutes from "./routes/authRoutes.js";
import donationRoutes from "./routes/donationRoutes.js";
import deliveryRoutes from "./routes/deliveryRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

export const createApp = (io) => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use((req, _res, next) => {
    req.io = io;
    next();
  });

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRoutes);
  app.use("/api/donations", donationRoutes);
  app.use("/api/delivery", deliveryRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/admin", adminRoutes);
  app.use(errorHandler);

  return app;
};
