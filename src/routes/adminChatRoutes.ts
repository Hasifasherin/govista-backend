import express from "express";
import { protectAdmin } from "../middlewares/adminAuthMiddleware";
import {
  getChatOperators,
  getOperatorConversations,
  getOperatorUserChat,
} from "../controllers/adminChatController";

const router = express.Router();

router.use(protectAdmin);

// 🔥 MUST be first
router.get("/operators", getChatOperators);

// Operator → users
router.get("/:operatorId", getOperatorConversations);

// Chat messages
router.get("/:operatorId/:userId", getOperatorUserChat);

export default router;
