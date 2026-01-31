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

        const { tourId, bookingDate, participants } = req.body;

        if (!tourId || !bookingDate) {
            return res
                .status(400)
                .json({ success: false, message: "tourId and bookingDate are required" });
        }

        if (!participants || participants < 1) {
            return res.status(400).json({
                success: false,
                message: "participants must be at least 1"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(tourId)) {
            return res.status(400).json({ success: false, message: "Invalid tour id" });
        }

        const normalizedBookingDate = normalizeDate(bookingDate);
        const today = normalizeDate(new Date().toISOString());

        if (normalizedBookingDate < today) {
            return res
                .status(400)
                .json({ success: false, message: "Past dates not allowed" });
        }

        const tour = await Tour.findById(tourId);
        if (!tour) {
            return res.status(404).json({ success: false, message: "Tour not found" });
        }

        // Prevent duplicate
        const duplicate = await Booking.findOne({
            tourId,
            userId: req.user.id,
            bookingDate: normalizedBookingDate,
            status: { $in: ["pending", "accepted"] }
        });

        if (duplicate) {
            return res
                .status(400)
                .json({ success: false, message: "Booking already exists" });
        }

        // Capacity check
        const existingBookings = await Booking.find({
            tourId,
            bookingDate: normalizedBookingDate,
            status: { $in: ["pending", "accepted"] }
        });

        const bookedCount = existingBookings.reduce(
            (sum, b) => sum + b.participants,
            0
        );

        if (bookedCount + participants > tour.maxGroupSize) {
            return res.status(400).json({
                success: false,
                message: "Not enough available slots"
            });
        }
const booking = await Booking.create({
    tourId,
    userId: req.user.id,
    bookingDate: normalizedBookingDate,
    participants,
    status: "pending",
    paymentStatus: "unpaid",
    priceAtBooking: tour.price,
    totalPrice: tour.price * participants  // ✅ ADD THIS
});



        await createNotification({
            user: tour.createdBy.toString(),
            title: "New Booking Request",
            message: `New booking request for "${tour.title}".`,
            type: "booking"
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
        const page = Number(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const bookings = await Booking.find({ userId: req.user!.id })
            .populate("tourId", "title price location")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({ success: true, count: bookings.length, bookings });
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
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        const tours = await Tour.find({ createdBy: req.user!.id }).select("_id");
        const tourIds = tours.map(t => t._id);

        const bookings = await Booking.find({ tourId: { $in: tourIds } })
            .populate("tourId", "title")
            .populate("userId", "firstName lastName email")
            .sort({ createdAt: -1 });

        res.json({ success: true, count: bookings.length, bookings });
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
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        const { status } = req.body;
        const bookingId = req.params.id;

        if (!["accepted", "rejected"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const booking = await Booking.findById(bookingId).populate("tourId");
        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        if (booking.status !== "pending") {
            return res
                .status(400)
                .json({ success: false, message: "Already processed" });
        }

        const tour = booking.tourId as any;

        if (tour.createdBy.toString() !== req.user!.id) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        // Re-check capacity before accept
        if (status === "accepted") {
            const existing = await Booking.find({
                tourId: tour._id,
                bookingDate: booking.bookingDate,
                status: "accepted"
            });

            const total = existing.reduce(
                (sum, b) => sum + b.participants,
                0
            );

            if (total + booking.participants > tour.maxGroupSize) {
                return res.status(400).json({
                    success: false,
                    message: "Tour is already full"
                });
            }
        }

        booking.status = status;
        await booking.save();

        await createNotification({
            user: booking.userId.toString(),
            title: "Booking Update",
            message: `Your booking for "${tour.title}" was ${status}.`,
            type: "booking"
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
        const booking = await Booking.findById(req.params.id)
            .populate("tourId", "title description location price duration availableDates image")
            .populate("userId", "firstName lastName email phone");

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        // Check access: either user owns booking or operator owns tour
        const tour = await Tour.findById(booking.tourId);
        const isUserOwner = booking.userId._id.toString() === req.user.id;
        const isOperatorOwner = req.user.role === "operator" && 
                               tour?.createdBy.toString() === req.user.id;

        if (!isUserOwner && !isOperatorOwner && req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Access denied" });
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
        const booking = await Booking.findById(req.params.id).populate("tourId");

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        if (booking.userId.toString() !== req.user!.id) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        if (booking.status !== "pending") {
            return res.status(400).json({
                success: false,
                message: "Only pending bookings can be cancelled"
            });
        }

        booking.status = "cancelled";
        await booking.save();

        const tour = booking.tourId as any;

        await createNotification({
            user: tour.createdBy.toString(),
            title: "Booking Cancelled",
            message: `A user cancelled booking for "${tour.title}".`,
            type: "booking"
        });

        res.json({ success: true, booking });
    } catch (error) {
        next(error);
    }
};
