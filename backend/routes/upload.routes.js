const express = require("express");

const router = express.Router();

const upload = require("../middleware/upload.middleware");
const verifyToken = require("../middleware/auth.middleware");

const {
  uploadImage,
  deleteImage,
} = require("../controllers/upload.controller");

// Upload ảnh
router.post("/image", verifyToken, upload.single("image"), uploadImage);

// Xóa ảnh
router.delete("/image", verifyToken, deleteImage);

module.exports = router;
