import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import socketOptions from "./config/socket.js";
import authRoutes from "./routes/auth.js";
import whiteboardRoutes from "./routes/whiteboard.js";
import notificationRoutes from "./routes/notification.js";
import { initSocket } from "./socket/socketHandler.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import { ALLOWED_ORIGINS } from "./utils/constants.js";

const PORT = process.env.PORT || 5000;

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, socketOptions);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/whiteboards", whiteboardRoutes);
app.use("/api/notifications", notificationRoutes);

initSocket(io);

app.use(notFound);
app.use(errorHandler);

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
