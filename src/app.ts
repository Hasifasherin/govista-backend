import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import tourRoutes from "./routes/tourRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import reviewRoutes from "./routes/reviewRoutes";
import operatorRoutes from "./routes/operatorRoutes";
import adminAuthRoutes from "./routes/adminAuthRoutes";
import adminRoutes from "./routes/adminRoutes";
import messageRoutes from "./routes/messageRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import sliderRoutes from "./routes/sliderRoutes";
import adminCategoryRoutes from "./routes/adminCategoryRoutes";
import adminChatRoutes from "./routes/adminChatRoutes";

import { errorHandler } from "./middlewares/errorMiddleware";

const app = express();

// -------------------------
// CORS
// -------------------------
const allowedOrigins = [
  process.env.CLIENT_URL || "",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// -------------------------
// Body Parsers
// -------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -------------------------
// Health Check
// -------------------------
app.get("/", (_req, res) => {
  res.json({ success: true, message: "API running" });
});

// -------------------------
// Routes
// -------------------------
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.use("/api/tours", tourRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/operator", operatorRoutes);

app.use("/api/admin", adminAuthRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/categories", adminCategoryRoutes);
app.use("/api/admin/chat", adminChatRoutes);

app.use("/api/sliders", sliderRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);

app.use("/api/payments", paymentRoutes);

// -------------------------
// 404 Handler
// -------------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

// -------------------------
// Global Error Handler
// -------------------------
app.use(errorHandler);

export default app;
