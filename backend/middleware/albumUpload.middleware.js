const multer = require("multer");

// Chỉ lưu file tạm trong RAM.
// Sau đó controller sẽ upload thẳng lên Cloudflare R2.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ được upload ảnh JPG, JPEG, PNG, WEBP hoặc GIF."), false);
  }
};

const albumUpload = multer({
  storage,

  limits: {
    // Tối đa 10MB / ảnh
    fileSize: 10 * 1024 * 1024,

    // Tối đa 30 ảnh trong một lần upload
    files: 30,
  },

  fileFilter,
});

module.exports = albumUpload;
