import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Tour from "../models/Tour";

// CREATE TOUR
export const createTour = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    if (!["operator", "admin"].includes(req.user!.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const {
      title,
      description,
      price,
      location,
      duration,
      maxGroupSize,
      availableDates,
      image,
    } = req.body;

    const tour = await Tour.create({
      title,
      description,
      price,
      location,
      duration,
      maxGroupSize,
      availableDates,
      image,
      createdBy: req.user!.id,
    });

    res.status(201).json({ success: true, tour });
  } catch (error) {
    next(error);
  }
};

// GET ALL TOURS (Pagination)
export const getTours = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const tours = await Tour.find()
      .populate("createdBy", "name email role")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Tour.countDocuments();

    res.json({
      success: true,
      page,
      total,
      count: tours.length,
      tours,
    });
  } catch (error) {
    next(error);
  }
};

// =======================
// GET SINGLE TOUR
// =======================
export const getTour = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tourId = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return res.status(400).json({ success: false, message: "Invalid tour id" });
    }

    const tour = await Tour.findById(tourId).populate(
      "createdBy",
      "name email role"
    );

    if (!tour) {
      return res.status(404).json({ success: false, message: "Tour not found" });
    }

    res.json({ success: true, tour });
  } catch (error) {
    next(error);
  }
};

// UPDATE TOUR
export const updateTour = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const tourId = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return res.status(400).json({ success: false, message: "Invalid tour id" });
    }

    const tour = await Tour.findById(tourId);
    if (!tour) {
      return res.status(404).json({ success: false, message: "Tour not found" });
    }

    if (tour.createdBy.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    //  Explicit field updates only
    const allowedFields = [
      "title",
      "description",
      "price",
      "location",
      "duration",
      "maxGroupSize",
      "availableDates",
      "image",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        (tour as any)[field] = req.body[field];
      }
    });

    await tour.save();

    res.json({ success: true, tour });
  } catch (error) {
    next(error);
  }
};

// DELETE TOUR
export const deleteTour = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const tourId = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return res.status(400).json({ success: false, message: "Invalid tour id" });
    }

    const tour = await Tour.findById(tourId);
    if (!tour) {
      return res.status(404).json({ success: false, message: "Tour not found" });
    }

    if (tour.createdBy.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await tour.deleteOne();
    res.json({ success: true, message: "Tour deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// SEARCH & FILTER TOURS
export const searchTours = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      title,
      location,
      minPrice,
      maxPrice,
      minDuration,
      maxDuration,
      date,
    } = req.query;

    const filter: any = {};

    if (title) {
      filter.title = { $regex: title, $options: "i" };
    }

    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (minDuration || maxDuration) {
      filter.duration = {};
      if (minDuration) filter.duration.$gte = Number(minDuration);
      if (maxDuration) filter.duration.$lte = Number(maxDuration);
    }

    if (date) {
      const searchDate = new Date(date as string);
      filter.availableDates = { $elemMatch: { $eq: searchDate } };
    }

    const tours = await Tour.find(filter)
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: tours.length, tours });
  } catch (error) {
    next(error);
  }
};