import cloudinary from "../config/cloudinary";

interface UploadOptions {
  buffer: Buffer;
  folder: string;
  publicId?: string;
  transformation?: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
    format?: string;
  };
}

export const uploadToCloudinary = (
  options: UploadOptions
): Promise<{ 
  secure_url: string; 
  public_id: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}> => {
  return new Promise((resolve, reject) => {
    // Build transformation options
    const transformation: any[] = [];
    
    if (options.transformation) {
      const { width, height, crop, quality, format } = options.transformation;
      
      if (width && height) {
        transformation.push({ width, height, crop: crop || "fill" });
      }
      
      if (quality) {
        transformation.push({ quality });
      }
      
      if (format) {
        transformation.push({ format });
      }
    }

    // Upload configuration
    const uploadConfig: any = {
      folder: options.folder,
      resource_type: "auto" // Auto-detect image/video
    };

    if (options.publicId) {
      uploadConfig.public_id = options.publicId;
    }

    if (transformation.length > 0) {
      uploadConfig.transformation = transformation;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadConfig,
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return reject(error);
        }
        
        if (!result) {
          return reject(new Error("Cloudinary upload returned no result"));
        }

        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes
        });
      }
    );

    // Handle stream errors
    uploadStream.on("error", (error) => {
      console.error("Cloudinary stream error:", error);
      reject(error);
    });

    // Write buffer to stream
    uploadStream.end(options.buffer);
  });
};

// Delete image from Cloudinary
export const deleteFromCloudinary = async (
  publicId: string
): Promise<boolean> => {
  try {
    if (!publicId) {
      console.warn("No publicId provided for deletion");
      return false;
    }

    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === "ok") {
      console.log(`Successfully deleted Cloudinary image: ${publicId}`);
      return true;
    } else {
      console.warn(`Failed to delete Cloudinary image: ${publicId}`, result);
      return false;
    }
  } catch (error) {
    console.error("Cloudinary deletion error:", error);
    return false;
  }
};

// Check if image exists in Cloudinary
export const checkImageExists = async (
  publicId: string
): Promise<boolean> => {
  try {
    if (!publicId) return false;
    
    const result = await cloudinary.api.resource(publicId);
    return !!result;
  } catch (error: any) {
    // Resource not found error
    if (error.http_code === 404) {
      return false;
    }
    console.error("Cloudinary check error:", error);
    return false;
  }
};

// Get image info
export const getImageInfo = async (
  publicId: string
): Promise<any> => {
  try {
    if (!publicId) {
      throw new Error("No publicId provided");
    }
    
    return await cloudinary.api.resource(publicId);
  } catch (error) {
    console.error("Cloudinary get info error:", error);
    throw error;
  }
};

// Update image (with optional transformation)
export const updateCloudinaryImage = async (
  publicId: string,
  buffer: Buffer,
  transformation?: any
): Promise<any> => {
  try {
    // First delete the old image
    await deleteFromCloudinary(publicId);
    
    // Extract folder from publicId
    const parts = publicId.split('/');
    const fileName = parts.pop();
    const folder = parts.join('/');
    
    // Upload new image
    return await uploadToCloudinary({
      buffer,
      folder: folder || "general",
      publicId: fileName?.replace(/\.[^/.]+$/, ""), // Remove extension
      transformation
    });
  } catch (error) {
    console.error("Cloudinary update error:", error);
    throw error;
  }
};

// Generate optimized image URL with transformations
export const getOptimizedImageUrl = (
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
    format?: string;
  } = {}
): string => {
  if (!publicId) return "";
  
  const transformation: any[] = [];
  
  if (options.width || options.height) {
    transformation.push({
      width: options.width,
      height: options.height,
      crop: options.crop || "fill"
    });
  }
  
  if (options.quality) {
    transformation.push({ quality: options.quality });
  }
  
  if (options.format) {
    transformation.push({ format: options.format });
  }
  
  return cloudinary.url(publicId, {
    transformation,
    secure: true
  });
};