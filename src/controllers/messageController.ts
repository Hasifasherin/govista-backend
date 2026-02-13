import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import MessageModel from "../models/Message";
import User from "../models/User";
import Booking from "../models/Booking";

// ============================
// Send a message (User/Operator)
// ============================
export const sendMessage = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      receiverId,
      message: messageText,
      bookingId,
      tourId,
      messageType
    } = req.body;

    if (!receiverId || !messageText) {
      return res.status(400).json({
        success: false,
        message: "receiverId and message are required",
      });
    }

    if (receiverId === req.user!.id) {
      return res.status(400).json({
        success: false,
        message: "Cannot message yourself",
      });
    }

    // Validate receiver
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found",
      });
    }

    if (receiver.isBlocked) {
      return res.status(400).json({
        success: false,
        message: "Cannot message blocked user",
      });
    }

    // Role-based restrictions
    if (req.user!.role === "user" && receiver.role !== "operator") {
      return res.status(400).json({
        success: false,
        message: "Users can only message operators",
      });
    }

    if (req.user!.role === "operator" && receiver.role !== "user") {
      return res.status(400).json({
        success: false,
        message: "Operators can only message users",
      });
    }

    // Sender blocked check
    const sender = await User.findById(req.user!.id);
    if (sender!.isBlocked) {
      return res.status(400).json({
        success: false,
        message: "Your account is blocked",
      });
    }

    // 🔑 Booking validation (ONLY if provided)
    if (bookingId) {
      if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid bookingId",
        });
      }

      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found",
        });
      }

      // Operator ownership check
      if (
        req.user!.role === "operator" &&
        booking.operatorId.toString() !== req.user!.id
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied for this booking",
        });
      }
    }

    // ✅ Create message (new fields added safely)
    const newMessage = await MessageModel.create({
      sender: req.user!.id,
      receiver: receiverId,
      message: messageText,
      read: false,
      bookingId: bookingId || null,
      tourId: tourId || null,
      messageType: messageType || "text",
    });

    const populatedMessage = await MessageModel.findById(newMessage._id)
      .populate("sender", "firstName lastName email role")
      .populate("receiver", "firstName lastName email role")
      .populate("bookingId", "status travelDate")
      .populate("tourId", "title location");

    res.status(201).json({
      success: true,
      data: populatedMessage,
    });
  } catch (error) {
    next(error);
  }
};

// ============================
// Get conversation between two users (optional bookingId)
// ============================
export const getConversation = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const { otherUserId, bookingId } = req.params;


    const otherUserIdStr = String(otherUserId);

    if (otherUserId && !mongoose.Types.ObjectId.isValid(String(otherUserId))) {
  return res.status(400).json({
    success: false,
    message: "Invalid user ID",
  });
}

if (bookingId && !mongoose.Types.ObjectId.isValid(String(bookingId))) {
  return res.status(400).json({
    success: false,
    message: "Invalid bookingId",
  });
}


    // 🔑 Base conversation filter
    let conversationFilter: any = {};

// Booking-based chat (PRIMARY)
if (bookingId) {
  conversationFilter = {
    bookingId,
    $or: [
      { sender: req.user!.id },
      { receiver: req.user!.id }
    ],
  };
} 
// User-based chat (SECONDARY / LEGACY)
else if (otherUserId) {
  conversationFilter = {
    $or: [
      { sender: req.user!.id, receiver: otherUserId },
      { sender: otherUserId, receiver: req.user!.id },
    ],
  };
}


    // Fetch messages
    const messages = await MessageModel.find(conversationFilter)
      .populate("sender", "firstName lastName email role")
      .populate("receiver", "firstName lastName email role")
      .populate("bookingId", "status travelDate")
      .populate("tourId", "title location")
      .sort({ createdAt: 1 });

    // ✅ Mark unread messages as read
    await MessageModel.updateMany(
  {
    receiver: req.user!.id,
    read: false,
    ...(bookingId ? { bookingId } : {}),
    ...(otherUserId ? { sender: otherUserId } : {}),
  },
  { $set: { read: true } }
);


    res.json({
      success: true,
      count: messages.length,
      messages,
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

// ✅ Updated: Mark messages as read safely (TypeScript-safe)
export const markAsRead = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    let { otherUserId } = req.params;

    // If otherUserId is an array, take the first element
    if (Array.isArray(otherUserId)) {
      otherUserId = otherUserId[0];
    }

    if (!otherUserId || !mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const otherUserObjectId = new mongoose.Types.ObjectId(otherUserId);

    // Mark all messages from the other user as read
    const result = await MessageModel.updateMany(
      {
        sender: otherUserObjectId,
        receiver: new mongoose.Types.ObjectId(req.user!.id),
        read: false,
      },
      { $set: { read: true } }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} messages marked as read`,
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

//edit message 
export const editMessage = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message text is required",
      });
    }

    const msg = await MessageModel.findById(id);

    if (!msg) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Permission check
    if (msg.sender.toString() !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: "You can edit only your messages",
      });
    }

    // Cannot edit deleted message
    if (msg.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Deleted message cannot be edited",
      });
    }

    msg.message = message;
    await msg.save();

    res.json({
      success: true,
      data: msg,
    });
  } catch (error) {
    next(error);
  }
};

//delete message 
export const deleteMessage = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const msg = await MessageModel.findById(id);

    if (!msg) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Permission check
    if (msg.sender.toString() !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: "You can delete only your messages",
      });
    }

    // Already deleted
    if (msg.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Message already deleted",
      });
    }

    msg.isDeleted = true;
    msg.deletedAt = new Date();
    msg.message = "This message was deleted";

    await msg.save();

    res.json({
      success: true,
      message: "Message deleted successfully",
      data: msg,
    });
  } catch (error) {
    next(error);
  }
};

