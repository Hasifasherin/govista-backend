import dotenv from "dotenv";
dotenv.config();

import http from "http";
import connectDB from "./config/db";
import app from "./app";
import { initSocket } from "./socket";

const PORT = process.env.PORT || 5000;

// -------------------------
// Connect Database
// -------------------------
connectDB()
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("DB connection failed:", err);
    process.exit(1);
  });

// -------------------------
// Create HTTP server
// -------------------------
const server = http.createServer(app);

// -------------------------
// Init Socket.IO
// -------------------------
initSocket(server);

// -------------------------
// Server Error Handling
// -------------------------
server.on("error", (error) => {
  console.error("Server error:", error);
});

// -------------------------
// Start Server
// -------------------------
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// -------------------------
// Graceful Shutdown
// -------------------------
process.on("SIGINT", () => {
  console.log("Shutting down server...");
  process.exit(0);
});
