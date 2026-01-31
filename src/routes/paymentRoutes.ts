import express from "express";
import { protect, roleAccess } from "../middlewares/authMiddleware";
import { 
  createPaymentIntent, 
  stripeWebhook,
  checkPaymentStatus,
  createRefund
} from "../controllers/paymentController";

const router = express.Router();

// Protected route to create payment
router.post("/create-intent", protect, createPaymentIntent);

// Check payment status
router.get("/status/:bookingId", protect, checkPaymentStatus);

// Create refund (admin or operator) - ✅ NOW WORKS with multiple roles!
router.post("/refund", protect, roleAccess("admin", "operator"), createRefund);

// Stripe webhook (no auth - raw body required)
router.post("/webhook", express.raw({ type: "application/json" }), stripeWebhook);

export default router;