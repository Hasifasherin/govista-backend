import { Request, Response, NextFunction } from "express";
import {
  uploadToCloudinary,
  deleteFromCloudinary
} from "../utils/cloudinaryUpload";

// Image validation middleware
export const validateImage = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.file) return next();

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (req.file.size > maxSize) {
    return res.status(400).json({
      success: false,
      message: "Image size should be less than 5MB"
    });
  }

  // Check file type
  const allowedMimes = ["image/jpeg", "image/png", "image/jpg", "image/webp", "image/gif"];
  if (!allowedMimes.includes(req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: "Only JPEG, PNG, JPG, WebP, and GIF images are allowed"
    });
  }

  next();
};

// Single image upload middleware
export const uploadSingleImage = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.file) {
      return next();
    }

    // Determine folder based on route/context
    let folder = "general";
    let publicId = "";

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

    // Upload to Cloudinary
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

    // Attach image info to request
    req.body.image = result.secure_url;
    req.body.imagePublicId = result.public_id;

    // Store in req.file for reference
    (req.file as any).cloudinaryUrl = result.secure_url;
    (req.file as any).publicId = result.public_id;

    next();
  } catch (error: any) {
    console.error("Image upload error:", error);

    // Provide user-friendly error messages
    if (error.message.includes("File size too large")) {
      return res.status(400).json({
        success: false,
        message: "Image file is too large. Maximum size is 5MB."
      });
    }

    if (error.message.includes("Invalid image")) {
      return res.status(400).json({
        success: false,
        message: "Invalid image file. Please upload a valid image."
      });
    }

    // Generic error
    return res.status(500).json({
      success: false,
      message: "Failed to upload image. Please try again."
    });
  }
};

// Delete image middleware (for cleanup)
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

// Update image middleware (delete old, upload new)
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
    next(error);
  }
};