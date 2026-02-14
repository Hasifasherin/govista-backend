import { Request, Response, NextFunction } from "express";
import {
  uploadToCloudinary,
  deleteFromCloudinary
} from "../utils/cloudinaryUpload";

/* ================= IMAGE VALIDATION ================= */
export const validateImage = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.file) return next();

  const maxSize = 10 * 1024 * 1024; // 10MB

  // File size check
  if (req.file.size > maxSize) {
    return res.status(400).json({
      success: false,
      message: "Image size should be less than 10MB"
    });
  }

  // File type check
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp",
    "image/gif"
  ];

  if (!allowedMimes.includes(req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: "Only JPEG, PNG, JPG, WebP, and GIF images are allowed"
    });
  }

  next();
};

/* ================= SINGLE IMAGE UPLOAD ================= */
export const uploadSingleImage = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.file) return next();

    let folder = "general";
    let publicId = "";

    /* ===== Folder Detection ===== */
    if (req.baseUrl.includes("/api/tours")) {
      folder = "tours";
      if (req.params.id) {
        publicId = `tour-${req.params.id}-${Date.now()}`;
      } else if (req.user) {
        publicId = `tour-${req.user.id}-${Date.now()}`;
      }
    }

    else if (req.baseUrl.includes("/api/users")) {
      folder = "users";
      if (req.user) {
        publicId = `user-${req.user.id}-${Date.now()}`;
      }
    }

    else if (req.baseUrl.includes("/api/sliders")) {
      folder = "sliders";
      publicId = `slider-${Date.now()}`;
    }

    else if (req.baseUrl.includes("/api/operators")) {
      folder = "operators";
      if (req.user) {
        publicId = `operator-${req.user.id}-${Date.now()}`;
      }
    }

    /* ===== Upload To Cloudinary ===== */
    const result = await uploadToCloudinary({
      buffer: req.file.buffer,
      folder,
      publicId: publicId || undefined,
      transformation: {
        width: 1200,
        height: 800,
        crop: "fill",
        quality: "auto:good",
        format: "webp"
      }
    });

    /* ===== Attach To Request Body ===== */
    req.body.image = result.secure_url;
    req.body.imagePublicId = result.public_id;

    /* ===== Store On File Object ===== */
    (req.file as any).cloudinaryUrl = result.secure_url;
    (req.file as any).publicId = result.public_id;

    next();

  } catch (error: any) {
    console.error("Image upload error:", error);

    const message =
      error?.message?.includes("File size")
        ? "Image file is too large. Maximum size is 10MB."
        : error?.message?.includes("Invalid")
        ? "Invalid image file. Please upload a valid image."
        : "Failed to upload image. Please try again.";

    return res.status(500).json({
      success: false,
      message
    });
  }
};

/* ================= DELETE IMAGE ================= */
export const deleteImageMiddleware = async (
  publicId: string
): Promise<boolean> => {
  try {
    return await deleteFromCloudinary(publicId);
  } catch (error) {
    console.error("Delete image middleware error:", error);
    return false;
  }
};

/* ================= UPDATE IMAGE ================= */
export const updateImage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.body.image || !req.body.imagePublicId) {
      return next();
    }

    const oldPublicId = req.body.oldImagePublicId;

    if (oldPublicId && oldPublicId !== req.body.imagePublicId) {
      try {
        await deleteFromCloudinary(oldPublicId);
      } catch (err) {
        console.error("Failed to delete old image:", err);
      }
    }

    next();

  } catch (error) {
    console.error("Update image middleware error:", error);
    next(error);
  }
};
