import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";
import crypto from "crypto";

// JWT payload type
interface JwtPayload {
  id: string;
  role: "user" | "operator" | "admin";
}

// ---------------------- PROTECT ROUTE ----------------------
export const protect = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token"
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    // ✅ BYPASS FOR ADMIN TOKEN
    if (decoded.role === "admin") {
      req.user = { id: "admin", role: "admin" };
      return next();
    }

    // Fetch full user from DB
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    // ❌ BLOCKED USER CHECK
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked by admin"
      });
    }

    // ❌ OPERATOR NOT APPROVED CHECK
    if (user.role === "operator" && !user.isApproved) {
      return res.status(403).json({
        success: false,
        message: "Operator account is not approved yet"
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, token failed"
    });
  }
};

// ---------------------- ROLE ACCESS ----------------------
export const roleAccess = (...allowedRoles: ("user" | "operator" | "admin")[]) => {
  return (
    req: Request & { user?: any },
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized"
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    next();
  };
};

// ---------------------- PREDEFINED ROLE COMBINATIONS ----------------------
export const adminOrOperator = roleAccess("admin", "operator");
export const adminOrUser = roleAccess("admin", "user");
export const operatorOrUser = roleAccess("operator", "user");

// ---------------------- FORGOT PASSWORD MIDDLEWARE ----------------------
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }) as IUser;

    if (!user) {
      // Prevent email enumeration
      return res.status(200).json({
        success: true,
        message: "If an account exists, a reset link has been sent."
      });
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Construct reset URL
    const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    // TODO: Send reset URL via email (e.g., Nodemailer)
    console.log("Password reset URL:", resetURL);

    return res.status(200).json({
      success: true,
      message: "If an account exists, a reset link has been sent."
    });
  } catch (error) {
    next(error);
  }
};
