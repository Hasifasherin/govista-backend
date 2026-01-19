import express from "express";
import { protect } from "../middlewares/authMiddleware";
import { createPaymentIntent, stripeWebhook } from "../controllers/paymentController";

const router = express.Router();

//  Protected route to create payment
router.post("/create-intent", protect, createPaymentIntent);

// Stripe webhook (no auth)
router.post("/webhook", express.raw({ type: "application/json" }), stripeWebhook);

export default router;
