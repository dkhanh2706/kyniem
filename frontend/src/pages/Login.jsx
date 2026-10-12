import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Heart, User, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2, Sparkles, RefreshCw } from "lucide-react";

import "../styles/auth.css";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [userChecked, setUserChecked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // =========================
  // KIỂM TRA TÀI KHOẢN
  // =========================
  const checkUser = async () => {
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername) {
      setMessage("Vui lòng nhập tài khoản");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await axios.post(
        "http://localhost:5001/api/auth/check-user",
        {
          username: cleanUsername,
        },
      );

      // Nếu chưa từng tạo mật khẩu
      if (response.data.firstLogin) {
        localStorage.setItem("pendingUsername", cleanUsername);
        navigate("/create-password");
        return;
      }

      // Đã có mật khẩu
      setUserChecked(true);
    } catch (error) {
      console.error("checkUser error:", error);
      setMessage(
        error.response?.data?.message || "Không thể kiểm tra tài khoản",
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // ĐĂNG NHẬP
  // =========================
  const login = async () => {
    const cleanUsername = username.trim().toLowerCase();

    if (!password) {
      setMessage("Vui lòng nhập mật khẩu");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await axios.post(
        "http://localhost:5001/api/auth/login",
        {
          username: cleanUsername,
          password,
        },
      );

      // Lưu JWT
      localStorage.setItem("token", response.data.token);

      // Lưu thông tin user
      localStorage.setItem("user", JSON.stringify(response.data.user));

      // Xóa username đang chờ nếu có
      localStorage.removeItem("pendingUsername");

      // Vào trang chủ
      navigate("/home");
    } catch (error) {
      console.error("login error:", error);

      // Trường hợp backend phát hiện tài khoản chưa tạo mật khẩu
      if (error.response?.data?.firstLogin) {
        localStorage.setItem("pendingUsername", cleanUsername);
        navigate("/create-password");
        return;
      }

      setMessage(error.response?.data?.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // ĐỔI TÀI KHOẢN
  // =========================
  const changeUser = () => {
    setUserChecked(false);
    setPassword("");
    setShowPassword(false);
    setMessage("");
  };

  // =========================
  // NHẤN ENTER
  // =========================
  const handleKeyDown = (event) => {
    if (event.key !== "Enter" || loading) {
      return;
    }

    if (userChecked) {
      login();
    } else {
      checkUser();
    }
  };

  return (
    <div className="auth-page">
      {/* Decorative ambient background glows */}
      <div className="auth-bg-decor auth-decor-1" />
      <div className="auth-bg-decor auth-decor-2" />
      <div className="auth-bg-decor auth-decor-3" />

      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-badge">
            <Heart size={14} className="auth-badge-icon" fill="currentColor" />
            <span>Khoảnh Khắc Của Chúng Mình</span>
          </div>

          <h1 className="auth-title">Kỷ Niệm Yêu Thương</h1>

          <p className="auth-subtitle">
            Nơi cất giữ những khoảnh khắc dịu dàng và đáng nhớ nhất của hai chúng mình.
          </p>
        </div>

        {/* ======================
            USER VERIFIED PILL
        ====================== */}
        {userChecked && (
          <div className="auth-user-badge-box">
            <div className="auth-user-info">
              <div className="auth-user-avatar">
                {username.charAt(0).toUpperCase()}
              </div>
              <div className="auth-user-details">
                <span>Đang đăng nhập</span>
                <strong>{username}</strong>
              </div>
            </div>

            <button
              type="button"
              className="auth-switch-user-btn"
              onClick={changeUser}
              title="Đổi tài khoản khác"
            >
              <RefreshCw size={13} style={{ display: "inline", marginRight: "4px" }} />
              Đổi
            </button>
          </div>
        )}

        {/* ======================
            USERNAME (IF NOT CHECKED)
        ====================== */}
        {!userChecked && (
          <div className="auth-group">
            <label className="auth-label">Tài khoản</label>

            <div className="auth-input-wrap">
              <User size={18} className="auth-input-icon" />
              <input
                className="auth-input"
                type="text"
                placeholder="Nhập tên tài khoản của bạn"
                value={username}
                autoFocus
                autoComplete="username"
                onChange={(event) => {
                  setUsername(event.target.value);
                  if (message) setMessage("");
                }}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>
        )}

        {/* ======================
            PASSWORD (IF CHECKED)
        ====================== */}
        {userChecked && (
          <div className="auth-group">
            <label className="auth-label">Mật khẩu</label>

            <div className="auth-input-wrap">
              <Lock size={18} className="auth-input-icon" />
              <input
                className="auth-input has-eye"
                type={showPassword ? "text" : "password"}
                placeholder="Nhập mật khẩu của bạn"
                value={password}
                autoFocus
                autoComplete="current-password"
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (message) setMessage("");
                }}
                onKeyDown={handleKeyDown}
              />

              <button
                type="button"
                className="password-eye"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        )}

        {/* ======================
            MESSAGE
        ====================== */}
        {message && (
          <div className="auth-message error">
            <AlertCircle size={17} style={{ flexShrink: 0 }} />
            <span>{message}</span>
          </div>
        )}

        {/* ======================
            BUTTONS
        ====================== */}
        <div className="auth-actions">
          {!userChecked ? (
            <button
              type="button"
              className="auth-primary-btn"
              onClick={checkUser}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spinner" />
                  <span>Đang kiểm tra...</span>
                </>
              ) : (
                <>
                  <span>Tiếp tục</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="auth-primary-btn"
                onClick={login}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="spinner" />
                    <span>Đang đăng nhập...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={17} />
                    <span>Vào Không Gian Kỷ Niệm</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
