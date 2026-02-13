import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes"
import userRoutes from "./routes/userRoutes";
import { errorHandler } from "./middlewares/errorMiddleware";
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
import adminChatRoutes from "./routes/adminChatRoutes"
const app = express();


const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:3000"
];


app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());


app.get("/", (_req, res) => {
  res.send("Server running ");
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.use("/api/tours", tourRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/operator", operatorRoutes);
app.use("/api/admin", adminAuthRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/sliders", sliderRoutes); 

app.use("/api/admin/chat", adminChatRoutes);


app.use("/api/messages", messageRoutes);

app.use("/api/notifications", notificationRoutes);

app.use("/api/payments", paymentRoutes);

app.use("/api/admin/categories", adminCategoryRoutes);


app.use(errorHandler);

export default app;
