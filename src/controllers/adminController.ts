import { Request, Response, NextFunction } from "express";
import User from "../models/User";
import Tour from "../models/Tour";
import Booking from "../models/Booking";


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
    const tours = await Tour.find().populate("createdBy", "name email role");
    res.json({ success: true, count: tours.length, tours });
  } catch (error) {
    next(error);
  }
};

// 2️⃣ Approve / Reject Tour
export const updateTourApproval = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // expected: "approved" | "rejected"

    const tour = await Tour.findById(id);
    if (!tour) return res.status(404).json({ success: false, message: "Tour not found" });

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    tour.status = status;
    await tour.save();

    res.json({ success: true, tour });
  } catch (error) {
    next(error);
  }
};

// 3️⃣ Activate / Deactivate Tour
export const toggleTourActive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tour = await Tour.findById(req.params.id);
    if (!tour) return res.status(404).json({ success: false, message: "Tour not found" });

    tour.isActive = !tour.isActive;
    await tour.save();

    res.json({ success: true, tour });
  } catch (error) {
    next(error);
  }
};

// 4️⃣ Feature / Unfeature Tour
export const toggleTourFeatured = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tour = await Tour.findById(req.params.id);
    if (!tour) return res.status(404).json({ success: false, message: "Tour not found" });

    tour.isFeatured = !tour.isFeatured;
    await tour.save();

    res.json({ success: true, tour });
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
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalOperators = await User.countDocuments({ role: "operator" });
    const totalBookings = await Booking.countDocuments();
    
    const bookingsByStatus = await Booking.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const topDestinations = await Booking.aggregate([
      { $lookup: { from: "tours", localField: "tourId", foreignField: "_id", as: "tour" } },
      { $unwind: "$tour" },
      { $group: { _id: "$tour.location", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      success: true,
      totalUsers,
      totalOperators,
      totalBookings,
      bookingsByStatus,
      topDestinations
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