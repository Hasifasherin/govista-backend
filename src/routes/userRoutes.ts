import express from "express";
import { protect } from "../middlewares/authMiddleware";
import {
  getProfile,
  updateProfile,
  changePassword,
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  getBookingHistory
} from "../controllers/userController";

const router = express.Router();

router.use(protect);

// Profile
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/password", changePassword);

// Wishlist
router.get("/wishlist", getWishlist);
router.post("/wishlist", addToWishlist);
router.delete("/wishlist/:tourId", removeFromWishlist);

// Bookings
router.get("/bookings", getBookingHistory);

export default router;