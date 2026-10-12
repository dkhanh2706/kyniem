const express = require("express");
const cors = require("cors");

require("dotenv").config();

const pool = require("./db");

const app = express();

/*
====================================================
MIDDLEWARE
====================================================
*/

app.use(
  cors({
    origin: "http://localhost:5174",
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

const authRoutes = require("./routes/auth.routes");

const uploadRoutes = require("./routes/upload.routes");

const postRoutes = require("./routes/post.routes");

const userRoutes = require("./routes/user.routes");

/*
====================================================
USE ROUTES
====================================================
*/

app.use("/api/auth", authRoutes);

app.use("/api/upload", uploadRoutes);

app.use("/api/posts", postRoutes);

app.use("/api/users", userRoutes);

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
ERROR HANDLER
====================================================
*/

app.use((err, req, res, next) => {
  console.error("Server error:", err);

  /*
  Multer:
  ảnh vượt quá giới hạn 10MB
  */

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "Ảnh quá lớn. Dung lượng tối đa là 10MB.",
    });
  }

  /*
  Các lỗi khác
  */

  return res.status(500).json({
    success: false,
    message: err.message || "Có lỗi xảy ra trên server.",
  });
});

/*
====================================================
START SERVER
====================================================
*/

const PORT = process.env.PORT || 5001;

pool
  .connect()
  .then((client) => {
    console.log("Kết nối PostgreSQL thành công");

    client.release();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server chạy tại http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Không thể kết nối PostgreSQL:", error);
  });
