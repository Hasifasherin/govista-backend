import express from "express";
import { protect, roleAccess } from "../middlewares/authMiddleware";
import {
  getOperatorTours,
  getOperatorBookings
} from "../controllers/operatorController";

const router = express.Router();

// All routes protected for operators
router.use(protect, roleAccess("operator"));

// Get all tours created by the operator
router.get("/tours", getOperatorTours);

// Get all bookings for operator's tours
router.get("/bookings", getOperatorBookings);

export default router;
