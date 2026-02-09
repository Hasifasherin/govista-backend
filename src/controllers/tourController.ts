import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Tour from "../models/Tour";
import Booking from "../models/Booking";
import Category from "../models/Category";

const createError = (message: string, statusCode: number) => {
  const err = new Error(message) as any;
  err.statusCode = statusCode;
  return err;
};

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
      category,
    } = req.body;

    // ✅ ADDED VALIDATION
    if (price <= 0) throw createError("Price must be greater than 0", 400);
    if (duration <= 0) throw createError("Duration must be greater than 0", 400);
    if (maxGroupSize <= 0) throw createError("Group size must be greater than 0", 400);

    // ✅ FIX: Parse availableDates from FormData string to array
    let datesArray = [];
    
    if (availableDates) {
      if (typeof availableDates === 'string') {
        try {
          // Try to parse as JSON array first (if sent from frontend as JSON string)
          datesArray = JSON.parse(availableDates);
        } catch (jsonError) {
          // If not JSON, handle as comma-separated string from FormData
          // Remove brackets and quotes if present
          const cleaned = availableDates.replace(/[\[\]"]/g, '');
          // Split by comma and trim whitespace
          datesArray = cleaned.split(',').map(date => date.trim()).filter(date => date.length > 0);
          
          // If still empty or single date, treat as array with one item
          if (datesArray.length === 0) {
            datesArray = [availableDates.trim()];
          }
        }
      } else if (Array.isArray(availableDates)) {
        // Already an array (from raw JSON)
        datesArray = availableDates;
      }
    }

   // ✅ Validate availableDates are today or future (timezone-safe)
const today = new Date();
today.setHours(0, 0, 0, 0);

for (const dateStr of datesArray) {
  let date;
  if (dateStr.includes("T")) {
    date = new Date(dateStr);
  } else {
    date = new Date(dateStr + "T00:00:00");
  }

  date.setHours(0, 0, 0, 0);

  if (date < today) {
    throw createError(`Date ${dateStr} must be today or in the future`, 400);
  }
}


    // ✅ Convert to Date objects (VERY IMPORTANT)
const parsedDates = datesArray.map((dateStr: string) => {
  if (dateStr.includes("T")) {
    return new Date(dateStr);
  }
  return new Date(dateStr + "T00:00:00");
});

const tour = await Tour.create({
  title,
  description,
  price,
  location,
  duration,
  maxGroupSize,
  availableDates: parsedDates,
  image,
  category,
  createdBy: req.user!.id,
});


    res.status(201).json({ success: true, tour });
  } catch (error) {
    next(error);
  }
};
// GET ALL TOURS (Pagination)
export const getTours = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter: any = { isActive: true };

    // Operator/admin route
    if (req.user) {
      if (req.user.role === "operator") {
        filter.createdBy = req.user.id; // show all their tours
      } else if (req.user.role === "admin") {
        // admin sees all tours
      }
    } else {
      // Public: only approved tours
      filter.status = "approved";
    }

    const tours = await Tour.find(filter)
      .populate("createdBy", "firstName lastName email role")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Tour.countDocuments(filter);

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


// GET SINGLE TOUR
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
      "firstName lastName email role" // ✅ FIXED populate field
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

    // Explicit field updates only
    const allowedFields = [
      "title",
      "description",
      "price",
      "location",
      "duration",
      "maxGroupSize",
      "availableDates",
      "image",
      "category",
    ];

    // ✅ ADDED VALIDATION for updated fields
    if (req.body.price !== undefined && req.body.price <= 0) {
      throw createError("Price must be greater than 0", 400);
    }
    if (req.body.duration !== undefined && req.body.duration <= 0) {
      throw createError("Duration must be greater than 0", 400);
    }
    if (req.body.maxGroupSize !== undefined && req.body.maxGroupSize <= 0) {
      throw createError("Group size must be greater than 0", 400);
    }

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

// CHECK AVAILABILITY
export const checkAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date } = req.query;
    const tour = await Tour.findById(req.params.id);

    if (!tour) {
      return res.status(404).json({ success: false, message: "Tour not found" });
    }

    if (!date) {
      return res.status(400).json({ success: false, message: "date is required" });
    }

    // ✅ ADDED: Check if date is in availableDates
    const bookingDate = new Date(date as string);
    const isDateAvailable = tour.availableDates.some(
      (availableDate) => availableDate.toDateString() === bookingDate.toDateString()
    );

    if (!isDateAvailable) {
      return res.json({
        success: true,
        available: false,
        message: "Tour not available on this date",
        maxGroupSize: tour.maxGroupSize,
        bookedSlots: 0,
        availableSlots: 0
      });
    }

    const bookings = await Booking.find({
      tourId: tour._id,
      bookingDate: bookingDate,
      status: { $in: ["pending", "accepted"] }
    });

    const bookedSlots = bookings.reduce(
      (sum, booking) => sum + booking.participants,
      0
    );

    const availableSlots = Math.max(0, tour.maxGroupSize - bookedSlots);

    res.json({
      success: true,
      available: availableSlots > 0,
      maxGroupSize: tour.maxGroupSize,
      bookedSlots,
      availableSlots
    });
  } catch (error) {
    next(error);
  }
};

// SEARCH & FILTER - ✅ FIXED: Only show active, approved tours
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
      category,
      sortBy, // ✅ ADDED: sorting option
      sortOrder = "asc" // ✅ ADDED: asc or desc
    } = req.query;

    // ✅ ADDED BASE FILTER: Only active, approved tours
    const filter: any = { 
      isActive: true, 
      status: "approved" 
    };

    if (title) filter.title = { $regex: title, $options: "i" };
    if (location) filter.location = { $regex: location, $options: "i" };
    if (minPrice || maxPrice) filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
    if (minDuration || maxDuration) filter.duration = {};
    if (minDuration) filter.duration.$gte = Number(minDuration);
    if (maxDuration) filter.duration.$lte = Number(maxDuration);
    if (category) filter.category = category;

    if (date) {
      const normalizedDate = new Date(date as string);
      // ✅ ADDED: Check if date is in future
      const now = new Date();
      if (normalizedDate < now) {
        return res.json({ success: true, count: 0, tours: [] });
      }
      filter.availableDates = { $elemMatch: { $eq: normalizedDate } };
    }

    // ✅ ADDED: Sorting logic
    let sortOptions: any = { createdAt: -1 };
    if (sortBy === "price") {
      sortOptions = { price: sortOrder === "desc" ? -1 : 1 };
    } else if (sortBy === "duration") {
      sortOptions = { duration: sortOrder === "desc" ? -1 : 1 };
    } else if (sortBy === "rating") {
      sortOptions = { averageRating: sortOrder === "desc" ? -1 : 1 };
    }

    const tours = await Tour.find(filter)
      .populate("createdBy", "firstName lastName email role") // ✅ FIXED populate field
      .sort(sortOptions);

    res.json({ success: true, count: tours.length, tours });
  } catch (error) {
    next(error);
  }
};

// ✅ ADDED: Featured tours endpoint (for homepage)
export const getFeaturedTours = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tours = await Tour.find({ 
      isFeatured: true, 
      isActive: true, 
      status: "approved" 
    })
      .populate("createdBy", "firstName lastName email")
      .limit(6)
      .sort({ createdAt: -1 });

    res.json({ success: true, count: tours.length, tours });
  } catch (error) {
    next(error);
  }
};

// ✅ ADDED: Category list endpoint
export const getTourCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select("_id name")
      .sort({ name: 1 });

    res.json({
      success: true,
      categories,
    });
  } catch (error) {
    next(error);
  }
};
