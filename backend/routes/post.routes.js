const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/auth.middleware");

const {
  createPost,
  getPosts,
  deletePost,
  toggleReaction,
  getReactions,
  getComments,
  createComment,
  deleteComment,
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

/*
=============================
CẢM XÚC (REACTIONS)
=============================
*/
router.post("/:id/reactions", verifyToken, toggleReaction);
router.get("/:id/reactions", verifyToken, getReactions);

/*
=============================
BÌNH LUẬN (COMMENTS)
=============================
*/
router.get("/:id/comments", verifyToken, getComments);
router.post("/:id/comments", verifyToken, createComment);
router.delete("/:id/comments/:commentId", verifyToken, deleteComment);

module.exports = router;
