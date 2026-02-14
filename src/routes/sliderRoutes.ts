import { Router } from "express";
import multer from "multer";
import {
  getSliders,
  createSlider,
  updateSlider,
  deleteSlider,
} from "../controllers/sliderController";
import { protect, roleAccess } from "../middlewares/authMiddleware";

const router = Router();

/* ================= MULTER CONFIG ================= */
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/* ================= MULTER ERROR HANDLER ================= */
const handleMulterUpload = (req: any, res: any, next: any) => {
  const singleUpload = upload.single("image");

  singleUpload(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    if (err) {
      return res.status(400).json({
        success: false,
        message: "File upload failed",
      });
    }

    next();
  });
};

/* ================= ROUTES ================= */

// Public – get all sliders
router.get("/", getSliders);

// Admin – create slider
router.post(
  "/",
  protect,             
  roleAccess("admin"), 
  handleMulterUpload,
  createSlider
);

// Admin – update slider
router.put(
  "/:id",
  protect,
  roleAccess("admin"),
  handleMulterUpload,
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
