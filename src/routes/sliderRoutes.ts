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

// Public – homepage sliders
router.get("/", getSliders);

// Admin – create slider
router.post(
  "/",
  protect,
  roleAccess("admin"),
  upload.single("image"),
  validateImage,
  uploadSingleImage,
  createSlider
);

// Admin – update slider 
router.put(
  "/:id",
  protect,
  roleAccess("admin"),
  validateImage,
  uploadSingleImage,   
  updateImage,      
  updateSlider
);

// Admin – delete slider
router.delete(
  "/:id",
  protect,
  roleAccess("admin"),
  deleteSlider
);

export default router;
