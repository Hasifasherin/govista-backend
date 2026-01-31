import express from "express";
import { protect, roleAccess } from "../middlewares/authMiddleware";
import { 
  createReview, 
  getTourReviews, 
  updateReview, 
  deleteReview,
  getUserReviews,     // ✅ ADDED
  getReviewDetails    // ✅ ADDED
} from "../controllers/reviewController";

const router = express.Router();

// User creates a review
router.post("/", protect, roleAccess("user"), createReview);

// Get all reviews for a tour (public) - ✅ FIXED: Changed path to avoid conflict
router.get("/tour/:tourId", getTourReviews);

// Get all reviews by current user
router.get("/user/my-reviews", protect, roleAccess("user"), getUserReviews);

// Get single review details (public)
router.get("/:id", getReviewDetails);

// User updates their review
router.put("/:id", protect, roleAccess("user"), updateReview);

// User deletes their review
router.delete("/:id", protect, roleAccess("user"), deleteReview);

export default router;