import { Request, Response } from "express";
import Slider from "../models/Slider";
import { AuthRequest } from "../types/authRequest";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinaryUpload";

/* ================= GET SLIDERS ================= */
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

/* ================= CREATE SLIDER ================= */
export const createSlider = async (req: AuthRequest, res: Response) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      console.error("CREATE SLIDER ERROR 👉 Missing user in request");
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    // Upload image to Cloudinary
    const uploadResult = await uploadToCloudinary({
      buffer: req.file.buffer,
      folder: "sliders",
      transformation: {
        width: 1600,
        height: 800,
        crop: "fill",
        quality: "auto",
        format: "webp",
      },
    });

    // Create slider with createdBy from authenticated user
    const slider = await Slider.create({
      imageUrl: uploadResult.secure_url,
      imagePublicId: uploadResult.public_id,
      createdBy: req.user.id, // ✅ ensure this field is present
    });

    res.status(201).json({
      success: true,
      data: slider,
    });
  } catch (error: any) {
    console.error("CREATE SLIDER ERROR 👉", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create slider",
    });
  }
};

/* ================= UPDATE SLIDER ================= */
export const updateSlider = async (req: AuthRequest, res: Response) => {
  try {
    const slider = await Slider.findById(req.params.id);

    if (!slider) {
      return res.status(404).json({
        success: false,
        message: "Slider not found",
      });
    }

    // If new image uploaded, replace it
    if (req.file) {
      if (slider.imagePublicId) {
        await deleteFromCloudinary(slider.imagePublicId);
      }

      const uploadResult = await uploadToCloudinary({
        buffer: req.file.buffer,
        folder: "sliders",
        transformation: {
          width: 1600,
          height: 800,
          crop: "fill",
          quality: "auto",
          format: "webp",
        },
      });

      slider.imageUrl = uploadResult.secure_url;
      slider.imagePublicId = uploadResult.public_id;
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

/* ================= DELETE SLIDER ================= */
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
