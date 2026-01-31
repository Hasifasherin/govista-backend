import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import MessageModel from "../models/Message"; // ✅ CHANGED: Renamed import
import User from "../models/User";

// ============================
// Send a message (User/Operator)
// ============================
export const sendMessage = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const { receiverId, message: messageText } = req.body; // ✅ RENAMED: message -> messageText

    if (!receiverId || !messageText) {
      return res.status(400).json({ 
        success: false, 
        message: "receiverId and message are required" 
      });
    }

    // ✅ ADDED: Cannot message yourself
    if (receiverId === req.user!.id) {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot message yourself" 
      });
    }

    // ✅ ADDED: Check if receiver exists and is not blocked
    const receiver = await User.findById(receiverId);
    
    if (!receiver) {
      return res.status(404).json({ 
        success: false, 
        message: "Receiver not found" 
      });
    }

    if (receiver.isBlocked) {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot message blocked user" 
      });
    }

    // ✅ ADDED: Role-based restrictions
    if (req.user!.role === "user" && receiver.role !== "operator") {
      return res.status(400).json({ 
        success: false, 
        message: "Users can only message operators" 
      });
    }

    if (req.user!.role === "operator" && receiver.role !== "user") {
      return res.status(400).json({ 
        success: false, 
        message: "Operators can only message users" 
      });
    }

    // ✅ ADDED: Check if sender is blocked by receiver
    const sender = await User.findById(req.user!.id);
    if (sender!.isBlocked) {
      return res.status(400).json({ 
        success: false, 
        message: "Your account is blocked" 
      });
    }

    const newMessage = await MessageModel.create({ // ✅ CHANGED: Message -> MessageModel
      sender: req.user!.id,
      receiver: receiverId,
      message: messageText, // ✅ Use renamed variable
      read: false,
    });

    // ✅ ADDED: Populate sender info in response
    const populatedMessage = await MessageModel.findById(newMessage._id) // ✅ CHANGED
      .populate("sender", "firstName lastName email role")
      .populate("receiver", "firstName lastName email role");

    res.status(201).json({ 
      success: true, 
      data: populatedMessage // ✅ CHANGED: 'message' -> 'data' to avoid confusion
    });
  } catch (error) {
    next(error);
  }
};

// ============================
// Get conversation between two users
// ============================
export const getConversation = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const { otherUserId } = req.params;
    
    // ✅ FIXED: Convert to string first
    const otherUserIdStr = String(otherUserId);

    if (!otherUserIdStr) {
      return res.status(400).json({ 
        success: false, 
        message: "otherUserId is required" 
      });
    }

    // ✅ FIXED: Validate otherUserId
    if (!mongoose.Types.ObjectId.isValid(otherUserIdStr)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid user ID" 
      });
    }

    const messages = await MessageModel.find({ // ✅ CHANGED: Message -> MessageModel
      $or: [
        { sender: req.user!.id, receiver: otherUserIdStr },
        { sender: otherUserIdStr, receiver: req.user!.id },
      ],
    })
      .populate("sender", "firstName lastName email role")
      .populate("receiver", "firstName lastName email role")
      .sort({ createdAt: 1 });

    // ✅ FIXED: Use string version
    await MessageModel.updateMany( // ✅ CHANGED: Message -> MessageModel
      {
        sender: otherUserIdStr,
        receiver: req.user!.id,
        read: false
      },
      { $set: { read: true } }
    );

    res.json({ 
      success: true, 
      count: messages.length, 
      messages 
    });
  } catch (error) {
    next(error);
  }
};

// ============================
// Admin: Get all messages
// ============================
export const getAllMessages = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    // ✅ ADDED: Admin check
    if (req.user!.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Admin only." 
      });
    }

    const messages = await MessageModel.find() // ✅ CHANGED: Message -> MessageModel
      .populate("sender", "firstName lastName email role")
      .populate("receiver", "firstName lastName email role")
      .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      count: messages.length, 
      messages 
    });
  } catch (error) {
    next(error);
  }
};

// ✅ ADDED: Get list of conversations
export const getConversations = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    // Get distinct users you've conversed with
    const conversations = await MessageModel.aggregate([ // ✅ CHANGED: Message -> MessageModel
      {
        $match: {
          $or: [
            { sender: new mongoose.Types.ObjectId(req.user!.id) },
            { receiver: new mongoose.Types.ObjectId(req.user!.id) }
          ]
        }
      },
      {
        $project: {
          otherUserId: {
            $cond: {
              if: { $eq: ["$sender", new mongoose.Types.ObjectId(req.user!.id)] },
              then: "$receiver",
              else: "$sender"
            }
          },
          lastMessage: "$message",
          lastMessageTime: "$createdAt",
          unreadCount: {
            $cond: [
              { $and: [
                { $eq: ["$receiver", new mongoose.Types.ObjectId(req.user!.id)] },
                { $eq: ["$read", false] }
              ]},
              1,
              0
            ]
          },
          isSender: { $eq: ["$sender", new mongoose.Types.ObjectId(req.user!.id)] }
        }
      },
      {
        $group: {
          _id: "$otherUserId",
          lastMessage: { $last: "$lastMessage" },
          lastMessageTime: { $max: "$lastMessageTime" },
          unreadCount: { $sum: "$unreadCount" },
          lastSenderIsMe: { $last: "$isSender" }
        }
      },
      { $sort: { lastMessageTime: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $project: {
          userId: "$user._id",
          firstName: "$user.firstName",
          lastName: "$user.lastName",
          email: "$user.email",
          role: "$user.role",
          lastMessage: 1,
          lastMessageTime: 1,
          unreadCount: 1,
          lastSenderIsMe: 1
        }
      }
    ]);

    res.json({ 
      success: true, 
      count: conversations.length, 
      conversations 
    });
  } catch (error) {
    next(error);
  }
};

// ✅ ADDED: Mark messages as read
export const markAsRead = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const { otherUserId } = req.params;
    
    // ✅ FIXED: Convert to string first
    const otherUserIdStr = String(otherUserId);

    if (!mongoose.Types.ObjectId.isValid(otherUserIdStr)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid user ID" 
      });
    }

    // Mark all messages from other user as read
    const result = await MessageModel.updateMany( // ✅ CHANGED: Message -> MessageModel
      {
        sender: otherUserIdStr,
        receiver: req.user!.id,
        read: false
      },
      { $set: { read: true } }
    );

    res.json({ 
      success: true, 
      message: `${result.modifiedCount} messages marked as read` 
    });
  } catch (error) {
    next(error);
  }
};

// ✅ ADDED: Get unread message count
export const getUnreadCount = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const unreadCount = await MessageModel.countDocuments({ // ✅ CHANGED: Message -> MessageModel
      receiver: req.user!.id,
      read: false
    });

    res.json({ 
      success: true, 
      unreadCount 
    });
  } catch (error) {
    next(error);
  }
};