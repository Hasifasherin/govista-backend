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
import { getOperatorCategories } from "../controllers/adminCategoryController";

const router = express.Router();

// All routes protected for operators
router.use(protect, roleAccess("operator"));

// Get all tours created by the operator
router.get("/tours", getOperatorTours);

// GET categories for operator
router.get("/tours/categories", getOperatorCategories);


// Get all bookings for operator's tours
router.get("/bookings", getOperatorBookings);

// Get specific booking details
router.get("/bookings/:bookingId", getOperatorBookingDetails);

// Update booking status
router.put("/bookings/:bookingId/status", updateBookingStatus);

// Get operator dashboard stats
router.get("/dashboard", getOperatorDashboard);

// Get booking statistics (for charts)
router.get("/statistics", getBookingStatistics);

//  Get all customers who booked operator's tours
router.get(
  "/customers",
  protect,
  roleAccess("operator"), 
  getOperatorCustomers
);

//  Get booking history for a specific customer
router.get(
  "/customers/:userId/bookings",
  protect,
  roleAccess("operator"), 
  getCustomerBookingHistory
);

export default router;