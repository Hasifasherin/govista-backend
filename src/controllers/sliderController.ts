import { Request, Response } from "express";
import Slider from "../models/Slider";
import { AuthRequest } from "../types/authRequest";
import { deleteFromCloudinary } from "../utils/cloudinaryUpload";

/**
 * GET /api/sliders
 * Public – Homepage sliders
 */
export const getSliders = async (_req: Request, res: Response) => {
  try {
    const sliders = await Slider.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: sliders,
    });
  } catch (error) {
    console.error("FETCH SLIDERS ERROR 👉", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sliders",
    });
  }
};

/**
 * POST /api/admin/sliders
 * Admin – Create slider
 */
export const createSlider = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!req.body.image || !req.body.imagePublicId) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    const slider = await Slider.create({
      imageUrl: req.body.image,
      imagePublicId: req.body.imagePublicId,
      createdBy: req.user.id || "admin",
    });

    res.status(201).json({
      success: true,
      data: slider,
    });
  } catch (error) {
    console.error("CREATE SLIDER ERROR 👉", error);
    res.status(500).json({
      success: false,
      message: "Failed to create slider",
    });
  }
};

/**
 * PUT /api/admin/sliders/:id
 * Admin – Update slider
 */
export const updateSlider = async (req: AuthRequest, res: Response) => {
  try {
    const slider = await Slider.findById(req.params.id);

    if (!slider) {
      return res.status(404).json({
        success: false,
        message: "Slider not found",
      });
    }

    // If image is updated
    if (req.body.image && req.body.imagePublicId) {
      if (slider.imagePublicId) {
        await deleteFromCloudinary(slider.imagePublicId);
      }

      slider.imageUrl = req.body.image;
      slider.imagePublicId = req.body.imagePublicId;
    }

    await slider.save();

    res.status(200).json({
      success: true,
      data: slider,
    });
  } catch (error) {
    console.error("UPDATE SLIDER ERROR 👉", error);
    res.status(500).json({
      success: false,
      message: "Failed to update slider",
    });
  }
};

/**
 * DELETE /api/admin/sliders/:id
 * Admin – Delete slider
 */
export const deleteSlider = async (req: AuthRequest, res: Response) => {
  try {
    const slider = await Slider.findById(req.params.id);

    if (!slider) {
      return res.status(404).json({
        success: false,
        message: "Slider not found",
      });
    }

    if (slider.imagePublicId) {
      await deleteFromCloudinary(slider.imagePublicId);
    }

    await slider.deleteOne();

    res.status(200).json({
      success: true,
      message: "Slider deleted successfully",
    });
  } catch (error) {
    console.error("DELETE SLIDER ERROR 👉", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete slider",
    });
  }
};
