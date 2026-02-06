import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Review from "../models/Review";
import Tour from "../models/Tour";
import Booking from "../models/Booking";

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

  await Tour.findByIdAndUpdate(tourId, {
    averageRating: stats[0]?.averageRating || 0,
    reviewsCount: stats[0]?.reviewsCount || 0,
  });
};

//  Create Review
export const createReview = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const { tourId, rating, comment } = req.body;
    
    //  ADDED: Validation for all required fields
    if (!tourId || !rating || !comment) {
      return res.status(400).json({ 
        success: false, 
        message: "Tour ID, rating, and comment are required" 
      });
    }

    //  ADDED: Rating validation
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        message: "Rating must be between 1 and 5" 
      });
    }

    const tour = await Tour.findById(tourId);
    if (!tour) {
      return res.status(404).json({ 
        success: false, 
        message: "Tour not found" 
      });
    }

    const existing = await Review.findOne({ tourId, userId: req.user!.id });
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: "You already reviewed this tour" 
      });
    }

    // ✅ IMPROVED: Check if user has completed AND accepted booking
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
      comment 
    });
    
    await updateTourRating(tourId);

    res.status(201).json({ 
      success: true, 
      review: {
        ...review.toObject(),
        user: {
          firstName: req.user!.firstName,
          lastName: req.user!.lastName,
          email: req.user!.email
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

//  Get all reviews for a tour
export const getTourReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tourId } = req.params;
    
    // ✅ FIXED: Type assertion to string
    const tourIdString = String(tourId);
    
    if (!mongoose.Types.ObjectId.isValid(tourIdString)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid tour ID" 
      });
    }

    const reviews = await Review.find({ tourId: tourIdString })
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      count: reviews.length, 
      reviews 
    });
  } catch (error) {
    next(error);
  }
};

// ✅ ADDED: Get all reviews by current user
export const getUserReviews = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const reviews = await Review.find({ userId: req.user!.id })
      .populate("tourId", "title location image")
      .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      count: reviews.length, 
      reviews 
    });
  } catch (error) {
    next(error);
  }
};

//  Update review
export const updateReview = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const reviewId = String(req.params.id); // ✅ FIXED: Convert to string
    
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ 
        success: false, 
        message: "Review not found" 
      });
    }

    if (review.userId.toString() !== req.user!.id) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied" 
      });
    }

    const { rating, comment } = req.body;
    
    // ✅ ADDED: Rating validation on update
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ 
          success: false, 
          message: "Rating must be between 1 and 5" 
        });
      }
      review.rating = rating;
    }
    
    if (comment !== undefined) {
      if (comment.trim().length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Comment cannot be empty" 
        });
      }
      review.comment = comment;
    }

    await review.save();
    await updateTourRating(review.tourId.toString());

    res.json({ 
      success: true, 
      review: {
        ...review.toObject(),
        updatedAt: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

//  Delete review
export const deleteReview = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const reviewId = String(req.params.id); // ✅ FIXED: Convert to string
    
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ 
        success: false, 
        message: "Review not found" 
      });
    }

    if (review.userId.toString() !== req.user!.id) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied" 
      });
    }

    const tourId = review.tourId.toString();
    await review.deleteOne();
    await updateTourRating(tourId);

    res.json({ 
      success: true, 
      message: "Review deleted successfully" 
    });
  } catch (error) {
    next(error);
  }
};

// ✅ ADDED: Get single review details
export const getReviewDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const reviewId = String(req.params.id); // ✅ FIXED: Convert to string
    
    const review = await Review.findById(reviewId)
      .populate("userId", "firstName lastName email")
      .populate("tourId", "title location");

    if (!review) {
      return res.status(404).json({ 
        success: false, 
        message: "Review not found" 
      });
    }

    res.json({ 
      success: true, 
      review 
    });
  } catch (error) {
    next(error);
  }
};