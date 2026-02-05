import { Request, Response } from "express";
import mongoose from "mongoose";
import Message from "../models/Message";
import User from "../models/User";

// =====================================
// Admin → Get All Operators (Chat List)
// =====================================
export const getChatOperators = async (
  req: Request,
  res: Response
) => {
  try {
    const operators = await User.find({
      role: "operator",
    }).select("firstName lastName email");

    res.json({
      success: true,
      operators,
    });
  } catch (error) {
    console.error("Get Operators Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch operators",
    });
  }
};

// =====================================
// Operator → User Conversations
// =====================================
export const getOperatorConversations = async (
  req: Request,
  res: Response
) => {
  const operatorId = String(req.params.operatorId);

  // ✅ Validate ID
  if (!mongoose.Types.ObjectId.isValid(operatorId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid operatorId",
    });
  }

  const operatorObjectId =
    new mongoose.Types.ObjectId(operatorId);

  try {
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: operatorObjectId },
            { receiver: operatorObjectId },
          ],
        },
      },
      {
        $project: {
          userId: {
            $cond: {
              if: {
                $eq: ["$sender", operatorObjectId],
              },
              then: "$receiver",
              else: "$sender",
            },
          },
          lastMessage: "$message",
          createdAt: 1,
        },
      },
      {
        $sort: { createdAt: 1 }, // ensure last works correctly
      },
      {
        $group: {
          _id: "$userId",
          lastMessage: { $last: "$lastMessage" },
          lastMessageTime: { $max: "$createdAt" },
        },
      },
      {
        $sort: { lastMessageTime: -1 },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          userId: "$user._id",
          firstName: "$user.firstName",
          lastName: "$user.lastName",
          email: "$user.email",
          lastMessage: 1,
          lastMessageTime: 1,
        },
      },
    ]);

    res.json({
      success: true,
      conversations,
    });
  } catch (error) {
    console.error("Conversation Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch conversations",
    });
  }
};

// =====================================
// Operator ↔ User Messages
// =====================================
export const getOperatorUserChat = async (
  req: Request,
  res: Response
) => {
  const operatorId = String(req.params.operatorId);
  const userId = String(req.params.userId);

  // ✅ Validate IDs
  if (
    !mongoose.Types.ObjectId.isValid(operatorId) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid IDs",
    });
  }

  try {
    const messages = await Message.find({
      $or: [
        { sender: operatorId, receiver: userId },
        { sender: userId, receiver: operatorId },
      ],
    })
      .populate("sender", "firstName lastName role")
      .populate("receiver", "firstName lastName role")
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("Messages Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
    });
  }
};
