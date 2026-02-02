import express from "express";
import { protectAdmin } from "../middlewares/adminAuthMiddleware";
import {
  getAllUsers,
  getUpcomingTrips,
  toggleUserBlock,
  getDashboardStats,
  getMonthlyCalendar,
  getAllOperators,
  getAllBookings,
  getBookingDetails,
  deleteReview,
  toggleOperatorBlock,
  updateBookingStatus,
  updateOperatorStatus,
  getAllTours,
  updateTourApproval,
  toggleTourActive,
  toggleTourFeatured,
} from "../controllers/adminController";

import {
  createSlider,
  updateSlider,
  deleteSlider,
} from "../controllers/sliderController";

import multer from "multer";
import {
  validateImage,
  uploadSingleImage,
  updateImage,
} from "../middlewares/uploadMiddleware";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 🔐 Protect all admin routes
router.use(protectAdmin);

// ================= USERS =================
router.get("/users", getAllUsers);
router.put("/users/:id/block", toggleUserBlock);

// ================= OPERATORS =================
router.get("/operators", getAllOperators);
router.put("/operators/:id/status", updateOperatorStatus);
router.put("/operators/:id/block", toggleOperatorBlock);

// ================= TOURS =================
router.get("/tours", getAllTours);
router.put("/tours/:id/approval", updateTourApproval);
router.put("/tours/:id/active", toggleTourActive);
router.put("/tours/:id/feature", toggleTourFeatured);

// ================= BOOKINGS =================
router.get("/bookings", getAllBookings);
router.get("/bookings/:id", getBookingDetails);
router.put("/bookings/:id/status", updateBookingStatus);

// ================= REVIEWS =================
router.delete("/reviews/:id", deleteReview);

// ================= ANALYTICS =================
router.get("/dashboard", getDashboardStats);

// ================= CALENDAR =================
router.get("/calendar", getMonthlyCalendar);
router.get("/upcoming-trips", getUpcomingTrips);

// ================= SLIDERS (ADMIN) =================
router.post(
  "/sliders",
  upload.single("image"),
  validateImage,
  uploadSingleImage,
  createSlider
);

router.put(
  "/sliders/:id",
  upload.single("image"),
  validateImage,
  updateImage,
  updateSlider
);

router.delete("/sliders/:id", deleteSlider);

export default router;
