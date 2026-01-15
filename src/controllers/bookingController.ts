import { Request, Response, NextFunction } from "express";
import Booking from "../models/Booking";
import Tour from "../models/Tour";

// 1️⃣ Request booking (user)
export const requestBooking = async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const { tourId, bookingDate } = req.body;

    if (!tourId || !bookingDate) {
      return res.status(400).json({ success: false, message: "tourId and bookingDate are required" });
    }

    // Check if tour exists
    const tour = await Tour.findById(tourId);
    if (!tour) return res.status(404).json({ success: false, message: "Tour not found" });

    const booking = await Booking.create({
      tourId,
      userId: req.user!.id,
      bookingDate,
      status: "pending"
    });

    res.status(201).json({ success: true, booking });
  } catch (error) {
    next(error);
  }
};

// 2️⃣ Get bookings for a user
export const getUserBookings = async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const bookings = await Booking.find({ userId: req.user!.id })
      .populate("tourId", "title price location")
      .populate("userId", "name email");

    res.json({ success: true, bookings });
  } catch (error) {
    next(error);
  }
};

// 3️⃣ Get all bookings for operator (for their tours)
export const getOperatorBookings = async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const tours = await Tour.find({ createdBy: req.user!.id }).select("_id");
    const tourIds = tours.map(t => t._id);

    const bookings = await Booking.find({ tourId: { $in: tourIds } })
      .populate("tourId", "title")
      .populate("userId", "name email");

    res.json({ success: true, bookings });
  } catch (error) {
    next(error);
  }
};

// 4️⃣ Accept / Reject booking (operator)
export const updateBookingStatus = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const { status } = req.body; // "accepted" or "rejected"

    // Find booking and populate tourId to access createdBy
    const booking = await Booking.findById(req.params.id).populate("tourId");

    if (!booking)
      return res.status(404).json({ success: false, message: "Booking not found" });

    // Cast tourId to any so TypeScript knows it has createdBy
    const tour = booking.tourId as any;

    // Check if operator owns this tour
    if (tour.createdBy.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Validate status
    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    // Update booking status
    booking.status = status;
    await booking.save();

    res.json({ success: true, booking });
  } catch (error) {
    next(error);
  }
};

// 5️⃣ Cancel booking (user)
export const cancelBooking = async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    if (booking.userId.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    booking.status = "cancelled";
    await booking.save();

    res.json({ success: true, booking });
  } catch (error) {
    next(error);
  }
};
