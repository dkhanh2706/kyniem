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

    if (!content?.trim() && !image_url) {
      return res.status(400).json({
        success: false,
        message: "Bạn cần nhập nội dung hoặc chọn ảnh.",
      });
    }

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
      JOIN users ON posts.user_id = users.id
      WHERE posts.id = $1
      `,
      [postId],
    );

    const post = {
      ...postResult.rows[0],
      reactions_count: 0,
      comments_count: 0,
      user_reaction: null,
      reaction_types: [],
    };

    return res.status(201).json({
      success: true,
      message: "Đăng kỷ niệm thành công.",
      post,
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
    const userId = req.user.id;

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
        users.avatar_url,

        COUNT(DISTINCT r.id)::int AS reactions_count,
        COUNT(DISTINCT c.id)::int AS comments_count,
        MAX(CASE WHEN r.user_id = $1 THEN r.reaction_type ELSE NULL END) AS user_reaction,
        COALESCE(
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT r.reaction_type), NULL),
          '{}'
        ) AS reaction_types

      FROM posts
      JOIN users ON posts.user_id = users.id
      LEFT JOIN post_reactions r ON posts.id = r.post_id
      LEFT JOIN post_comments c ON posts.id = c.post_id
      GROUP BY posts.id, users.id
      ORDER BY posts.created_at DESC
      `,
      [userId],
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

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu ID bài đăng.",
      });
    }

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

    if (Number(post.user_id) !== Number(userId)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa bài đăng này.",
      });
    }

    if (post.image_public_id) {
      try {
        const cloudResult = await cloudinary.uploader.destroy(
          post.image_public_id,
          {
            resource_type: "image",
            invalidate: true,
          },
        );

        if (cloudResult.result !== "ok" && cloudResult.result !== "not found") {
          return res.status(500).json({
            success: false,
            message:
              "Không thể xóa ảnh trên Cloudinary. Bài đăng vẫn được giữ lại.",
          });
        }
      } catch (cloudinaryError) {
        console.error("Cloudinary delete error:", cloudinaryError);
        return res.status(500).json({
          success: false,
          message: "Xóa ảnh trên Cloudinary thất bại. Bài đăng chưa được xóa.",
        });
      }
    }

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

/*
====================================================
THẢ / ĐỔI / HỦY CẢM XÚC
POST /api/posts/:id/reactions
====================================================
*/

const VALID_REACTIONS = ["heart", "care", "laugh", "touched", "sparkle", "wow"];

exports.toggleReaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.id;
    let reactionType = req.body.reaction_type || "heart";

    if (!VALID_REACTIONS.includes(reactionType)) {
      reactionType = "heart";
    }

    // Kiểm tra bài đăng tồn tại
    const postCheck = await pool.query("SELECT id FROM posts WHERE id = $1", [postId]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Bài đăng không tồn tại.",
      });
    }

    // Kiểm tra cảm xúc hiện tại của user
    const existingReaction = await pool.query(
      "SELECT id, reaction_type FROM post_reactions WHERE post_id = $1 AND user_id = $2",
      [postId, userId],
    );

    let currentReaction = null;

    if (existingReaction.rows.length > 0) {
      if (existingReaction.rows[0].reaction_type === reactionType) {
        // Cùng loại cảm xúc -> Hủy cảm xúc (Toggle off)
        await pool.query(
          "DELETE FROM post_reactions WHERE post_id = $1 AND user_id = $2",
          [postId, userId],
        );
        currentReaction = null;
      } else {
        // Đổi loại cảm xúc khác
        await pool.query(
          "UPDATE post_reactions SET reaction_type = $3 WHERE post_id = $1 AND user_id = $2",
          [postId, userId, reactionType],
        );
        currentReaction = reactionType;
      }
    } else {
      // Thả cảm xúc mới
      await pool.query(
        "INSERT INTO post_reactions (post_id, user_id, reaction_type) VALUES ($1, $2, $3)",
        [postId, userId, reactionType],
      );
      currentReaction = reactionType;
    }

    // Lấy thống kê cảm xúc cập nhật
    const statsResult = await pool.query(
      `
      SELECT
        COUNT(*)::int AS reactions_count,
        COALESCE(ARRAY_REMOVE(ARRAY_AGG(DISTINCT reaction_type), NULL), '{}') AS reaction_types
      FROM post_reactions
      WHERE post_id = $1
      `,
      [postId],
    );

    return res.json({
      success: true,
      user_reaction: currentReaction,
      reactions_count: statsResult.rows[0].reactions_count,
      reaction_types: statsResult.rows[0].reaction_types,
    });
  } catch (error) {
    console.error("toggleReaction error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể xử lý cảm xúc.",
    });
  }
};

/*
====================================================
DANH SÁCH NGƯỜI THẢ CẢM XÚC
GET /api/posts/:id/reactions
====================================================
*/

exports.getReactions = async (req, res) => {
  try {
    const postId = req.params.id;

    const result = await pool.query(
      `
      SELECT
        r.id,
        r.reaction_type,
        r.created_at,
        u.id AS user_id,
        u.username,
        u.display_name,
        u.avatar_url
      FROM post_reactions r
      JOIN users u ON r.user_id = u.id
      WHERE r.post_id = $1
      ORDER BY r.created_at DESC
      `,
      [postId],
    );

    return res.json({
      success: true,
      reactions: result.rows,
    });
  } catch (error) {
    console.error("getReactions error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể tải danh sách cảm xúc.",
    });
  }
};

/*
====================================================
LẤY BÌNH LUẬN CỦA BÀI ĐĂNG
GET /api/posts/:id/comments
====================================================
*/

exports.getComments = async (req, res) => {
  try {
    const postId = req.params.id;

    const result = await pool.query(
      `
      SELECT
        c.id,
        c.post_id,
        c.user_id,
        c.parent_id,
        c.content,
        c.created_at,
        u.username,
        u.display_name,
        u.avatar_url
      FROM post_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC
      `,
      [postId],
    );

    return res.json({
      success: true,
      comments: result.rows,
    });
  } catch (error) {
    console.error("getComments error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể tải bình luận.",
    });
  }
};

/*
====================================================
GỬI BÌNH LUẬN MỚI HOẶC TRẢ LỜI
POST /api/posts/:id/comments
====================================================
*/

exports.createComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.id;
    const { content, parent_id } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Nội dung bình luận không được để trống.",
      });
    }

    // Kiểm tra bài đăng tồn tại
    const postCheck = await pool.query("SELECT id FROM posts WHERE id = $1", [postId]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Bài đăng không tồn tại.",
      });
    }

    // Kiểm tra parent_id nếu có
    let validParentId = null;
    if (parent_id) {
      const parentCheck = await pool.query(
        "SELECT id FROM post_comments WHERE id = $1 AND post_id = $2",
        [parent_id, postId],
      );
      if (parentCheck.rows.length > 0) {
        validParentId = parentCheck.rows[0].id;
      }
    }

    const insertResult = await pool.query(
      `
      INSERT INTO post_comments (post_id, user_id, parent_id, content)
      VALUES ($1, $2, $3, $4)
      RETURNING id
      `,
      [postId, userId, validParentId, content.trim()],
    );

    const commentId = insertResult.rows[0].id;

    const commentData = await pool.query(
      `
      SELECT
        c.id,
        c.post_id,
        c.user_id,
        c.parent_id,
        c.content,
        c.created_at,
        u.username,
        u.display_name,
        u.avatar_url
      FROM post_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
      `,
      [commentId],
    );

    const countResult = await pool.query(
      "SELECT COUNT(*)::int AS comments_count FROM post_comments WHERE post_id = $1",
      [postId],
    );

    return res.status(201).json({
      success: true,
      message: "Bình luận thành công.",
      comment: commentData.rows[0],
      comments_count: countResult.rows[0].comments_count,
    });
  } catch (error) {
    console.error("createComment error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể gửi bình luận.",
    });
  }
};

/*
====================================================
XÓA BÌNH LUẬN
DELETE /api/posts/:id/comments/:commentId
====================================================
*/

exports.deleteComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.id;
    const commentId = req.params.commentId;

    const checkResult = await pool.query(
      `
      SELECT
        c.user_id AS comment_user_id,
        p.user_id AS post_user_id
      FROM post_comments c
      JOIN posts p ON c.post_id = p.id
      WHERE c.id = $1 AND c.post_id = $2
      `,
      [commentId, postId],
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Bình luận không tồn tại.",
      });
    }

    const { comment_user_id, post_user_id } = checkResult.rows[0];

    // Chỉ người viết bình luận HOẶC chủ bài đăng mới được xóa
    if (
      Number(comment_user_id) !== Number(userId) &&
      Number(post_user_id) !== Number(userId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa bình luận này.",
      });
    }

    await pool.query("DELETE FROM post_comments WHERE id = $1", [commentId]);

    const countResult = await pool.query(
      "SELECT COUNT(*)::int AS comments_count FROM post_comments WHERE post_id = $1",
      [postId],
    );

    return res.json({
      success: true,
      message: "Đã xóa bình luận.",
      comments_count: countResult.rows[0].comments_count,
    });
  } catch (error) {
    console.error("deleteComment error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể xóa bình luận.",
    });
  }
};
