import { Request, Response, NextFunction } from "express";
import { uploadToCloudinary } from "../utils/cloudinaryUpload";

export const uploadSingleImage = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (!req.file) {
      return next();
    }

    const result = await uploadToCloudinary(
      req.file.buffer,
      "tours"
    );

    req.body.image = result.secure_url;
    next();
  } catch (error) {
    next(error);
  }
};
