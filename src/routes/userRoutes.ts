import express from "express";
import { protect, roleAccess } from "../middlewares/authMiddleware";
import {
  updateProfile,
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  getBookingHistory
} from "../controllers/userController";

const router = express.Router();


// Update Profile (logged-in user)
router.put("/profile", protect, roleAccess("user"), updateProfile);

// Wishlist APIs
router.post("/wishlist", protect, roleAccess("user"), addToWishlist);
router.get("/wishlist", protect, roleAccess("user"), getWishlist);
router.delete("/wishlist/:tourId", protect, roleAccess("user"), removeFromWishlist);

// Booking History
router.get("/bookings", protect, roleAccess("user"), getBookingHistory);

export default router;
