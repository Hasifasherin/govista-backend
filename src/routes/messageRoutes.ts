import express from "express";
import { protect, roleAccess } from "../middlewares/authMiddleware";
import { sendMessage, getConversation } from "../controllers/messageController";

const router = express.Router();

router.use(protect);

// Send message
router.post("/", sendMessage);

// Get conversation with another user/operator
router.get("/:otherUserId", getConversation);

export default router;
