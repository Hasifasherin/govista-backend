import { Request, Response, NextFunction } from "express";
import Category from "../models/Category";
import Tour from "../models/Tour";

// GET ALL CATEGORIES (ONLY ACTIVE)
export const getAllCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ name: 1 });

    res.json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    next(error);
  }
};

// CREATE CATEGORY
export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name } = req.body;

    // Check duplicate (case-insensitive)
    const exists = await Category.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    const category = await Category.create({ name });

    res.status(201).json({
      success: true,
      category,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE CATEGORY
export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, isActive } = req.body;

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Prevent duplicate name (case-insensitive)
    if (name && name.toLowerCase() !== category.name.toLowerCase()) {
      const exists = await Category.findOne({
        _id: { $ne: category._id },
        name: { $regex: `^${name}$`, $options: "i" },
      });

      if (exists) {
        return res.status(400).json({
          success: false,
          message: "Category name already exists",
        });
      }

      category.name = name;
    }

    if (typeof isActive === "boolean") {
      category.isActive = isActive;
    }

    await category.save();

    res.json({
      success: true,
      category,
    });
  } catch (error) {
    next(error);
  }
};

// SOFT DELETE CATEGORY
export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Soft delete
    category.isActive = false;
    await category.save();

    // Remove category reference from tours
    await Tour.updateMany(
      { category: category._id },
      { $unset: { category: "" } }
    );

    res.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
// GET ALL ACTIVE CATEGORIES FOR OPERATOR
export const getOperatorCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await Category.find({ isActive: true }).select("_id name").sort({ name: 1 });
    res.json({ success: true, categories });
  } catch (error) {
    next(error);
  }
};

