const cloudinary = require("../config/cloudinary");

/*
====================================================
UPLOAD ẢNH
POST /api/upload/image
====================================================
*/

exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Bạn chưa chọn ảnh.",
      });
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "photo-memory",

          resource_type: "image",

          transformation: [
            {
              width: 1920,
              height: 1920,

              crop: "limit",

              quality: "auto:good",

              fetch_format: "auto",
            },
          ],
        },

        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        },
      );

      uploadStream.end(req.file.buffer);
    });

    return res.status(200).json({
      success: true,

      message: "Upload ảnh thành công.",

      image: {
        url: result.secure_url,

        public_id: result.public_id,

        width: result.width,

        height: result.height,

        format: result.format,

        bytes: result.bytes,
      },
    });
  } catch (error) {
    console.error("Lỗi upload Cloudinary:", error);

    return res.status(500).json({
      success: false,

      message: "Không thể upload ảnh.",

      error: error.message,
    });
  }
};

/*
====================================================
XÓA ẢNH
====================================================
*/

exports.deleteImage = async (req, res) => {
  try {
    const { public_id } = req.body;

    if (!public_id) {
      return res.status(400).json({
        success: false,
        message: "Thiếu public_id.",
      });
    }

    const result = await cloudinary.uploader.destroy(public_id);

    return res.status(200).json({
      success: true,
      message: "Xóa ảnh thành công.",
      result,
    });
  } catch (error) {
    console.error("Lỗi xóa Cloudinary:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xóa ảnh.",
    });
  }
};
