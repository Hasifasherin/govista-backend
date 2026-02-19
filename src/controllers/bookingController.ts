import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking";
import Tour from "../models/Tour";
import { createNotification } from "../utils/notificationHelper";

// Helper: Normalize date to UTC midnight
const normalizeDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};



// ================= REQUEST BOOKING =================
export const requestBooking = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { tourId, travelDate, participants } = req.body;

    if (!tourId || !travelDate) {
      return res.status(400).json({
        success: false,
        message: "tourId and travelDate are required",
      });
    }

    if (!participants || participants < 1) {
      return res.status(400).json({
        success: false,
        message: "participants must be at least 1",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tour id",
      });
    }

    const normalizedTravelDate = normalizeDate(travelDate);
    const today = normalizeDate(new Date().toISOString());

    if (normalizedTravelDate < today) {
      return res.status(400).json({
        success: false,
        message: "Past dates not allowed",
      });
    }

    const tour = await Tour.findById(tourId).select(
      "maxGroupSize price title createdBy"
    );

    if (!tour) {
      return res.status(404).json({
        success: false,
        message: "Tour not found",
      });
    }

    // Prevent duplicate booking
    const duplicate = await Booking.findOne({
      tourId,
      userId: req.user.id,
      travelDate: normalizedTravelDate,
      status: { $in: ["pending", "accepted"] },
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: "Booking already exists",
      });
    }

    // Capacity check
    const existingBookings = await Booking.find({
      tourId,
      travelDate: normalizedTravelDate,
      status: { $in: ["pending", "accepted"] },
    });

    const bookedCount = existingBookings.reduce(
      (sum, b) => sum + b.participants,
      0
    );

    if (bookedCount + participants > tour.maxGroupSize) {
      return res.status(400).json({
        success: false,
        message: "Not enough available slots",
      });
    }

    const booking = await Booking.create({
      tourId,
      userId: req.user.id,
      operatorId: tour.createdBy,
      travelDate: normalizedTravelDate,
      participants,
      status: "pending",
      paymentStatus: "unpaid",
      priceAtBooking: tour.price,
      totalPrice: tour.price * participants,
    });

    await createNotification({
      user: tour.createdBy.toString(),
      title: "New Booking Request",
      message: `New booking request for "${tour.title}".`,
      type: "booking",
    });

    res.status(201).json({ success: true, booking });
  } catch (error) {
    next(error);
  }
};



// ================= USER BOOKINGS =================
export const getUserBookings = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const bookings = await Booking.find({ userId: req.user!.id })
      .populate("tourId", "title price location")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    next(error);
  }
};



// ================= OPERATOR BOOKINGS =================
export const getOperatorBookings = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user!.role !== "operator") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const bookings = await Booking.find({
      operatorId: req.user!.id,
    })
      .populate("tourId", "title price maxGroupSize")
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    next(error);
  }
};



// ================= ACCEPT / REJECT =================
export const updateBookingStatus = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user!.role !== "operator") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const bookingId = String(req.params.id);
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking id",
      });
    }

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const booking = await Booking.findById(bookingId)
      .populate("tourId", "title maxGroupSize createdBy");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Already processed",
      });
    }

    if (booking.operatorId.toString() !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const tour = booking.tourId as any;

    // Capacity re-check on acceptance
    if (status === "accepted") {
      const existingAccepted = await Booking.find({
        tourId: tour._id,
        travelDate: booking.travelDate,
        status: "accepted",
      });

      const totalParticipants = existingAccepted.reduce(
        (sum, b) => sum + b.participants,
        0
      );

      if (totalParticipants + booking.participants > tour.maxGroupSize) {
        return res.status(400).json({
          success: false,
          message: "Tour is already full",
        });
      }
    }

    // Update status
    booking.status = status;

    // ✅ Reset payment if rejected
    if (status === "rejected") {
      booking.paymentStatus = "unpaid";
      booking.amountPaid = 0;
      booking.stripePaymentIntentId = undefined as any;
    }

    await booking.save();

    await createNotification({
      user: booking.userId.toString(),
      title: "Booking Update",
      message: `Your booking for "${tour.title}" was ${status}.`,
      type: "booking",
    });

    res.json({ success: true, booking });
  } catch (error) {
    next(error);
  }
};



// ================= GET BOOKING DETAILS =================
export const getBookingDetails = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const bookingId = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking id",
      });
    }

    const booking = await Booking.findById(bookingId)
      .populate(
        "tourId",
        "title description location price duration availableDates image createdBy"
      )
      .populate("userId", "firstName lastName email phone");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const isUserOwner =
      (booking.userId as any)._id.toString() === req.user!.id;

    const isOperatorOwner =
      req.user!.role === "operator" &&
      booking.operatorId.toString() === req.user!.id;

    if (!isUserOwner && !isOperatorOwner && req.user!.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    res.json({ success: true, booking });
  } catch (error) {
    next(error);
  }
};



// ================= CANCEL BOOKING =================
export const cancelBooking = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const bookingId = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking id",
      });
    }

    const booking = await Booking.findById(bookingId)
      .populate("tourId", "title createdBy");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.userId.toString() !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // ✅ Allow cancel for pending + accepted
    if (!["pending", "accepted"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: "Booking cannot be cancelled at this stage",
      });
    }

    booking.status = "cancelled";

    await booking.save();

    const tour = booking.tourId as any;

    await createNotification({
      user: tour.createdBy.toString(),
      title: "Booking Cancelled",
      message: `A user cancelled booking for "${tour.title}".`,
      type: "booking",
    });

    res.json({ success: true, booking });
  } catch (error) {
    next(error);
  }
};
// ================= CONFIRM PAYMENT (ONE-CLICK) =================
export const confirmBookingPayment = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const bookingId = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking id",
      });
    }

    const booking = await Booking.findById(bookingId)
      .populate("tourId", "title createdBy");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Only the booking owner can confirm payment
    if (booking.userId.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Booking must be accepted first
    if (booking.status !== "accepted") {
      return res.status(400).json({ success: false, message: "Booking must be accepted first" });
    }

    // Already paid
    if (booking.paymentStatus === "paid") {
      return res.json({ success: true, message: "Already paid", booking });
    }

    // ✅ Mark as paid
    booking.paymentStatus = "paid";
    await booking.save();

    res.json({ success: true, message: "Payment confirmed", booking });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Payment failed" });
  }
};
