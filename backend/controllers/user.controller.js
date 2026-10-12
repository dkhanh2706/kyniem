const pool = require("../db");
const supabase = require("../config/supabase");

/*
====================================================
ĐỔI AVATAR
PUT /api/users/avatar
====================================================
*/

exports.updateAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Bạn chưa chọn ảnh đại diện.",
      });
    }

    /*
    ============================================
    LẤY THÔNG TIN USER HIỆN TẠI
    ============================================
    */

    const userResult = await pool.query(
      `
      SELECT
        id,
        avatar_url,
        avatar_path
      FROM users
      WHERE id = $1
      `,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản.",
      });
    }

    const oldAvatarPath = userResult.rows[0].avatar_path;

    /*
    ============================================
    XÁC ĐỊNH ĐUÔI FILE
    ============================================
    */

    let extension = "jpg";

    if (req.file.mimetype === "image/png") {
      extension = "png";
    } else if (req.file.mimetype === "image/webp") {
      extension = "webp";
    }

    /*
    Mỗi user có một folder riêng
    */

    const filePath = `user-${userId}/avatar-${Date.now()}.${extension}`;

    /*
    ============================================
    UPLOAD AVATAR MỚI LÊN SUPABASE
    ============================================
    */

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("avata")
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,

        cacheControl: "3600",

        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);

      return res.status(500).json({
        success: false,
        message: "Không thể upload ảnh đại diện.",
      });
    }

    /*
    ============================================
    LẤY PUBLIC URL
    ============================================
    */

    const { data: publicData } = supabase.storage
      .from("avata")
      .getPublicUrl(uploadData.path);

    const avatarUrl = publicData.publicUrl;

    /*
    ============================================
    CẬP NHẬT DATABASE
    ============================================
    */

    const updatedResult = await pool.query(
      `
        UPDATE users

        SET
          avatar_url = $1,
          avatar_path = $2

        WHERE id = $3

        RETURNING
          id,
          username,
          display_name,
          role,
          avatar_url,
          avatar_path
        `,
      [avatarUrl, uploadData.path, userId],
    );

    /*
    ============================================
    XÓA AVATAR CŨ
    ============================================

    Chỉ xóa avatar cũ sau khi avatar mới
    đã upload và cập nhật DB thành công.
    */

    if (oldAvatarPath && oldAvatarPath !== uploadData.path) {
      const { error: deleteError } = await supabase.storage
        .from("avata")
        .remove([oldAvatarPath]);

      if (deleteError) {
        console.error("Lỗi xóa avatar cũ:", deleteError);
      }
    }

    return res.json({
      success: true,

      message: "Đổi ảnh đại diện thành công.",

      user: updatedResult.rows[0],
    });
  } catch (error) {
    console.error("updateAvatar error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể đổi ảnh đại diện.",
    });
  }
};

/*
====================================================
CẬP NHẬT THÔNG TIN CÁ NHÂN
PUT /api/users/profile
====================================================
*/

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const { display_name } = req.body;

    /*
    ============================================
    VALIDATE TÊN
    ============================================
    */

    if (!display_name || !display_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tên hiển thị không được để trống.",
      });
    }

    const cleanName = display_name.trim();

    if (cleanName.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Tên hiển thị tối đa 50 ký tự.",
      });
    }

    /*
    ============================================
    UPDATE DATABASE
    ============================================
    */

    const result = await pool.query(
      `
        UPDATE users

        SET
          display_name = $1

        WHERE id = $2

        RETURNING
          id,
          username,
          display_name,
          role,
          avatar_url,
          avatar_path
        `,
      [cleanName, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản.",
      });
    }

    return res.json({
      success: true,

      message: "Cập nhật thông tin thành công.",

      user: result.rows[0],
    });
  } catch (error) {
    console.error("updateProfile error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật thông tin.",
    });
  }
};
