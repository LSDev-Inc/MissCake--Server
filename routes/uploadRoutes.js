const express = require("express");
const fs = require("fs");
const multer = require("multer");
const { protect, adminOrOwnerOnly } = require("../middleware/authMiddleware");
const { uploadsDir } = require("../config/storage");

const router = express.Router();
const uploadDir = uploadsDir;

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!allowedTypes.has(file.mimetype)) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

router.post("/image", protect, adminOrOwnerOnly, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Image file is required" });
  }

  return res.status(201).json({
    message: "Image uploaded",
    imageUrl: `/uploads/${req.file.filename}`,
  });
});

module.exports = router;
