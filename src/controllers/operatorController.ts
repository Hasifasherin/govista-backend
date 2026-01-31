import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Tour from "../models/Tour";
import Booking from "../models/Booking";

//  Get all tours created by operator
export const getOperatorTours = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user!.role !== "operator") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const tours = await Tour.find({ createdBy: req.user!.id })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: tours.length, tours });
  } catch (error) {
    next(error);
  }
};

//  Get bookings for operator's tours
export const getOperatorBookings = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user!.role !== "operator") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const tours = await Tour.find({ createdBy: req.user!.id }).select("_id");
    const tourIds = tours.map(t => t._id);

    const bookings = await Booking.find({ tourId: { $in: tourIds } })
      .populate("tourId", "title location price")
      .populate("userId", "firstName lastName email") // ✅ FIXED: changed "name" to "firstName lastName"
      .sort({ createdAt: -1 });

    res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
};

// 1. Update Booking Status (Accept/Reject/Cancel)
export const updateBookingStatus = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body; // "accepted", "rejected", "cancelled"

    // Find booking and verify it belongs to operator's tour
    const booking = await Booking.findById(bookingId)
      .populate("tourId", "createdBy");
    
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Check if tour belongs to this operator
    const tour = await Tour.findById(booking.tourId);
    if (!tour || tour.createdBy.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Validate status
    const validStatuses = ["pending", "accepted", "rejected", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    booking.status = status;
    await booking.save();

    res.json({ success: true, message: `Booking ${status} successfully`, booking });
  } catch (error) {
    next(error);
  }
};

// 2. Get Operator Dashboard Stats
export const getOperatorDashboard = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const operatorId = req.user!.id;

    // Get operator's tours
    const tours = await Tour.find({ createdBy: operatorId });
    const tourIds = tours.map(t => t._id);

    // Total bookings
    const totalBookings = await Booking.countDocuments({ tourId: { $in: tourIds } });

    // Booking status breakdown
    const pendingBookings = await Booking.countDocuments({ 
      tourId: { $in: tourIds }, 
      status: "pending" 
    });
    const acceptedBookings = await Booking.countDocuments({ 
      tourId: { $in: tourIds }, 
      status: "accepted" 
    });
    const rejectedBookings = await Booking.countDocuments({ 
      tourId: { $in: tourIds }, 
      status: "rejected" 
    });

    // Total earnings (from accepted bookings)
    const earningsData = await Booking.aggregate([
      { $match: { tourId: { $in: tourIds }, status: "accepted" } },
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
          _id: null,
          totalEarnings: { $sum: { $multiply: ["$participants", "$tour.price"] } }
        }
      }
    ]);

    const totalEarnings = earningsData.length > 0 ? earningsData[0].totalEarnings : 0;

    // Upcoming bookings (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const upcomingBookings = await Booking.find({
      tourId: { $in: tourIds },
      status: "accepted",
      bookingDate: { $gte: new Date(), $lte: nextWeek }
    })
      .populate("tourId", "title")
      .populate("userId", "firstName lastName email")
      .sort({ bookingDate: 1 })
      .limit(5);

    res.json({
      success: true,
      stats: {
        totalTours: tours.length,
        totalBookings,
        pendingBookings,
        acceptedBookings,
        rejectedBookings,
        totalEarnings
      },
      upcomingBookings
    });
  } catch (error) {
    next(error);
  }
};

// 3. Get Booking Details
export const getOperatorBookingDetails = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
      .populate("tourId", "title description location price duration createdBy")
      .populate("userId", "firstName lastName email phone");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Verify operator owns the tour
    const tour = await Tour.findById(booking.tourId);
    if (!tour || tour.createdBy.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.json({ success: true, booking }); // ✅ FIXED: changed "false" to "true"
  } catch (error) {
    next(error);
  }
};

// 4. Get booking statistics by date range (for charts)
export const getBookingStatistics = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate } = req.query;
    const operatorId = req.user!.id;

    const tours = await Tour.find({ createdBy: operatorId }).select("_id");
    const tourIds = tours.map(t => t._id);

    // Date range filter
    const dateFilter: any = { tourId: { $in: tourIds } };
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    // Daily booking count for chart
    const dailyStats = await Booking.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 },
          totalParticipants: { $sum: "$participants" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Status distribution
    const statusStats = await Booking.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      dailyStats,
      statusStats
    });
  } catch (error) {
    next(error);
  }
};