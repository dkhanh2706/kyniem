const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/auth.middleware");

const {
  createPost,
  getPosts,
  deletePost,
} = require("../controllers/post.controller");

/*
GET tất cả bài đăng
*/

router.get("/", verifyToken, getPosts);

/*
Tạo bài đăng
*/

router.post("/", verifyToken, createPost);

/*
Xóa bài đăng
*/

router.delete("/:id", verifyToken, deletePost);

module.exports = router;
