import express from "express";
import { protect, roleAccess } from "../middlewares/authMiddleware";
import { 
  createPaymentIntent, 
  checkPaymentStatus,
  createRefund,
  confirmPayment 
} from "../controllers/paymentController";

const router = express.Router();

// Protected route to create payment
router.post("/create-intent", protect, createPaymentIntent);

router.post("/confirm/:bookingId", protect, confirmPayment);


// Check payment status
router.get("/status/:bookingId", protect, checkPaymentStatus);

// Create refund (admin or operator) -
router.post("/refund", protect, roleAccess("admin", "operator"), createRefund);
export default router;