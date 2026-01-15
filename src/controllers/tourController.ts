import { Request, Response, NextFunction } from "express";
import Tour from "../models/Tour";

export const createTour = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const { title, description, price, location, duration, maxGroupSize, availableDates, image } = req.body;

    const tour = await Tour.create({
      title,
      description,
      price,
      location,
      duration,
      maxGroupSize,
      availableDates,
      image,
      createdBy: req.user!.id
    });

    res.status(201).json({ success: true, tour });
  } catch (error) {
    next(error);
  }
};

export const getTours = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tours = await Tour.find().populate("createdBy", "name email role");
    res.json({ success: true, tours });
  } catch (error) {
    next(error);
  }
};

export const getTour = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tour = await Tour.findById(req.params.id).populate("createdBy", "name email role");
    if (!tour) return res.status(404).json({ success: false, message: "Tour not found" });
    res.json({ success: true, tour });
  } catch (error) {
    next(error);
  }
};

export const updateTour = async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const tour = await Tour.findById(req.params.id);
    if (!tour) return res.status(404).json({ success: false, message: "Tour not found" });

    if (tour.createdBy.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    Object.assign(tour, req.body);
    await tour.save();

    res.json({ success: true, tour });
  } catch (error) {
    next(error);
  }
};

export const deleteTour = async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const tour = await Tour.findById(req.params.id);
    if (!tour) return res.status(404).json({ success: false, message: "Tour not found" });

    if (tour.createdBy.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await tour.deleteOne();

    res.json({ success: true, message: "Tour deleted successfully" });
  } catch (error) {
    next(error);
  }
};

//search filter
export const searchTours = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, location, minPrice, maxPrice, minDuration, maxDuration, date } = req.query;

    const filter: any = {};

    // Search by title
    if (title) {
      filter.title = { $regex: title, $options: "i" }; // case-insensitive partial match
    }

    // Search by location
    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }

    // Filter by price
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Filter by duration
    if (minDuration || maxDuration) {
      filter.duration = {};
      if (minDuration) filter.duration.$gte = Number(minDuration);
      if (maxDuration) filter.duration.$lte = Number(maxDuration);
    }

    // Filter by available date
    if (date) {
      const searchDate = new Date(date as string);
      filter.availableDates = { $elemMatch: { $eq: searchDate } };
    }

    const tours = await Tour.find(filter).populate("createdBy", "name email role");

    res.json({ success: true, count: tours.length, tours });
  } catch (error) {
    next(error);
  }
};