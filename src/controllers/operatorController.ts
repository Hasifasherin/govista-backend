import { Request, Response, NextFunction } from "express";
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
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
};
