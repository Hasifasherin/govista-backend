import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User";
import Booking from "../models/Booking";

// =======================
// 1️⃣ Get Current User Profile
// =======================
export const getProfile = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await User.findById(req.user!.id)
      .select("-password -__v"); // Exclude sensitive fields

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// =======================
// 2️⃣ Update Profile
// =======================
export const updateProfile = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    const { firstName, lastName, email, phone, dob, password } = req.body;

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

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (dob) user.dob = new Date(dob);

    if (password && password.trim() !== "") {
      // Password validation
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters"
        });
      }
      user.password = password; // hashed by pre-save hook
    }

    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        dob: user.dob,
        role: user.role,
        wishlist: user.wishlist
      },
    });
  } catch (error) {
    next(error);
  }
};

// =======================
// 3️⃣ Change Password
// =======================
export const changePassword = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required"
      });
    }

    const user = await User.findById(req.user!.id).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    // Validate new password
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters"
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password updated successfully"
    });
  } catch (error) {
    next(error);
  }
};

// =======================
// 4️⃣ Add to Wishlist
// =======================
export const addToWishlist = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const { tourId } = req.body;
    if (!tourId || !mongoose.Types.ObjectId.isValid(tourId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid tourId" 
      });
    }

    const user = await User.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
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

    res.json({ 
      success: true, 
      message: "Tour added to wishlist",
      wishlist: user.wishlist 
    });
  } catch (error) {
    next(error);
  }
};

// =======================
// 5️⃣ Remove from Wishlist
// =======================
export const removeFromWishlist = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const tourId = String(req.params.tourId);

    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid tourId" 
      });
    }

    const user = await User.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    user.wishlist = user.wishlist.filter(
      (id: mongoose.Types.ObjectId) => id.toString() !== tourId
    );

    await user.save();
    res.json({ 
      success: true, 
      message: "Tour removed from wishlist",
      wishlist: user.wishlist 
    });
  } catch (error) {
    next(error);
  }
};

// =======================
// 6️⃣ Get Wishlist
// =======================
export const getWishlist = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await User.findById(req.user!.id).populate({
      path: "wishlist",
      select: "title location price image category duration averageRating",
      match: { isActive: true, status: "approved" }
    });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Filter out null values
    const filteredWishlist = user.wishlist.filter(tour => tour !== null);

    res.json({ 
      success: true, 
      count: filteredWishlist.length,
      wishlist: filteredWishlist 
    });
  } catch (error) {
    next(error);
  }
};

// =======================
// 7️⃣ Booking History
// =======================
export const getBookingHistory = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const bookings = await Booking.find({ userId: req.user!.id })
      .populate("tourId", "title location price image")
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