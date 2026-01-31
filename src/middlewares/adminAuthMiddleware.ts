import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";

interface JwtPayload {
  id: string;
  role: "admin";
}

export const protectAdmin = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Not authorized"
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    if (decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const admin = await User.findById(decoded.id);

    if (!admin || admin.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: "Admin not found"
      });
    }

    if (admin.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Admin account is blocked"
      });
    }

    req.user = admin;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token invalid"
    });
  }
};
