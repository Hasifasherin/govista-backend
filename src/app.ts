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

const app = express();

app.use(cors());
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

app.use(errorHandler);

export default app;
