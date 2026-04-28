const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

// ─── Use memoryStorage (works on Render, Heroku, etc.) ───
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  if (allowed.test(file.mimetype.split("/")[1])) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (jpg, jpeg, png, gif, webp) are allowed."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

/**
 * Upload a multer memoryStorage file buffer to Cloudinary via streamifier.
 * Returns the secure_url string on success.
 */
const uploadToCloudinary = (file, folder = "sustainx") => {
  return new Promise((resolve, reject) => {
    if (!file || !file.buffer) {
      return reject(new Error("No file buffer provided for Cloudinary upload"));
    }

    const stream = cloudinary.uploader.upload_stream(
      { folder, allowed_formats: ["jpg", "png", "jpeg", "webp"] },
      (error, result) => {
        if (error) {
          console.error("❌ Cloudinary upload_stream error:", error);
          return reject(error);
        }
        resolve(result.secure_url);
      }
    );

    // Use streamifier for reliable buffer-to-stream piping on all platforms
    streamifier.createReadStream(file.buffer).pipe(stream);
  });
};

module.exports = upload;
module.exports.uploadToCloudinary = uploadToCloudinary;
