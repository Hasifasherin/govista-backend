import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking";
import Tour from "../models/Tour";
import { createNotification } from "../utils/notificationHelper";

//  REQUEST BOOKING (USER)
export const requestBooking = async (
    req: Request & { user?: any },
    res: Response,
    next: NextFunction
) => {
    try {
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

        const tour = await Tour.findById(tourId);
        if (!tour) {
            return res.status(404).json({ success: false, message: "Tour not found" });
        }

        // Prevent duplicate booking
        const existingBooking = await Booking.findOne({
            tourId,
            userId: req.user!.id,
            bookingDate,
            status: { $in: ["pending", "accepted"] },
        });

        if (existingBooking) {
            return res
                .status(400)
                .json({ success: false, message: "Booking already exists" });
        }

        // Calculate already booked participants for this tour & date
        const existingBookings = await Booking.find({
            tourId,
            bookingDate,
            status: { $in: ["pending", "accepted"] }
        });

        const bookedCount = existingBookings.reduce(
            (sum, booking) => sum + booking.participants,
            0
        );

        if (bookedCount + participants > tour.maxGroupSize) {
            return res.status(400).json({
                success: false,
                message: "Not enough available slots for this date"
            });
        }

        const booking = await Booking.create({
            tourId,
            userId: req.user!.id,
            bookingDate,
            participants,
            status: "pending",
        });

        // 🔔 Notification: Inform operator of new booking request
        await createNotification({
            user: tour.createdBy.toString(),
            title: "New Booking Request",
            message: `A new booking request was made for your tour "${tour.title}".`,
            type: "booking"
        });

        res.status(201).json({ success: true, booking });
    } catch (error) {
        next(error);
    }
};

//  GET USER BOOKINGS
export const getUserBookings = async (
    req: Request & { user?: any },
    res: Response,
    next: NextFunction
) => {
    try {
        const bookings = await Booking.find({ userId: req.user!.id })
            .populate("tourId", "title price location")
            .sort({ createdAt: -1 });

        res.json({ success: true, count: bookings.length, bookings });
    } catch (error) {
        next(error);
    }
};

//  GET OPERATOR BOOKINGS
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
        const tourIds = tours.map((t) => t._id);

        const bookings = await Booking.find({ tourId: { $in: tourIds } })
            .populate("tourId", "title")
            .populate("userId", "name email")
            .sort({ createdAt: -1 });

        res.json({ success: true, count: bookings.length, bookings });
    } catch (error) {
        next(error);
    }
};

//  ACCEPT / REJECT BOOKING (OPERATOR)
export const updateBookingStatus = async (
    req: Request & { user?: any },
    res: Response,
    next: NextFunction
) => {
    try {
        if (req.user!.role !== "operator") {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        const bookingId = String(req.params.id);
        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid booking id" });
        }

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
                .json({ success: false, message: "Booking already processed" });
        }

        const tour = booking.tourId as any;

        if (tour.createdBy.toString() !== req.user!.id) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        booking.status = status;
        await booking.save();

        // 🔔 Notification: Inform user about booking acceptance/rejection
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

//  CANCEL BOOKING (USER)
export const cancelBooking = async (
    req: Request & { user?: any },
    res: Response,
    next: NextFunction
) => {
    try {
        const bookingId = String(req.params.id);

        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid booking id" });
        }

        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        if (booking.userId.toString() !== req.user!.id) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        // ❗ Business rule
        if (booking.status !== "pending") {
            return res
                .status(400)
                .json({ success: false, message: "Cannot cancel this booking" });
        }

        booking.status = "cancelled";
        await booking.save();

        // 🔔 Notification: Inform user about cancellation (optional, can notify operator too)
        await createNotification({
            user: booking.userId.toString(),
            title: "Booking Cancelled",
            message: `Your booking for "${booking.tourId}" has been cancelled.`,
            type: "booking"
        });

        res.json({ success: true, booking });
    } catch (error) {
        next(error);
    }

};
