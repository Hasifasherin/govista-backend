import express from "express";
import { protect, roleAccess } from "../middlewares/authMiddleware";
import { 
  sendMessage, 
  getConversation, 
  getConversations,
  markAsRead,
  getUnreadCount,
  getAllMessages
} from "../controllers/messageController";

const router = express.Router();

router.use(protect);

// Get list of conversations
router.get("/", getConversations);

// Get unread message count
router.get("/unread", getUnreadCount);

// Send message
router.post("/", sendMessage);

// Get conversation with another user
router.get("/conversation/:otherUserId", getConversation); // ✅ CHANGED: Avoids conflict

// Mark conversation as read
router.put("/:otherUserId/read", markAsRead);

// Admin: Get all messages (admin only)
router.get("/admin/all", roleAccess("admin"), getAllMessages);

export default router;