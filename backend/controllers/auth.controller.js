const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

/*
====================================================
1. KIỂM TRA TÀI KHOẢN
====================================================
*/

exports.checkUser = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập tài khoản",
      });
    }

    const result = await pool.query(
      `
        SELECT
          id,
          username,
          display_name,
          password,
          is_first_login,
          role,
          avatar_url,
          avatar_path
        FROM users
        WHERE username = $1
      `,
      [username.trim().toLowerCase()],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tài khoản không tồn tại",
      });
    }

    const user = result.rows[0];

    return res.json({
      success: true,
      exists: true,
      username: user.username,
      display_name: user.display_name,
      firstLogin: user.is_first_login || !user.password,
    });
  } catch (error) {
    console.error("checkUser error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

/*
====================================================
2. KIỂM TRA MÃ KÍCH HOẠT
====================================================
*/

exports.verifyActivation = async (req, res) => {
  try {
    const { username, activation_code } = req.body;

    if (!username || !activation_code) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ thông tin",
      });
    }

    const result = await pool.query(
      `
        SELECT
          id,
          username,
          display_name,
          activation_code,
          is_first_login
        FROM users
        WHERE username = $1
      `,
      [username.trim().toLowerCase()],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tài khoản không tồn tại",
      });
    }

    const user = result.rows[0];

    if (!user.is_first_login) {
      return res.status(400).json({
        success: false,
        message: "Tài khoản này đã được kích hoạt",
      });
    }

    if (user.activation_code !== activation_code.trim()) {
      return res.status(400).json({
        success: false,
        message: "Mã kích hoạt không đúng",
      });
    }

    return res.json({
      success: true,
      message: "Mã kích hoạt chính xác",
    });
  } catch (error) {
    console.error("verifyActivation error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

/*
====================================================
3. TẠO MẬT KHẨU LẦN ĐẦU
====================================================
*/

exports.createPassword = async (req, res) => {
  try {
    const { username, activation_code, password, confirmPassword } = req.body;

    if (!username || !activation_code || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ thông tin",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu xác nhận không khớp",
      });
    }

    const result = await pool.query(
      `
        SELECT *
        FROM users
        WHERE username = $1
      `,
      [username.trim().toLowerCase()],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tài khoản không tồn tại",
      });
    }

    const user = result.rows[0];

    /*
    ============================================
    KIỂM TRA ĐÃ TẠO MẬT KHẨU CHƯA
    ============================================
    */

    if (!user.is_first_login || user.password) {
      return res.status(400).json({
        success: false,
        message: "Tài khoản đã có mật khẩu",
      });
    }

    /*
    ============================================
    KIỂM TRA MÃ KÍCH HOẠT
    ============================================
    */

    if (user.activation_code !== activation_code.trim()) {
      return res.status(400).json({
        success: false,
        message: "Mã kích hoạt không đúng",
      });
    }

    /*
    ============================================
    MÃ HÓA MẬT KHẨU
    ============================================
    */

    const hashedPassword = await bcrypt.hash(password, 10);

    /*
    ============================================
    CẬP NHẬT USER
    ============================================
    */

    const updateResult = await pool.query(
      `
        UPDATE users

        SET
          password = $1,
          is_first_login = FALSE,
          activation_code = NULL

        WHERE id = $2

        RETURNING
          id,
          username,
          display_name,
          role,
          avatar_url,
          avatar_path
      `,
      [hashedPassword, user.id],
    );

    const updatedUser = updateResult.rows[0];

    /*
    ============================================
    TẠO TOKEN
    GHI NHỚ ĐĂNG NHẬP 90 NGÀY
    ============================================
    */

    const token = jwt.sign(
      {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "90d",
      },
    );

    /*
    ============================================
    TRẢ KẾT QUẢ
    ============================================
    */

    return res.json({
      success: true,
      message: "Tạo mật khẩu thành công",

      token,

      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        display_name: updatedUser.display_name,
        role: updatedUser.role,
        avatar_url: updatedUser.avatar_url,
        avatar_path: updatedUser.avatar_path,
      },
    });
  } catch (error) {
    console.error("createPassword error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

/*
====================================================
4. ĐĂNG NHẬP
====================================================
*/

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    /*
    ============================================
    KIỂM TRA DỮ LIỆU
    ============================================
    */

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập tài khoản và mật khẩu",
      });
    }

    /*
    ============================================
    TÌM USER
    ============================================
    */

    const result = await pool.query(
      `
        SELECT
          id,
          username,
          display_name,
          password,
          is_first_login,
          role,
          avatar_url,
          avatar_path
        FROM users
        WHERE username = $1
      `,
      [username.trim().toLowerCase()],
    );

    /*
    ============================================
    USER KHÔNG TỒN TẠI
    ============================================
    */

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản hoặc mật khẩu không đúng",
      });
    }

    const user = result.rows[0];

    /*
    ============================================
    TÀI KHOẢN CHƯA TẠO MẬT KHẨU
    ============================================
    */

    if (user.is_first_login || !user.password) {
      return res.status(403).json({
        success: false,
        firstLogin: true,
        message: "Tài khoản chưa tạo mật khẩu",
      });
    }

    /*
    ============================================
    KIỂM TRA MẬT KHẨU
    ============================================
    */

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản hoặc mật khẩu không đúng",
      });
    }

    /*
    ============================================
    TẠO JWT
    GHI NHỚ ĐĂNG NHẬP 90 NGÀY
    ============================================
    */

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "90d",
      },
    );

    /*
    ============================================
    TRẢ USER VỀ FRONTEND

    Có:
    - id
    - username
    - display_name
    - role
    - avatar_url
    - avatar_path
    ============================================
    */

    return res.json({
      success: true,
      message: "Đăng nhập thành công",

      token,

      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        avatar_url: user.avatar_url,
        avatar_path: user.avatar_path,
      },
    });
  } catch (error) {
    console.error("login error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};
