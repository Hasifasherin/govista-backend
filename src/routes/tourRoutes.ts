import express from "express";
import { protect, roleAccess } from "../middlewares/authMiddleware";
import { upload } from "../config/multer";
import { uploadSingleImage } from "../middlewares/uploadMiddleware";
import { 
  createTour, 
  getTours, 
  getTour, 
  updateTour, 
  deleteTour, 
  searchTours 
} from "../controllers/tourController";

const router = express.Router();

// Public route for search & filter — MUST be before /:id
router.get("/search", searchTours);

// GET all tours
router.get("/", getTours);

// GET single tour by ID
router.get("/:id", getTour);

// PROTECTED routes (operator only)
router.post("/", protect, roleAccess("operator"), upload.single("image"), uploadSingleImage, createTour);
router.put("/:id", protect, roleAccess("operator"), upload.single("image"), uploadSingleImage, updateTour);
router.delete("/:id", protect, roleAccess("operator"), deleteTour);

export default router;
