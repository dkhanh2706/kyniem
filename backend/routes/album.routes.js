const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/auth.middleware");

const albumUpload = require("../middleware/albumUpload.middleware");

const {
  getAlbums,
  getAlbumById,
  createAlbum,
  updateAlbum,
  uploadAlbumPhotos,
  updatePhoto,
  deletePhoto,
  setCoverPhoto,
  deleteAlbum,
} = require("../controllers/album.controller");

/*
====================================================
ALBUM
====================================================
*/

// Danh sách album
router.get("/", verifyToken, getAlbums);

// Chi tiết album
router.get("/:id", verifyToken, getAlbumById);

// Tạo album
router.post("/", verifyToken, createAlbum);

// Sửa album
router.put("/:id", verifyToken, updateAlbum);

// Xóa album
router.delete("/:id", verifyToken, deleteAlbum);

/*
====================================================
PHOTO
====================================================
*/

// Upload nhiều ảnh
router.post(
  "/:id/photos",

  verifyToken,

  albumUpload.array("images", 30),

  uploadAlbumPhotos,
);

// Sửa caption
router.put("/photos/:photoId", verifyToken, updatePhoto);

// Xóa ảnh
router.delete("/photos/:photoId", verifyToken, deletePhoto);

// Đặt ảnh bìa
router.put("/:id/cover/:photoId", verifyToken, setCoverPhoto);

module.exports = router;
