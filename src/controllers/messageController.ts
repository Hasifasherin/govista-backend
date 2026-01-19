import { Request, Response, NextFunction } from "express";
import Message from "../models/Message";

// User or Operator sends message
export const sendMessage = async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const { receiverId, message } = req.body;
    if (!receiverId || !message) return res.status(400).json({ success: false, message: "receiverId and message are required" });

    const msg = await Message.create({
      sender: req.user!.id,
      receiver: receiverId,
      message
    });

    res.status(201).json({ success: true, message: msg });
  } catch (error) {
    next(error);
  }
};

// Fetch conversation between two users
export const getConversation = async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const { otherUserId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: req.user!.id, receiver: otherUserId },
        { sender: otherUserId, receiver: req.user!.id }
      ]
    }).sort({ createdAt: 1 });

    res.json({ success: true, count: messages.length, messages });
  } catch (error) {
    next(error);
  }
};
// Admin: Get all messages between users and operators
export const getAllMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messages = await Message.find()
      .populate("sender", "name email role")
      .populate("receiver", "name email role")
      .sort({ createdAt: 1 });

    res.json({ success: true, count: messages.length, messages });
  } catch (error) {
    next(error);
  }
};
