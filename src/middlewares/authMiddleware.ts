import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";

interface JwtPayload {
  id: string;
  role: "user" | "operator" | "admin";
}

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

    // Fetch full user from DB
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    // ❌ BLOCKED USER CHECK (VERY IMPORTANT)
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

// ✅ UPDATED: ROLE-BASED ACCESS (Now accepts multiple roles)
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

// ✅ ADDED: Optional - Create specific middleware combinations
export const adminOrOperator = roleAccess("admin", "operator");
export const adminOrUser = roleAccess("admin", "user");
export const operatorOrUser = roleAccess("operator", "user");