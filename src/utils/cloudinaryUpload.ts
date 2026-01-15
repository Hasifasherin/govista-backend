import cloudinary from "../config/cloudinary";

export const uploadToCloudinary = (
  buffer: Buffer,
  folder: string
): Promise<{ secure_url: string }> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result as any);
      }
    ).end(buffer);
  });
};
