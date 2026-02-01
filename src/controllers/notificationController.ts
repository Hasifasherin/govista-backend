import { Request, Response, NextFunction } from "express";
import Notification from "../models/Notification";

// CREATE NOTIFICATION (Utility function)
export const createNotification = async (data: {
  user: string;
  title: string;
  message: string;
  type?: "booking" | "payment" | "system";
  metadata?: any;
}) => {
  try {
    const notification = await Notification.create({
      user: data.user,
      title: data.title,
      message: data.message,
      type: data.type || "system",
      metadata: data.metadata || {},
      isRead: false,
    });
    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
};

// GET MY NOTIFICATIONS (with pagination)
export const getMyNotifications = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ user: req.user!.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ user: req.user!.id }),
      Notification.countDocuments({ user: req.user!.id, isRead: false }),
    ]);

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      unreadCount,
      page,
      pages: Math.ceil(total / limit),
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

// MARK ALL AS READ
export const markAllAsRead = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user!.id, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE NOTIFICATION
export const deleteNotification = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user!.id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    next(error);
  }
};

// GET LATEST NOTIFICATIONS (for dropdown)
export const getLatestNotifications = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const notifications = await Notification.find({
      user: req.user!.id,
    })
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};

// GET UNREAD COUNT
export const getUnreadCount = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const unreadCount = await Notification.countDocuments({
      user: req.user!.id,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};