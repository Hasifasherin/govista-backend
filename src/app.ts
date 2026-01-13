import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes"
import userRoutes from "./routes/userRoutes";
import { errorHandler } from "./middlewares/errorMiddleware";

const app = express();

app.use(cors());
app.use(express.json());


app.get("/", (_req, res) => {
  res.send("Server running ");
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);


app.use(errorHandler);

export default app;
