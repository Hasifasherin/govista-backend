import express from "express";
import { protect, roleAccess } from "../middlewares/authMiddleware";
import { 
  sendMessage, 
  getConversation, 
  getConversations,
  markAsRead,
  getUnreadCount,
  editMessage,
  deleteMessage,
  getAllMessages
} from "../controllers/messageController";

const router = express.Router();

router.use(protect);




// ================= Conversations =================
// Mark conversation as read
router.put("/:otherUserId/read", markAsRead);

// Get list of conversations
router.get("/", getConversations);

// Get unread message count
router.get("/unread", getUnreadCount);

// Send message (supports bookingId, tourId)
router.post("/", sendMessage);

// Get conversation with another user
router.get("/booking/:bookingId", getConversation);
router.get("/conversation/:otherUserId", getConversation);

// Edit message
router.put("/:id", editMessage);

// Delete message (soft)
router.delete("/:id", deleteMessage);

// ================= Admin =================

// Admin: Get all messages (admin only)
router.get("/admin/all", roleAccess("admin"), getAllMessages);

export default router;
