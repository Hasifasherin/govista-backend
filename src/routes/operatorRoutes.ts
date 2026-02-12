import express from "express";
import { protect, roleAccess } from "../middlewares/authMiddleware";
import {
  getOperatorTours,
  getOperatorBookings,
  updateBookingStatus,
  getOperatorDashboard,
  getOperatorBookingDetails,
  getBookingStatistics,
  getOperatorCustomers,
  getCustomerBookingHistory
} from "../controllers/operatorController";
import { getOperatorEarnings } from "../controllers/earningController";
import { getOperatorCategories } from "../controllers/adminCategoryController";
import {
  getConversations,   // list of conversations
  getConversation,    // messages with a specific user
  sendMessage         // send a message
} from "../controllers/messageController";

const router = express.Router();

// All routes protected for operators
router.use(protect, roleAccess("operator"));

// --- Tours ---
router.get("/tours", getOperatorTours);
router.get("/tours/categories", getOperatorCategories);

// --- Bookings ---
router.get("/bookings", getOperatorBookings);
router.get("/bookings/:bookingId", getOperatorBookingDetails);
router.put("/bookings/:bookingId/status", updateBookingStatus);

// --- Dashboard ---
router.get("/dashboard", getOperatorDashboard);
router.get("/statistics", getBookingStatistics);

// --- Customers ---
router.get("/customers", getOperatorCustomers);
router.get("/customers/:userId/bookings", getCustomerBookingHistory);

// --- Earnings ---
router.get("/earnings", getOperatorEarnings);

// --- Operator Chat (NEW) ---
// List all conversations for the logged-in operator
router.get("/messages", getConversations);

// Get messages with a specific user
router.get("/messages/booking/:bookingId", getConversation);

// Send message to a specific user
router.post("/messages/booking/:bookingId", sendMessage);

export default router;
