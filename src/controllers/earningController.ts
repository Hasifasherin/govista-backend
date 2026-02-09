import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Tour from "../models/Tour";
import Booking from "../models/Booking";

// ================= GET OPERATOR EARNINGS =================
export const getOperatorEarnings = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const operatorId = req.user!.id;

    // 1️⃣ Get all tours created by operator
    const tours = await Tour.find({ createdBy: operatorId }).select("_id");

    const tourIds = tours.map(
      (t: { _id: mongoose.Types.ObjectId }) => t._id
    );

    // 2️⃣ Booking stats
    const totalBookings = await Booking.countDocuments({
      tourId: { $in: tourIds },
    });

    const acceptedBookings = await Booking.countDocuments({
      tourId: { $in: tourIds },
      status: "accepted",
    });

    // 3️⃣ Total Revenue
    const revenueAgg = await Booking.aggregate([
      {
        $match: {
          tourId: { $in: tourIds },
          status: "accepted",
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
          _id: null,
          totalRevenue: {
            $sum: {
              $multiply: ["$participants", "$tour.price"],
            },
          },
        },
      },
    ]);

    const totalRevenue =
      revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;

    // 4️⃣ Monthly Revenue (last 6 months)
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 5);

    const monthlyRevenueAgg = await Booking.aggregate([
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
            $sum: {
              $multiply: ["$participants", "$tour.price"],
            },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthlyRevenue = monthlyRevenueAgg.map(
      (m: {
        _id: { month: number; year: number };
        amount: number;
      }) => ({
        month: `${m._id.month}-${m._id.year}`,
        amount: m.amount,
      })
    );

    // 5️⃣ Send response
    res.status(200).json({
      success: true,
      totalRevenue,
      totalBookings,
      acceptedBookings,
      monthlyRevenue,
    });
  } catch (error) {
    next(error);
  }
};
