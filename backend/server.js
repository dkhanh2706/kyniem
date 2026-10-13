const express = require("express");
const cors = require("cors");
const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, ".env"),
});

const pool = require("./db");

const app = express();

/*
====================================================
MIDDLEWARE
====================================================
*/

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  }),
);

/*
====================================================
ROUTES
====================================================
*/

// Auth hiện tại
const authRoutes = require("./routes/auth.routes");

// Upload ảnh hiện tại - Cloudinary
const uploadRoutes = require("./routes/upload.routes");

// Bài đăng hiện tại
const postRoutes = require("./routes/post.routes");

// User hiện tại
const userRoutes = require("./routes/user.routes");

// Album mới - Cloudflare R2
const albumRoutes = require("./routes/album.routes");

/*
====================================================
USE ROUTES
====================================================
*/

// Auth
app.use("/api/auth", authRoutes);

// Cloudinary cũ - giữ nguyên
app.use("/api/upload", uploadRoutes);

// Post cũ - giữ nguyên
app.use("/api/posts", postRoutes);

// User cũ - giữ nguyên
app.use("/api/users", userRoutes);

// Album mới - Cloudflare R2
app.use("/api/albums", albumRoutes);

/*
====================================================
TEST SERVER
====================================================
*/

app.get("/", (req, res) => {
  res.send("Photo Memory Backend đang chạy");
});

/*
====================================================
TEST API
====================================================
*/

app.get("/api/test", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "API đang hoạt động.",
  });
});

/*
====================================================
ERROR HANDLER
====================================================
*/

app.use((err, req, res, next) => {
  console.error("Server error:", err);

  /*
  ==================================================
  MULTER - FILE QUÁ LỚN
  ==================================================
  */

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "Ảnh quá lớn. Dung lượng tối đa là 10MB.",
    });
  }

  /*
  ==================================================
  MULTER - QUÁ NHIỀU FILE
  ==================================================
  */

  if (err.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({
      success: false,
      message: "Bạn chỉ được upload tối đa 30 ảnh mỗi lần.",
    });
  }

  /*
  ==================================================
  MULTER - FIELD FILE KHÔNG ĐÚNG
  ==================================================
  */

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      success: false,
      message: "File upload không đúng định dạng yêu cầu.",
    });
  }

  /*
  ==================================================
  CÁC LỖI KHÁC
  ==================================================
  */

  return res.status(500).json({
    success: false,
    message: err.message || "Có lỗi xảy ra trên server.",
  });
});

/*
====================================================
DATABASE INIT HELPER
====================================================

PHẦN NÀY GIỮ NGUYÊN LOGIC CŨ.

KHÔNG:
- tạo bảng albums
- tạo bảng album_photos
- đụng Supabase
- đụng Cloudinary
====================================================
*/

async function initTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_reactions (
        id SERIAL PRIMARY KEY,

        post_id INTEGER NOT NULL
          REFERENCES posts(id)
          ON DELETE CASCADE,

        user_id INTEGER NOT NULL
          REFERENCES users(id)
          ON DELETE CASCADE,

        reaction_type VARCHAR(20)
          NOT NULL
          DEFAULT 'heart',

        created_at TIMESTAMP
          DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT unique_post_user_reaction
          UNIQUE (post_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id
      ON post_reactions(post_id);


      CREATE TABLE IF NOT EXISTS post_comments (
        id SERIAL PRIMARY KEY,

        post_id INTEGER NOT NULL
          REFERENCES posts(id)
          ON DELETE CASCADE,

        user_id INTEGER NOT NULL
          REFERENCES users(id)
          ON DELETE CASCADE,

        content TEXT NOT NULL,

        created_at TIMESTAMP
          DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_post_comments_post_id
      ON post_comments(post_id);
    `);

    console.log("Khởi tạo bảng cơ sở dữ liệu thành công");
  } catch (err) {
    console.error("Lỗi khởi tạo bảng:", err);
  }
}

/*
====================================================
START SERVER
====================================================
*/

const PORT = process.env.PORT || 5001;

pool
  .connect()
  .then(async (client) => {
    console.log("Kết nối PostgreSQL thành công");

    client.release();

    /*
    ==================================================
    INIT DATABASE CŨ
    ==================================================
    */

    await initTables();

    /*
    ==================================================
    START EXPRESS SERVER
    ==================================================
    */

    app.listen(PORT, "0.0.0.0", () => {
      console.log("======================================");
      console.log(`Backend running on port ${PORT}`);
      console.log(`Local: http://localhost:${PORT}`);
      console.log("--------------------------------------");

      console.log("Routes:");
      console.log(`Auth      : http://localhost:${PORT}/api/auth`);
      console.log(`Upload    : http://localhost:${PORT}/api/upload`);
      console.log(`Posts     : http://localhost:${PORT}/api/posts`);
      console.log(`Users     : http://localhost:${PORT}/api/users`);
      console.log(`Albums R2 : http://localhost:${PORT}/api/albums`);

      console.log("======================================");
    });
  })
  .catch((error) => {
    console.error("Không thể kết nối PostgreSQL:", error);
  });
