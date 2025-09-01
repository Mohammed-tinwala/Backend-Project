import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // Normalize path for cross-platform compatibility
    const normalizedPath = path.resolve(localFilePath);

    // Upload the file to Cloudinary
    const response = await cloudinary.uploader.upload(normalizedPath, {
      resource_type: "auto",
    });

    // Clean up local file
    fs.unlinkSync(normalizedPath);

    console.log("Cloudinary Upload Success:", response.secure_url);
    return response;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return null;
  }
};

export default uploadOnCloudinary;
