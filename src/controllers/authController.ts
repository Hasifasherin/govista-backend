import { Request, Response, NextFunction } from "express";
import User from "../models/User";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/jwt";

const createError = (message: string, statusCode: number) => {
  const err = new Error(message) as any;
  err.statusCode = statusCode;
  return err;
};

// ================= REGISTER =================
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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

    // ✅ Required field validation
    if (!firstName || !lastName || !email || !phone || !gender || !dob || !password || !confirmPassword) {
      throw createError("All fields are required", 400);
    }

    // ✅ Password confirmation validation
    if (password !== confirmPassword) {
      throw createError("Passwords do not match", 400);
    }

    // ✅ Role validation (ONLY user / operator allowed)
    const allowedRoles = ["user", "operator"];
    const selectedRole = role || "user"; // default to user if none selected

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
      role: selectedRole // <- use selected role
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
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};


// ================= LOGIN =================
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw createError("All fields are required", 400);
    }

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select("+password");

    if (!user) {
      throw createError("user not found ", 400);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw createError("Invalid email or password", 401);
    }

    if (user.isBlocked) {
      throw createError("Your account has been blocked", 403);
    }

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
        role: user.role
      }
    });

  } catch (error) {
    next(error);
  }
};
