import { Request, Response } from "express";
import Slider from "../models/Slider";
import { AuthRequest } from "../types/authRequest";
import { deleteFromCloudinary } from "../utils/cloudinaryUpload";


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


export const createSlider = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { image, imagePublicId } = req.body;

    if (!image || !imagePublicId) {
      return res.status(400).json({
        success: false,
        message: "Image upload failed",
      });
    }

    const slider = await Slider.create({
      imageUrl: image,               
      imagePublicId: imagePublicId,  
      createdBy: req.user.id,
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


export const updateSlider = async (req: AuthRequest, res: Response) => {
  try {
    const slider = await Slider.findById(req.params.id);

    if (!slider) {
      return res.status(404).json({
        success: false,
        message: "Slider not found",
      });
    }

    // If new image uploaded
    if (req.file) {
      const { path, filename } = req.file as any;

      // delete old image from cloudinary
      if (slider.imagePublicId) {
        await deleteFromCloudinary(slider.imagePublicId);
      }

      slider.imageUrl = path;          
      slider.imagePublicId = filename; 
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
