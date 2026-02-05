import dotenv from "dotenv";
dotenv.config();

import http from "http";
import connectDB from "./config/db";
import app from "./app";
import { initSocket } from "./socket";

connectDB();

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Init socket
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
