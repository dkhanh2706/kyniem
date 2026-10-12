const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/auth.middleware");

const upload = require("../middleware/upload.middleware");

const {
  updateAvatar,
  updateProfile,
} = require("../controllers/user.controller");

/*
====================================================
ĐỔI AVATAR
PUT /api/users/avatar
====================================================
*/

router.put("/avatar", verifyToken, upload.single("avatar"), updateAvatar);

/*
====================================================
ĐỔI TÊN HIỂN THỊ
PUT /api/users/profile
====================================================
*/

router.put("/profile", verifyToken, updateProfile);

module.exports = router;
