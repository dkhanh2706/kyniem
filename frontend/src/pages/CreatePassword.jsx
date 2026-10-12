import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Heart, KeyRound, Lock, Eye, EyeOff, Sparkles, AlertCircle, Loader2, User } from "lucide-react";

import "../styles/auth.css";

function CreatePassword() {
  const navigate = useNavigate();

  const username = localStorage.getItem("pendingUsername");

  const [activationCode, setActivationCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // =========================
  // KHÔNG CÓ USERNAME THÌ QUAY VỀ LOGIN
  // =========================
  useEffect(() => {
    if (!username) {
      navigate("/", {
        replace: true,
      });
    }
  }, [username, navigate]);

  // =========================
  // TẠO MẬT KHẨU
  // =========================
  const createPassword = async () => {
    const cleanActivationCode = activationCode.trim().toLowerCase();

    if (!cleanActivationCode) {
      setMessage("Vui lòng nhập mã kích hoạt");
      return;
    }

    if (!password) {
      setMessage("Vui lòng nhập mật khẩu mới");
      return;
    }

    if (password.length < 6) {
      setMessage("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    if (!confirmPassword) {
      setMessage("Vui lòng nhập lại mật khẩu");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Hai mật khẩu không khớp nhau");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await axios.post(
        "http://localhost:5001/api/auth/create-password",
        {
          username,
          activation_code: cleanActivationCode,
          password,
          confirmPassword,
        },
      );

      // Lưu token
      localStorage.setItem("token", response.data.token);

      // Lưu user
      localStorage.setItem("user", JSON.stringify(response.data.user));

      // Không cần username tạm nữa
      localStorage.removeItem("pendingUsername");

      // Tạo thành công -> Home
      navigate("/home", {
        replace: true,
      });
    } catch (error) {
      console.error("createPassword error:", error);
      setMessage(error.response?.data?.message || "Không thể tạo mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // ENTER
  // =========================
  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !loading) {
      createPassword();
    }
  };

  if (!username) {
    return null;
  }

  return (
    <div className="auth-page">
      {/* Background ambient orbs */}
      <div className="auth-bg-decor auth-decor-1" />
      <div className="auth-bg-decor auth-decor-2" />
      <div className="auth-bg-decor auth-decor-3" />

      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-badge">
            <Heart size={14} className="auth-badge-icon" fill="currentColor" />
            <span>Kích Hoạt Lần Đầu</span>
          </div>

          <h1 className="auth-title">Thiết Lập Mật Khẩu</h1>

          <p className="auth-subtitle">
            Khởi tạo mật khẩu riêng cho tài khoản để cùng nhau lưu giữ những kỷ niệm quý giá.
          </p>
        </div>

        {/* ======================
            USER BADGE
        ====================== */}
        <div className="auth-user-badge-box">
          <div className="auth-user-info">
            <div className="auth-user-avatar">
              <User size={18} />
            </div>
            <div className="auth-user-details">
              <span>Đang thiết lập cho tài khoản</span>
              <strong>{username}</strong>
            </div>
          </div>
        </div>

        {/* ======================
            ACTIVATION CODE
        ====================== */}
        <div className="auth-group">
          <label className="auth-label">Mã kích hoạt</label>
          <div className="auth-input-wrap">
            <KeyRound size={18} className="auth-input-icon" />
            <input
              className="auth-input"
              type="text"
              placeholder="Nhập mã bí mật được cấp"
              value={activationCode}
              autoFocus
              autoComplete="off"
              onChange={(event) => {
                setActivationCode(event.target.value);
                if (message) setMessage("");
              }}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>

        {/* ======================
            PASSWORD
        ====================== */}
        <div className="auth-group">
          <label className="auth-label">Mật khẩu mới (tối thiểu 6 ký tự)</label>
          <div className="auth-input-wrap">
            <Lock size={18} className="auth-input-icon" />
            <input
              className="auth-input has-eye"
              type={showPassword ? "text" : "password"}
              placeholder="Nhập mật khẩu mới"
              value={password}
              autoComplete="new-password"
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
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* ======================
            CONFIRM PASSWORD
        ====================== */}
        <div className="auth-group">
          <label className="auth-label">Xác nhận lại mật khẩu</label>
          <div className="auth-input-wrap">
            <Lock size={18} className="auth-input-icon" />
            <input
              className="auth-input has-eye"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Nhập lại mật khẩu vừa đặt"
              value={confirmPassword}
              autoComplete="new-password"
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                if (message) setMessage("");
              }}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              className="password-eye"
              aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              onClick={() => setShowConfirmPassword((prev) => !prev)}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

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
            SUBMIT BUTTON
        ====================== */}
        <div className="auth-actions">
          <button
            type="button"
            className="auth-primary-btn"
            onClick={createPassword}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spinner" />
                <span>Đang thiết lập...</span>
              </>
            ) : (
              <>
                <Sparkles size={17} />
                <span>Hoàn Tất & Khám Phá Ngay</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreatePassword;
