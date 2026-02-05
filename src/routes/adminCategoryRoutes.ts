import express from "express";
import { protectAdmin } from "../middlewares/adminAuthMiddleware";
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from "../controllers/adminCategoryController";
import { validateCategory } from "../middlewares/categoryValidator";

const router = express.Router();
router.use(protectAdmin);

router.get("/", getAllCategories);
router.post("/", validateCategory, createCategory);
router.patch("/:id", validateCategory, updateCategory);
router.delete("/:id", deleteCategory);

export default router;
