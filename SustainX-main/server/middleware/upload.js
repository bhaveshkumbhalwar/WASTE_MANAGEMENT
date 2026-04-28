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
 * Includes full diagnostics for production debugging.
 */
const uploadToCloudinary = (file, folder = "sustainx") => {
  return new Promise((resolve, reject) => {
    // ── Pre-flight check: file buffer ──
    if (!file || !file.buffer) {
      console.error("❌ [CLOUDINARY] No file buffer provided");
      return reject(new Error("No file buffer provided for Cloudinary upload"));
    }

    console.log(`☁️ [CLOUDINARY] Starting upload | folder=${folder} | size=${file.buffer.length} bytes | mime=${file.mimetype}`);

    // ── Pre-flight check: Cloudinary config ──
    const cfg = cloudinary.config();
    if (!cfg.cloud_name || !cfg.api_key || !cfg.api_secret) {
      const missing = [];
      if (!cfg.cloud_name) missing.push("CLOUDINARY_CLOUD_NAME");
      if (!cfg.api_key) missing.push("CLOUDINARY_API_KEY");
      if (!cfg.api_secret) missing.push("CLOUDINARY_API_SECRET");
      const errMsg = `Cloudinary not configured! Missing env vars: ${missing.join(", ")}`;
      console.error(`❌ [CLOUDINARY] ${errMsg}`);
      return reject(new Error(errMsg));
    }

    // ── Upload stream (no format restriction — let Cloudinary auto-detect) ──
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) {
          console.error("❌ [CLOUDINARY] upload_stream error:", JSON.stringify(error));
          return reject(new Error(`Cloudinary error: ${error.message || JSON.stringify(error)}`));
        }
        if (!result || !result.secure_url) {
          console.error("❌ [CLOUDINARY] No secure_url in result:", JSON.stringify(result));
          return reject(new Error("Cloudinary returned no URL"));
        }
        console.log(`✅ [CLOUDINARY] Upload OK: ${result.secure_url}`);
        resolve(result.secure_url);
      }
    );

    // ── Handle stream errors ──
    stream.on("error", (streamErr) => {
      console.error("❌ [CLOUDINARY] Stream error:", streamErr.message);
      reject(new Error(`Cloudinary stream error: ${streamErr.message}`));
    });

    // Use streamifier for reliable buffer-to-stream piping on all platforms
    streamifier.createReadStream(file.buffer).pipe(stream);
  });
};

module.exports = upload;
module.exports.uploadToCloudinary = uploadToCloudinary;
