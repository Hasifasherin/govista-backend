import { Request, Response, NextFunction } from "express";
import User from "../models/User";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/jwt";

const createError = (message: string, statusCode: number) => {
  const err = new Error(message) as any;
  err.statusCode = statusCode;
  return err;
};

// ---------------- REGISTER ----------------
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      throw createError("All fields are required", 400);
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      throw createError("User already exists", 400);
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || "user"
    });

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// ---------------- LOGIN ----------------
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

    const user = await User.findOne({ email }).select("+password");
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
      token
    });
  } catch (error) {
    next(error);
  }
};
