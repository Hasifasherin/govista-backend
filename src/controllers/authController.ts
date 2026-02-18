import { Request, Response, NextFunction } from "express";
import User, { IUser } from "../models/User";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/jwt";
import crypto from "crypto";

// Helper to create consistent errors
const createError = (message: string, statusCode: number) => {
  const err = new Error(message) as any;
  err.statusCode = statusCode;
  return err;
};

// ================= REGISTER =================
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      gender,
      dob,
      role,
      password,
      confirmPassword,
    } = req.body;

    if (!firstName || !lastName || !email || !phone || !gender || !dob || !password || !confirmPassword) {
      throw createError("All fields are required", 400);
    }

    if (password !== confirmPassword) {
      throw createError("Passwords do not match", 400);
    }

    const allowedRoles = ["user", "operator"];
    const selectedRole = role || "user";
    if (!allowedRoles.includes(selectedRole)) {
      throw createError("Invalid role selected", 400);
    }

    const normalizedEmail = email.toLowerCase();
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      throw createError("User already exists", 400);
    }

    const user = await User.create({
      firstName,
      lastName,
      email: normalizedEmail,
      phone,
      gender,
      dob,
      password,
      role: selectedRole,
    });

    const token = generateToken(user._id.toString(), user.role);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ================= LOGIN =================
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw createError("All fields are required", 400);

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select("+password");

    // Do not reveal whether email exists
    if (!user) throw createError("Invalid email or password", 401);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw createError("Invalid email or password", 401);

    if (user.isBlocked) throw createError("Your account has been blocked", 403);
    if (user.role === "operator" && !user.isApproved) {
      throw createError("Operator account is not approved yet", 403);
    }

    const token = generateToken(user._id.toString(), user.role);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ================= FORGOT PASSWORD =================
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) throw createError("Email is required", 400);

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Now we return an error so frontend can show it
      return res.status(404).json({
        success: false,
        message: "Email not found. Please enter a registered email.",
      });
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetURL = `${process.env.CLIENT_URL}/auth/reset-password/${resetToken}`;

    // TODO: send email
    console.log("Reset URL:", resetURL);

    res.status(200).json({
      success: true,
      message: "Reset link has been sent to your email.",
    });
  } catch (error) {
    next(error);
  }
};

// ================= RESET PASSWORD =================
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password, confirmPassword } = req.body;
    if (!password || !confirmPassword) throw createError("All fields are required", 400);
    if (password !== confirmPassword) throw createError("Passwords do not match", 400);

    // Ensure token is a string
    const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }) as IUser;

    if (!user) throw createError("Token is invalid or has expired", 400);

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    next(error);
  }
};
