// backend/src/routes/bookingRoutes.ts
import express, { Request, Response } from "express";
import { protect, roleAccess } from "../middlewares/authMiddleware";
import {
  requestBooking,
  getUserBookings,
  getOperatorBookings,
  updateBookingStatus,
  cancelBooking,
  getBookingDetails,
} from "../controllers/bookingController";
import BookingModel from "../models/Booking";

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

// Confirm payment (one-click, no card)
router.put(
  "/:id/confirm-payment",
  roleAccess("user"),
  async (req: Request, res: Response) => {
    try {
      const booking = await BookingModel.findById(req.params.id);

      if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found" });
      }

      // Only the booking owner can confirm
      if (booking.userId.toString() !== (req.user as any).id) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      if (booking.status !== "accepted") {
        return res.status(400).json({ success: false, message: "Booking must be accepted first" });
      }

      if (booking.paymentStatus === "paid") {
        return res.status(400).json({ success: false, message: "Booking is already paid" });
      }

      // ✅ Mark as paid
      booking.paymentStatus = "paid";
      await booking.save();

      return res.json({ success: true, message: "Payment confirmed", booking });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Payment failed" });
    }
  }
);

// ================= OPERATOR =================

// Get operator bookings
router.get("/operator", roleAccess("operator"), getOperatorBookings);

// Accept / Reject booking
router.put("/:id/status", roleAccess("operator"), updateBookingStatus);

// ================= SHARED =================

// Booking details (User / Operator / Admin)
router.get("/:id", roleAccess("user", "operator", "admin"), getBookingDetails);

export default router;
