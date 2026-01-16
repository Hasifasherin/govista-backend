import { Request, Response, NextFunction } from "express";
import User from "../models/User";

//  Get All Users
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await User.find({ role: "user" }).select("-password");
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
};

//  Block / Unblock User
export const toggleUserBlock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== "user") {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.isBlocked = !user.isBlocked; // toggle
    await user.save();

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

//  Get All Operators
export const getAllOperators = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const operators = await User.find({ role: "operator" }).select("-password");
    res.json({ success: true, count: operators.length, operators });
  } catch (error) {
    next(error);
  }
};


//  Approve / Suspend Operator
export const updateOperatorStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const operator = await User.findById(req.params.id);
    if (!operator || operator.role !== "operator") {
      return res.status(404).json({ success: false, message: "Operator not found" });
    }

    const { isApproved } = req.body; 
    if (typeof isApproved !== "boolean") {
      return res.status(400).json({ success: false, message: "isApproved must be boolean" });
    }

    operator.isApproved = isApproved;
    await operator.save();

    res.json({ success: true, operator });
  } catch (error) {
    next(error);
  }
};
