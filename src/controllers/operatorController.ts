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

export const getOperatorBookings = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user!.role !== "operator") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const bookings = await Booking.find({ operatorId: req.user._id })
      .populate("tourId", "title price location")
      .populate("userId", "firstName lastName email")
      .lean();

    const formattedBookings = bookings.map(b => ({
      ...b,
      bookingDate: b.travelDate // 🔑 frontend compatibility
    }));

    res.status(200).json({
      success: true,
      bookings: formattedBookings
    });
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
    // Only operators can update bookings
    if (req.user!.role !== "operator") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }


    const { id: bookingId } = req.params;
    const { status } = req.body;

    // Fetch booking with populated tour
    const booking = await Booking.findById(req.params.id);
if (!booking) {
  return res.status(404).json({ success: false, message: "Booking not found" });
}


    // Type-safe tour extraction with unknown first
    const tour = booking.tourId as unknown as {
      _id: mongoose.Types.ObjectId;
      createdBy: mongoose.Types.ObjectId;
      title: string;
      price: number;
      location: string;
    };

    if (!tour || !tour.createdBy) {
      return res.status(400).json({ success: false, message: "Tour not populated properly" });
    }

    // Ensure operator owns this tour
    if (tour.createdBy.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Validate new status
    const validStatuses = ["pending", "accepted", "rejected", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    // Update booking
    booking.status = status;
    await booking.save();

    res.json({
      success: true,
      message: `Booking ${status} successfully`,
      booking
    });
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

    // ✅ Get all tours created by this operator
    const tours = await Tour.find({ createdBy: operatorId });
    const tourIds = tours.map(t => new mongoose.Types.ObjectId(t._id));

    // ================= Booking Stats =================
    const totalBookings = await Booking.countDocuments({ tourId: { $in: tourIds } });
    const pendingBookings = await Booking.countDocuments({ tourId: { $in: tourIds }, status: "pending" });
    const acceptedBookings = await Booking.countDocuments({ tourId: { $in: tourIds }, status: "accepted" });
    const rejectedBookings = await Booking.countDocuments({ tourId: { $in: tourIds }, status: "rejected" });

    // ✅ Total revenue (from accepted bookings)
    const earningsData = await Booking.aggregate([
      { $match: { tourId: { $in: tourIds }, status: "accepted" } },
      { $lookup: { from: "tours", localField: "tourId", foreignField: "_id", as: "tour" } },
      { $unwind: "$tour" },
      { $group: { _id: null, totalRevenue: { $sum: { $multiply: ["$participants", "$tour.price"] } } } }
    ]);
    const totalRevenue = earningsData.length > 0 ? earningsData[0].totalRevenue : 0;

    // ✅ Active tours
    const activeTours = await Tour.countDocuments({ createdBy: operatorId, isActive: true });

    // ✅ Average rating across operator tours
    const ratingData = await Tour.aggregate([
      { $match: { _id: { $in: tourIds } } },
      { $group: { _id: null, avgRating: { $avg: "$averageRating" } } }
    ]);
    const averageRating = ratingData.length > 0 ? ratingData[0].avgRating : 0;

    // ✅ Total unique customers
    const totalCustomers = (await Booking.distinct("userId", { tourId: { $in: tourIds } })).length;

    // ================= Upcoming Bookings (next 7 days) =================
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    const upcomingBookings = await Booking.find({
      tourId: { $in: tourIds },
      status: "accepted",
      bookingDate: { $gte: now, $lte: nextWeek }
    })
      .populate("tourId", "title")
      .populate("userId", "firstName lastName email")
      .sort({ bookingDate: 1 })
      .limit(5);

    // ================= Monthly Revenue (last 6 months) =================
const sixMonthsAgo = new Date();
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

const monthlyRevenueData = await Booking.aggregate([
  {
    $match: {
      tourId: { $in: tourIds },
      status: "accepted",
      createdAt: { $gte: sixMonthsAgo, $lte: now },
    },
  },
  {
    $lookup: {
      from: "tours",
      localField: "tourId",
      foreignField: "_id",
      as: "tour",
    },
  },
  { $unwind: "$tour" },
  {
    $group: {
      _id: {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
      },
      amount: {
        $sum: { $multiply: ["$participants", "$tour.price"] },
      },
    },
  },
  { $sort: { "_id.year": 1, "_id.month": 1 } },
]);

const monthlyRevenue = monthlyRevenueData.map((m) => ({
  month: `${m._id.month}-${m._id.year}`,
  amount: m.amount,
}));

    // ================= Monthly Bookings =================
   const monthlyBookingsData = await Booking.aggregate([
  {
    $match: {
      tourId: { $in: tourIds },
      createdAt: { $gte: sixMonthsAgo, $lte: now },
    },
  },
  {
    $group: {
      _id: {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
      },
      count: { $sum: 1 },
    },
  },
  { $sort: { "_id.year": 1, "_id.month": 1 } },
]);

const monthlyBookings = monthlyBookingsData.map((m) => ({
  month: `${m._id.month}-${m._id.year}`,
  count: m.count,
}));

    // ================= Tour Categories =================
    const tourCategories = await Tour.aggregate([
      {
        $match: { _id: { $in: tourIds } }
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "categories",          // ⚠️ collection name (plural, lowercase)
          localField: "_id",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: "$category" },
      {
        $project: {
          _id: 0,
          category: "$category.name",  // ✅ SEND NAME, NOT ID
          count: 1
        }
      }
    ]);

    // ================= Send Response =================
    res.json({
      success: true,
      stats: {
        totalTours: tours.length,
        activeTours,
        totalBookings,
        pendingBookings,
        acceptedBookings,
        rejectedBookings,
        totalRevenue,
        averageRating,
        totalCustomers,
        monthlyRevenue,
        monthlyBookings,
        tourCategories,
        upcomingBookings
      }
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

    res.json({ success: true, booking });
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

//  Get all customers who booked operator's tours
export const getOperatorCustomers = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user!.role !== "operator") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const operatorId = req.user!.id;

    // Fetch bookings with user info
    const bookings = await Booking.find({ operatorId })
      .populate("userId", "firstName lastName email phone")
      .lean();

    type PopulatedUser = {
      _id: mongoose.Types.ObjectId;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    };

    type BookingWithUser = {
      _id: mongoose.Types.ObjectId;
      userId: PopulatedUser;
      bookingDate?: Date;
      createdAt: Date;
    };

    const bookingsTyped = bookings as unknown as BookingWithUser[];

    const uniqueUsersMap: Record<
      string,
      {
        _id: mongoose.Types.ObjectId;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        totalBookings: number;
        lastBookingDate: Date | null;
        chatBookingId: mongoose.Types.ObjectId | null;
      }
    > = {};

    bookingsTyped.forEach((b) => {
      const user = b.userId;
      if (!user) return;

      const userKey = user._id.toString();

      // Initialize user
      if (!uniqueUsersMap[userKey]) {
        uniqueUsersMap[userKey] = {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          totalBookings: 0,
          lastBookingDate: null,
          chatBookingId: null,
        };
      }

      uniqueUsersMap[userKey].totalBookings += 1;

      const bookingDate = b.bookingDate
        ? new Date(b.bookingDate)
        : new Date(b.createdAt);

      // Keep latest booking for chat
      if (
        !uniqueUsersMap[userKey].lastBookingDate ||
        bookingDate > uniqueUsersMap[userKey].lastBookingDate
      ) {
        uniqueUsersMap[userKey].lastBookingDate = bookingDate;
        uniqueUsersMap[userKey].chatBookingId = b._id;
      }
    });

    const customers = Object.values(uniqueUsersMap);

    res.json({
      success: true,
      count: customers.length,
      customers,
    });
  } catch (error) {
    next(error);
  }
};


//  Get booking history of a specific customer (user)
export const getCustomerBookingHistory = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;

    if (req.user!.role !== "operator") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const operatorTourIds = await Booking.find({ operatorId: req.user!.id }).distinct("tourId");

    const bookings = await Booking.find({
      userId,
      tourId: { $in: operatorTourIds }
    })
      .populate("tourId", "title location price")
      .sort({ bookingDate: -1 })
      .lean();

    type PopulatedTourBooking = {
      tourId: { _id: mongoose.Types.ObjectId; title: string; location: string; price: number };
      bookingDate?: Date;
      participants?: number;
      status?: string;
      createdAt: Date;
    };

    // ✅ Type assertion via unknown first
    const bookingsTyped = bookings as unknown as PopulatedTourBooking[];

    res.json({ success: true, count: bookingsTyped.length, bookings: bookingsTyped });
  } catch (error) {
    next(error);
  }
};