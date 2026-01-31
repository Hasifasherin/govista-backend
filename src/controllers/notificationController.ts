import { Request, Response, NextFunction } from "express";
import Notification from "../models/Notification";

// GET MY NOTIFICATIONS
export const getMyNotifications = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const notifications = await Notification.find({ user: req.user!.id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};

// MARK AS READ
export const markAsRead = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user!.id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({ success: true, notification });
  } catch (error) {
    next(error);
  }
};
