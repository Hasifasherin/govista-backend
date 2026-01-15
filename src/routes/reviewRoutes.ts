import express from "express";
import { protect, roleAccess } from "../middlewares/authMiddleware";
import { createReview, getTourReviews, updateReview, deleteReview } from "../controllers/reviewController";

const router = express.Router();

// User creates a review
router.post("/", protect, roleAccess("user"), createReview);

// Get all reviews for a tour (public)
router.get("/:tourId", getTourReviews);

// User updates their review
router.put("/:id", protect, roleAccess("user"), updateReview);

// User deletes their review
router.delete("/:id", protect, roleAccess("user"), deleteReview);

export default router;
