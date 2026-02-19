import express from "express";
import { protect, roleAccess } from "../middlewares/authMiddleware";
import {
  createPaymentIntent,
  checkPaymentStatus,
  createRefund,
  confirmPayment,
} from "../controllers/paymentController";

const router = express.Router();

// ================= USER PAYMENTS =================

// Create Stripe payment intent
router.post(
  "/create-intent",
  protect,
  roleAccess("user"),
  createPaymentIntent
);

// Confirm payment after frontend success
router.post(
  "/confirm/:bookingId",
  protect,
  roleAccess("user"),
  confirmPayment
);

// Check payment status
router.get(
  "/status/:bookingId",
  protect,
  roleAccess("user"),
  checkPaymentStatus
);

// ================= REFUND =================

// Admin / Operator refund
router.post(
  "/refund",
  protect,
  roleAccess("admin", "operator"),
  createRefund
);

export default router;
