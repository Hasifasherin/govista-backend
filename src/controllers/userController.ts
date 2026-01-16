import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import User from "../models/User";
import Booking from "../models/Booking";

// =======================
// 1️⃣ Update Profile
// =======================
export const updateProfile = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { name, email, password } = req.body;

    if (email) {
      const normalizedEmail = email.toLowerCase();

      // Prevent duplicate email
      const emailExists = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: user._id },
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }

      user.email = normalizedEmail;
    }

    if (name) user.name = name;

    if (password && password.trim() !== "") {
      user.password = password; // hashed by pre-save hook
    }

    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// =======================
// 2️⃣ Add to Wishlist
// =======================
export const addToWishlist = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const { tourId } = req.body;
    if (!tourId || !mongoose.Types.ObjectId.isValid(tourId)) {
      return res.status(400).json({ success: false, message: "Invalid tourId" });
    }

    const user = await User.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const alreadyExists = user.wishlist.some(
      (id: mongoose.Types.ObjectId) => id.toString() === tourId
    );

    if (alreadyExists) {
      return res.status(400).json({
        success: false,
        message: "Tour already in wishlist",
      });
    }

    user.wishlist.push(new mongoose.Types.ObjectId(tourId));
    await user.save();

    res.json({ success: true, wishlist: user.wishlist });
  } catch (error) {
    next(error);
  }
};

// =======================
// 3️⃣ Remove from Wishlist
// =======================
export const removeFromWishlist = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const tourId  = String(req.params.tourId);

    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return res.status(400).json({ success: false, message: "Invalid tourId" });
    }

    const user = await User.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.wishlist = user.wishlist.filter(
      (id: mongoose.Types.ObjectId) => id.toString() !== tourId
    );

    await user.save();
    res.json({ success: true, wishlist: user.wishlist });
  } catch (error) {
    next(error);
  }
};

// =======================
// 4️⃣ Get Wishlist
// =======================
export const getWishlist = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await User.findById(req.user!.id).populate("wishlist");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, wishlist: user.wishlist });
  } catch (error) {
    next(error);
  }
};

// =======================
// 5️⃣ Booking History
// =======================
export const getBookingHistory = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const bookings = await Booking.find({ userId: req.user!.id })
      .populate("tourId", "title location price")
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
