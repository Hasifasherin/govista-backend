import express from "express";
import { protectAdmin } from "../middlewares/adminAuthMiddleware";
import {
  getAllUsers,getUpcomingTrips,
  toggleUserBlock,getDashboardStats,getMonthlyCalendar,
  getAllOperators,getAllBookings,getBookingDetails,
  deleteReview,toggleOperatorBlock,    
  updateBookingStatus,
  updateOperatorStatus,getAllTours,updateTourApproval,toggleTourActive,toggleTourFeatured
} from "../controllers/adminController";
const router = express.Router();

// Protect all routes with admin JWT
router.use(protectAdmin);

// Users
router.get("/users", getAllUsers);
router.put("/users/:id/block", toggleUserBlock);

// Operators
router.get("/operators", getAllOperators);
router.put("/operators/:id/status", updateOperatorStatus);
router.put("/operators/:id/block", toggleOperatorBlock);

// Tours
router.get("/tours", getAllTours);
router.put("/tours/:id/approval", updateTourApproval);
router.put("/tours/:id/active", toggleTourActive);
router.put("/tours/:id/feature", toggleTourFeatured);

// Bookings (Admin)
router.get("/bookings", getAllBookings);          
router.get("/bookings/:id", getBookingDetails);   
router.put("/bookings/:id/status", updateBookingStatus);  
router.delete("/reviews/:id", deleteReview);             
//analytic
router.get("/dashboard", getDashboardStats);

// Calendar & Trips
router.get("/calendar", getMonthlyCalendar);
router.get("/upcoming-trips", getUpcomingTrips);

export default router;
