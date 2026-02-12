import express from "express";
import { protect, roleAccess } from "../middlewares/authMiddleware";
import {
  requestBooking,
  getUserBookings,
  getOperatorBookings,
  updateBookingStatus,
  cancelBooking,
  getBookingDetails 
} from "../controllers/bookingController";

const router = express.Router();

// 🔐 All booking routes require login
router.use(protect);

// ================= USER =================

// Request booking
router.post("/", roleAccess("user"), requestBooking);

// Get my bookings
router.get("/my-bookings", roleAccess("user"), getUserBookings);


// Cancel booking
router.put("/:id/cancel", roleAccess("user"), cancelBooking);

// ================= OPERATOR =================

// Get operator bookings
router.get("/operator", roleAccess("operator"), getOperatorBookings);

// Get booking details
router.get("/:id", getBookingDetails);  

// Accept / Reject booking
router.put("/:id/status", roleAccess("operator"), updateBookingStatus);

export default router;