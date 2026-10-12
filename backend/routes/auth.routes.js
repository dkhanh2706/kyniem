const express = require("express");

const router = express.Router();

const {
  checkUser,
  verifyActivation,
  createPassword,
  login,
} = require("../controllers/auth.controller");

router.post("/check-user", checkUser);
router.post("/verify-activation", verifyActivation);
router.post("/create-password", createPassword);
router.post("/login", login);

module.exports = router;
