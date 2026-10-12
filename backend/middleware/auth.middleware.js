const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  try {
    /*
    ====================================================
    LẤY HEADER AUTHORIZATION
    ====================================================

    Frontend gửi:

    Authorization: Bearer eyJhbGciOi...
    */

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Bạn chưa đăng nhập.",
      });
    }

    /*
    ====================================================
    KIỂM TRA ĐÚNG ĐỊNH DẠNG BEARER TOKEN
    ====================================================
    */

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Token không đúng định dạng.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Không tìm thấy token đăng nhập.",
      });
    }

    /*
    ====================================================
    KIỂM TRA JWT
    ====================================================
    */

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    /*
    Token của bạn hiện chứa:

    {
      id,
      username,
      role
    }

    Gắn vào req.user để controller phía sau dùng.
    */

    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error("verifyToken error:", error);

    /*
    ====================================================
    TOKEN HẾT HẠN
    ====================================================
    */

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      });
    }

    /*
    ====================================================
    TOKEN SAI / BỊ SỬA
    ====================================================
    */

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Token đăng nhập không hợp lệ.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Không thể xác thực tài khoản.",
    });
  }
};

module.exports = verifyToken;
