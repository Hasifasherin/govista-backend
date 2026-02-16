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

// Get list of conversations
router.get("/", getConversations);

// Get unread message count
router.get("/unread", getUnreadCount);

// Admin route FIRST before dynamic
router.get("/admin/all", roleAccess("admin"), getAllMessages);

// Booking specific
router.get("/booking/:bookingId", getConversation);

// Conversation with user
router.get("/conversation/:otherUserId", getConversation);

// Mark conversation as read
router.put("/conversation/:otherUserId/read", markAsRead);

// Send message
router.post("/", sendMessage);

// Edit message
router.put("/:id", editMessage);

// Delete message
router.delete("/:id", deleteMessage);


// ================= Admin =================

// Admin: Get all messages (admin only)
router.get("/admin/all", roleAccess("admin"), getAllMessages);

export default router;
