import cloudinary from "../config/cloudinary.js";
import ApiError from "../utils/ApiError.js";

// Keep this ONLY if you are using multer for standard file uploads elsewhere
const streamUpload = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      },
    );
    stream.end(buffer);
  });
};

export const uploadImage = async (fileData) => {
  try {
    // If fileData is a base64 string from canvas, use standard upload
    if (typeof fileData === "string" && fileData.startsWith("data:image")) {
      const result = await cloudinary.uploader.upload(fileData, {
        folder: "whiteboard-images",
      });
      return result.secure_url;
    }
    // Fallback to stream if it actually is a binary buffer
    const result = await streamUpload(fileData, "whiteboard-images");
    return result.secure_url;
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    throw new ApiError(500, "Failed to upload image");
  }
};

export const uploadThumbnail = async (buffer) => {
  try {
    // Because the frontend sends a FormData Blob, we receive a binary Buffer.
    // We MUST use the streamUpload method to handle Buffers.
    const result = await streamUpload(buffer, "whiteboard-thumbnails");
    return result.secure_url;
  } catch (err) {
    console.error("Cloudinary thumbnail upload error:", err);
    throw new ApiError(500, "Failed to upload thumbnail");
  }
};

// Optional: delete old asset when replacing a thumbnail/image
export const deleteImageByUrl = async (url) => {
  if (!url) return;
  const publicId = url.split("/").slice(-2).join("/").split(".")[0];
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Cloudinary delete failed:", err.message);
  }
};
