const multer = require("multer");

// Không lưu ảnh xuống máy.
// Ảnh chỉ nằm tạm trong RAM trước khi gửi lên Cloudinary.
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

const upload = multer({
  storage: storage,

  limits: {
    // Tối đa 10MB / ảnh
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: fileFilter,
});

module.exports = upload;
