import { Request, Response, NextFunction } from "express";
import Review from "../models/Review";
import Tour from "../models/Tour";
import Booking from "../models/Booking";
import mongoose from "mongoose";

// Helper: Recalculate average rating and reviews count for a tour
const updateTourRating = async (tourId: string) => {
  const stats = await Review.aggregate([
    { $match: { tourId: new mongoose.Types.ObjectId(tourId) } },
    {
      $group: {
        _id: "$tourId",
        averageRating: { $avg: "$rating" },
        reviewsCount: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      averageRating: stats[0].averageRating,
      reviewsCount: stats[0].reviewsCount,
    });
  } else {
    // No reviews, reset
    await Tour.findByIdAndUpdate(tourId, { averageRating: 0, reviewsCount: 0 });
  }
};

//  Create Review
export const createReview = async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const { tourId, rating, comment } = req.body;

    if (!tourId || !rating || !comment) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Check if tour exists
    const tour = await Tour.findById(tourId);
    if (!tour) return res.status(404).json({ success: false, message: "Tour not found" });

    // Check if user already reviewed
    const existing = await Review.findOne({ tourId, userId: req.user!.id });
    if (existing) return res.status(400).json({ success: false, message: "You already reviewed this tour" });

    //  Check if user has an accepted booking and completed the tour
    const now = new Date();
    const booking = await Booking.findOne({
      tourId,
      userId: req.user!.id,
      status: "accepted",
      bookingDate: { $lt: now },
    });

    if (!booking) {
      return res.status(400).json({
        success: false,
        message: "You can only review tours you have booked and completed",
      });
    }

    const review = await Review.create({
      tourId,
      userId: req.user!.id,
      rating,
      comment,
    });

    //  Update tour rating after creating review
    await updateTourRating(tourId);

    res.status(201).json({ success: true, review });
  } catch (error) {
    next(error);
  }
};

//  Get all reviews for a tour
export const getTourReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tourId } = req.params;
    const reviews = await Review.find({ tourId })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    next(error);
  }
};

//  Update review (user only)
export const updateReview = async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });

    if (review.userId.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { rating, comment } = req.body;
    if (rating) review.rating = rating;
    if (comment) review.comment = comment;

    await review.save();

    //  Update tour rating after updating review
    await updateTourRating(review.tourId.toString());

    res.json({ success: true, review });
  } catch (error) {
    next(error);
  }
};

//  Delete review (user only)
export const deleteReview = async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });

    if (review.userId.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await review.deleteOne();

    //  Update tour rating after deleting review
    await updateTourRating(review.tourId.toString());

    res.json({ success: true, message: "Review deleted successfully" });
  } catch (error) {
    next(error);
  }
};
