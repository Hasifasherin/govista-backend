import express from "express";
import { protect } from "../middlewares/authMiddleware";
import {
  getMyNotifications,
  markAsRead
} from "../controllers/notificationController";

const router = express.Router();

router.use(protect);

router.get("/", getMyNotifications);
router.put("/:id/read", markAsRead);

export default router;
