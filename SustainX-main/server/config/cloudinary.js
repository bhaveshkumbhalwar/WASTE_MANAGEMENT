const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY || process.env.API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET || process.env.API_SECRET,
});

// Startup check — log whether Cloudinary is configured
const cfg = cloudinary.config();
if (!cfg.cloud_name || !cfg.api_key || !cfg.api_secret) {
  console.error("❌ CLOUDINARY IS NOT CONFIGURED! Check env vars:");
  console.error("   Expected: CLOUDINARY_CLOUD_NAME or CLOUD_NAME");
  console.error("   Expected: CLOUDINARY_API_KEY or API_KEY");
  console.error("   Expected: CLOUDINARY_API_SECRET or API_SECRET");
} else {
  console.log(`✅ Cloudinary configured: cloud_name=${cfg.cloud_name}`);
}

module.exports = cloudinary;