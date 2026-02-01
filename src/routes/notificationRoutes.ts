import express from "express";
import { protect } from "../middlewares/authMiddleware";
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  getLatestNotifications
} from "../controllers/notificationController";

const router = express.Router();

router.use(protect);

router.get("/", getMyNotifications);
router.get("/unread-count", getUnreadCount);
router.put("/:id/read", markAsRead);
router.put("/mark-all-read", markAllAsRead);
router.delete("/:id", deleteNotification);
router.get("/latest", getLatestNotifications);

export default router;