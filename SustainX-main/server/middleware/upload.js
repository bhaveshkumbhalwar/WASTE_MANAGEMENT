const multer = require("multer");
const cloudinary = require("../config/cloudinary");

// ─── Use memoryStorage for multer v2 compatibility ───
// multer-storage-cloudinary has compatibility issues with multer v2.
// Instead, we hold the file in memory and upload to Cloudinary inside the controller.
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
 * Helper: Upload a multer memoryStorage file buffer to Cloudinary.
 * Returns the secure_url string, or null on failure.
 */
const uploadToCloudinary = (file, folder = "sustainx") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, allowed_formats: ["jpg", "png", "jpeg", "webp"] },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(file.buffer);
  });
};

module.exports = upload;
module.exports.uploadToCloudinary = uploadToCloudinary;
