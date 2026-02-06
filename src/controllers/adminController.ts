import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import User from "../models/User";
import Tour from "../models/Tour";
import Booking from "../models/Booking";
import Review from "../models/Review";


//  Get All Users
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await User.find({ role: "user" }).select("-password");
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
};

//  Block / Unblock User
export const toggleUserBlock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== "user") {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.isBlocked = !user.isBlocked; // toggle
    await user.save();

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

//  Get All Operators
export const getAllOperators = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const operators = await User.find({ role: "operator" }).select("-password");
    res.json({ success: true, count: operators.length, operators });
  } catch (error) {
    next(error);
  }
};

// BLOCK / UNBLOCK OPERATOR
export const toggleOperatorBlock = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const operator = await User.findById(req.params.id).select("role isBlocked");

    if (!operator || operator.role !== "operator") {
      return res.status(404).json({
        success: false,
        message: "Operator not found"
      });
    }

    const updatedOperator = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { isBlocked: !operator.isBlocked } },
      { new: true }
    );

    res.json({
      success: true,
      message: updatedOperator!.isBlocked
        ? "Operator blocked successfully"
        : "Operator unblocked successfully",
      operator: updatedOperator
    });
  } catch (error) {
    next(error);
  }
};

//  Approve / Suspend Operator
export const updateOperatorStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const operator = await User.findById(req.params.id);
    if (!operator || operator.role !== "operator") {
      return res.status(404).json({ success: false, message: "Operator not found" });
    }

    const { isApproved } = req.body;
    if (typeof isApproved !== "boolean") {
      return res.status(400).json({ success: false, message: "isApproved must be boolean" });
    }

    operator.isApproved = isApproved;
    await operator.save();

    res.json({ success: true, operator });
  } catch (error) {
    next(error);
  }
};


//tour controller
// 1️⃣ Get All Tours
export const getAllTours = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tours = await Tour.find().populate("createdBy", "firstName lastName email role");
    res.json({ success: true, count: tours.length, tours });
  } catch (error) {
    next(error);
  }
};

// 2️⃣ Approve / Reject Tour
export const updateTourApproval = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body || {};

    console.log("Request params:", req.params);
    console.log("Request body:", req.body);

    if (!status) {
      return res.status(400).json({ success: false, message: "Request body is missing" });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be either 'approved' or 'rejected'" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid tour ID" });
    }

    // Use findByIdAndUpdate with { new: true } and skip validation
    const tour = await Tour.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, runValidators: false } // 🔹 skip validation
    );

    if (!tour) return res.status(404).json({ success: false, message: "Tour not found" });

    res.json({ success: true, tour });
  } catch (error) {
    console.error("Update tour approval error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


// Toggle Active / Inactive
export const toggleTourActive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tourId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return res.status(400).json({ success: false, message: "Invalid tour ID" });
    }

    const tour = await Tour.findById(tourId);
    if (!tour) return res.status(404).json({ success: false, message: "Tour not found" });

    const updatedTour = await Tour.findByIdAndUpdate(
      tourId,
      { $set: { isActive: !tour.isActive } },
      { new: true, runValidators: false }
    );

    res.json({
      success: true,
      message: updatedTour!.isActive ? "Tour activated" : "Tour deactivated",
      tour: updatedTour
    });
  } catch (error) {
    next(error);
  }
};

// Toggle Featured / Unfeatured
export const toggleTourFeatured = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tourId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return res.status(400).json({ success: false, message: "Invalid tour ID" });
    }

    const tour = await Tour.findById(tourId);
    if (!tour) return res.status(404).json({ success: false, message: "Tour not found" });

    const updatedTour = await Tour.findByIdAndUpdate(
      tourId,
      { $set: { isFeatured: !tour.isFeatured } },
      { new: true, runValidators: false }
    );

    res.json({
      success: true,
      message: updatedTour!.isFeatured ? "Tour featured" : "Tour unfeatured",
      tour: updatedTour
    });
  } catch (error) {
    next(error);
  }
};



// booking 
//  Get All Bookings (Admin)
export const getAllBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status, date } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (date) filter.bookingDate = new Date(date as string);

    const bookings = await Booking.find(filter)
      .populate("tourId", "title location price createdBy")
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
};

//  Get Booking Details by ID
export const getBookingDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("tourId", "title description location price duration createdBy")
      .populate("userId", "name email");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    res.json({ success: true, booking });
  } catch (error) {
    next(error);
  }
};

//analytic 
export const getDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    // TOTAL COUNTS
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalOperators = await User.countDocuments({ role: "operator" });
    const totalBookings = await Booking.countDocuments();

    //tours
    const totalTours = await Tour.countDocuments();
    const totalActiveTours = await Tour.countDocuments({ isActive: true });
    const totalFeaturedTours = await Tour.countDocuments({ isFeatured: true });

    // NEW USERS & OPERATORS
    const newUsers = await User.countDocuments({
      role: "user",
      createdAt: { $gte: last30Days }
    });

    const newOperators = await User.countDocuments({
      role: "operator",
      createdAt: { $gte: last30Days }
    });

    
   

    // BOOKING TREND (CHART)
    const bookingTrends = await Booking.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // TOP AGENCIES BY BOOKINGS
    const topAgencies = await Booking.aggregate([
      { $match: { status: "accepted" } },
      {
        $lookup: {
          from: "tours",
          localField: "tourId",
          foreignField: "_id",
          as: "tour"
        }
      },
      { $unwind: "$tour" },
      {
        $group: {
          _id: "$tour.createdBy",
          totalBookings: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "operator"
        }
      },
      { $unwind: "$operator" },
      {
        $project: {
          operatorName: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$operator.firstName", ""] },
                  " ",
                  { $ifNull: ["$operator.lastName", ""] }
                ]
              }
            }
          },
          email: "$operator.email",
          totalBookings: 1
        }
      },
      { $sort: { totalBookings: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      success: true,
      totals: {
        totalUsers,
        totalOperators,
        totalTours,
        totalActiveTours,
        totalFeaturedTours,
        totalBookings,
        newUsers,
        newOperators
      },
      bookingTrends,
      topAgencies,
      
    });

  } catch (error) {
    next(error);
  }
};


//calender 
//  Monthly Calendar Bookings
export const getMonthlyCalendar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { month } = req.query; // format: YYYY-MM
    if (!month) return res.status(400).json({ success: false, message: "Month is required" });

    const [year, monthNumber] = (month as string).split("-").map(Number);

    const startDate = new Date(year, monthNumber - 1, 1);
    const endDate = new Date(year, monthNumber, 0, 23, 59, 59);

    const bookings = await Booking.find({
      bookingDate: { $gte: startDate, $lte: endDate },
      status: "accepted",
    })
      .populate("tourId", "title location")
      .populate("userId", "name email");

    res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
};


// Update booking status
export const updateBookingStatus = async (req: Request, res: Response) => {
  const { status } = req.body;
  const booking = await Booking.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );
  res.json({ success: true, booking });
};
//  Upcoming Trips
export const getUpcomingTrips = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();

    const bookings = await Booking.find({
      bookingDate: { $gte: today },
      status: "accepted",
    })
      .populate("tourId", "title location duration")
      .populate("userId", "name email")
      .sort({ bookingDate: 1 });

    res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
};

// Get all reviews
export const getAllReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const reviews = await Review.find()
      .populate("userId", "firstName lastName email")
      .populate("tourId", "title location price");

    res.json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    next(error);
  }
};

// Delete a review by ID (keep only ONE declaration)
export const deleteReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    res.json({ success: true, message: "Review deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// Optional: review stats for analytics
export const getReviewStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const totalReviews = await Review.countDocuments();

    const averageRatingAgg = await Review.aggregate([
      { $group: { _id: null, avgRating: { $avg: "$rating" } } }
    ]);

    const averageRating =
      averageRatingAgg.length > 0
        ? Number(averageRatingAgg[0].avgRating.toFixed(1))
        : 0;

    const ratingDistribution = await Review.aggregate([
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      totalReviews,
      averageRating,
      ratingDistribution,
    });
  } catch (error) {
    next(error);
  }
};