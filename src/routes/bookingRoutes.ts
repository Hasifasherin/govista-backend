import express from "express";
import { protect, roleAccess } from "../middlewares/authMiddleware";
import { 
  requestBooking, 
  getUserBookings, 
  getOperatorBookings, 
  updateBookingStatus, 
  cancelBooking 
} from "../controllers/bookingController";

const router = express.Router();

// User requests a booking
router.post("/", protect, roleAccess("user"), requestBooking);

// User gets their bookings
router.get("/my-bookings", protect, roleAccess("user"), getUserBookings);

// User cancels booking
router.put("/cancel/:id", protect, roleAccess("user"), cancelBooking);

// Operator gets bookings for their tours
router.get("/operator", protect, roleAccess("operator"), getOperatorBookings);

// Operator accepts/rejects booking
router.put("/status/:id", protect, roleAccess("operator"), updateBookingStatus);

export default router;
