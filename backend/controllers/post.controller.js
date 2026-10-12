const pool = require("../db");
const cloudinary = require("../config/cloudinary");

/*
====================================================
TẠO BÀI ĐĂNG
POST /api/posts
====================================================
*/

exports.createPost = async (req, res) => {
  try {
    const userId = req.user.id;

    const { content, image_url, image_public_id } = req.body;

    /*
    Phải có ít nhất:
    - nội dung
    HOẶC
    - ảnh
    */

    if (!content?.trim() && !image_url) {
      return res.status(400).json({
        success: false,
        message: "Bạn cần nhập nội dung hoặc chọn ảnh.",
      });
    }

    /*
    Lưu bài đăng
    */

    const result = await pool.query(
      `
      INSERT INTO posts (
        user_id,
        content,
        image_url,
        image_public_id
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        userId,
        content?.trim() || null,
        image_url || null,
        image_public_id || null,
      ],
    );

    const postId = result.rows[0].id;

    /*
    Lấy bài vừa đăng kèm thông tin user
    */

    const postResult = await pool.query(
      `
      SELECT
        posts.id,
        posts.user_id,
        posts.content,
        posts.image_url,
        posts.image_public_id,
        posts.created_at,

        users.username,
        users.display_name,
        users.avatar_url

      FROM posts

      JOIN users
        ON posts.user_id = users.id

      WHERE posts.id = $1
      `,
      [postId],
    );

    return res.status(201).json({
      success: true,
      message: "Đăng kỷ niệm thành công.",
      post: postResult.rows[0],
    });
  } catch (error) {
    console.error("createPost error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tạo bài đăng.",
    });
  }
};

/*
====================================================
LẤY TẤT CẢ BÀI ĐĂNG
GET /api/posts
====================================================
*/

exports.getPosts = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        posts.id,
        posts.user_id,
        posts.content,
        posts.image_url,
        posts.image_public_id,
        posts.created_at,

        users.username,
        users.display_name,
        users.avatar_url

      FROM posts

      JOIN users
        ON posts.user_id = users.id

      ORDER BY posts.created_at DESC
      `,
    );

    return res.json({
      success: true,
      posts: result.rows,
    });
  } catch (error) {
    console.error("getPosts error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tải danh sách kỷ niệm.",
    });
  }
};

/*
====================================================
XÓA BÀI ĐĂNG
DELETE /api/posts/:id
====================================================
*/

exports.deletePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.id;

    /*
    ================================================
    1. KIỂM TRA ID BÀI
    ================================================
    */

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu ID bài đăng.",
      });
    }

    /*
    ================================================
    2. TÌM BÀI ĐĂNG
    ================================================
    */

    const result = await pool.query(
      `
      SELECT *
      FROM posts
      WHERE id = $1
      `,
      [postId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Bài đăng không tồn tại.",
      });
    }

    const post = result.rows[0];

    /*
    ================================================
    3. KIỂM TRA NGƯỜI XÓA CÓ PHẢI CHỦ BÀI KHÔNG
    ================================================
    */

    if (Number(post.user_id) !== Number(userId)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa bài đăng này.",
      });
    }

    /*
    ================================================
    4. NẾU CÓ ẢNH
       XÓA CLOUDINARY TRƯỚC
    ================================================
    */

    if (post.image_public_id) {
      try {
        const cloudResult = await cloudinary.uploader.destroy(
          post.image_public_id,
          {
            resource_type: "image",

            /*
              Yêu cầu CDN bỏ cache ảnh cũ
              */
            invalidate: true,
          },
        );

        console.log("Cloudinary delete result:", cloudResult);

        /*
        Cloudinary thường trả:

        { result: "ok" }

        Nếu ảnh đã bị xóa trước đó:

        { result: "not found" }

        Cả 2 trường hợp đều cho phép
        xóa bài trong database.
        */

        if (cloudResult.result !== "ok" && cloudResult.result !== "not found") {
          return res.status(500).json({
            success: false,
            message:
              "Không thể xóa ảnh trên Cloudinary. Bài đăng vẫn được giữ lại.",
          });
        }
      } catch (cloudinaryError) {
        console.error("Cloudinary delete error:", cloudinaryError);

        /*
        Cloudinary lỗi
        => KHÔNG xóa PostgreSQL
        */

        return res.status(500).json({
          success: false,
          message: "Xóa ảnh trên Cloudinary thất bại. Bài đăng chưa được xóa.",
        });
      }
    }

    /*
    ================================================
    5. CLOUDINARY ĐÃ XÓA THÀNH CÔNG
       MỚI XÓA DATABASE
    ================================================
    */

    const deleteResult = await pool.query(
      `
      DELETE FROM posts
      WHERE id = $1
      RETURNING id
      `,
      [postId],
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Bài đăng không còn tồn tại.",
      });
    }

    return res.json({
      success: true,
      message: post.image_public_id
        ? "Đã xóa bài đăng và ảnh trên Cloudinary."
        : "Đã xóa bài đăng.",
    });
  } catch (error) {
    console.error("deletePost error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xóa bài đăng.",
    });
  }
};
