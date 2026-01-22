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
      password
    } = req.body;

    // ✅ Required field validation (UI aligned)
    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !gender ||
      !dob ||
      !password
    ) {
      throw createError("All fields are required", 400);
    }

    // ✅ Role validation (ONLY user / operator allowed)
    if (role && !["user", "operator"].includes(role)) {
      throw createError("Invalid role", 400);
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
      role: role || "user" // default safe fallback
    });

    const token = generateToken(user._id.toString(), user.role);

    res.status(201).json({
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


// LOGIN

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

    // password is select:false → must explicitly select
    const user = await User.findOne({ email: normalizedEmail }).select("+password");

    if (!user) {
      throw createError("Invalid credentials", 400);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw createError("Invalid credentials", 400);
    }

    const token = generateToken(user._id.toString(), user.role);

    res.status(200).json({
      success: true,
      token,
    });
  } catch (error) {
    next(error);
  }
};
