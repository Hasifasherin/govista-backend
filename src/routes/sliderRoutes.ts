import { Router } from "express";
import multer from "multer";
import {
  getSliders,
  createSlider,
  updateSlider,
  deleteSlider,
} from "../controllers/sliderController";
import { protect, roleAccess } from "../middlewares/authMiddleware";
import {
  validateImage,
  uploadSingleImage,
  updateImage,
} from "../middlewares/uploadMiddleware";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Public
 */
router.get("/", getSliders);

/**
 * Admin – create slider
 */
router.post(
  "/",
  protect,                 // ✅ sets req.user
  roleAccess("admin"),     // ✅ checks admin
  upload.single("image"),
  validateImage,
  uploadSingleImage,
  createSlider
);

/**
 * Admin – update slider
 */
router.put(
  "/:id",
  protect,
  roleAccess("admin"),
  upload.single("image"),
  validateImage,
  updateImage,
  updateSlider
);

/**
 * Admin – delete slider
 */
router.delete(
  "/:id",
  protect,
  roleAccess("admin"),
  deleteSlider
);

export default router;
