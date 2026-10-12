import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, User, AtSign, Save, CheckCircle2, Loader2, Sparkles } from "lucide-react";

import "../styles/Profile.css";

function Profile() {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  const [user, setUser] = useState(() => {
    return JSON.parse(localStorage.getItem("user") || "null");
  });

  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || "");
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [toast, setToast] = useState("");

  /*
  ===========================================
  THÔNG BÁO NHỎ
  ===========================================
  */
  const showToast = (message) => {
    setToast(message);
  };

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast("");
    }, 2800);

    return () => {
      clearTimeout(timer);
    };
  }, [toast]);

  /*
  ===========================================
  CHỌN ẢNH
  → TỰ ĐỘNG UPLOAD LUÔN
  ===========================================
  */
  const handleAvatarSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Vui lòng chọn file hình ảnh hợp lệ.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast("Ảnh tối đa dung lượng 10MB.");
      return;
    }

    if (!token) {
      navigate("/");
      return;
    }

    const temporaryPreview = URL.createObjectURL(file);
    const previousAvatar = avatarPreview;
    setAvatarPreview(temporaryPreview);

    try {
      setSavingAvatar(true);

      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("http://localhost:5001/api/users/avatar", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Không thể cập nhật ảnh đại diện.");
      }

      const updatedUser = {
        ...user,
        ...data.user,
      };

      setUser(updatedUser);
      setAvatarPreview(updatedUser.avatar_url);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      URL.revokeObjectURL(temporaryPreview);

      showToast("Đã cập nhật ảnh đại diện mới thành công!");
    } catch (err) {
      console.error("update avatar error:", err);
      setAvatarPreview(previousAvatar);
      URL.revokeObjectURL(temporaryPreview);
      showToast(err.message || "Không thể cập nhật ảnh đại diện.");
    } finally {
      setSavingAvatar(false);
    }
  };

  /*
  ===========================================
  CẬP NHẬT TÊN
  ===========================================
  */
  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      showToast("Tên hiển thị không được để trống.");
      return;
    }

    if (!token) {
      navigate("/");
      return;
    }

    try {
      setSavingProfile(true);

      const response = await fetch("http://localhost:5001/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          display_name: displayName.trim(),
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Không thể cập nhật thông tin.");
      }

      const updatedUser = {
        ...user,
        ...data.user,
      };

      setUser(updatedUser);
      setDisplayName(updatedUser.display_name);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      showToast("Đã lưu thông tin cá nhân thành công!");
    } catch (err) {
      console.error("save profile error:", err);
      showToast(err.message || "Không thể cập nhật thông tin.");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="profile-page">
      {/* Toast popup */}
      {toast && (
        <div className="profile-toast">
          <CheckCircle2 size={18} className="toast-icon" />
          <span>{toast}</span>
        </div>
      )}

      <div className="profile-container">
        {/* Top bar with back button */}
        <div className="profile-top-bar">
          <button
            type="button"
            className="profile-back-link"
            onClick={() => navigate("/home")}
            title="Quay lại dòng thời gian"
          >
            <ArrowLeft size={16} />
            <span>Dòng thời gian</span>
          </button>

          <h1 className="profile-heading">Trang Cá Nhân</h1>

          <div style={{ width: 100 }} /> {/* Spacer */}
        </div>

        {/* Profile Card */}
        <div className="profile-card">
          {/* Banner cover */}
          <div className="profile-cover" />

          {/* Avatar Section */}
          <div className="profile-avatar-wrapper">
            <label className="profile-avatar-container">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" />
              ) : (
                user?.display_name?.charAt(0)?.toUpperCase() ||
                user?.username?.charAt(0)?.toUpperCase() ||
                "?"
              )}

              {/* Hover overlay to prompt upload */}
              {!savingAvatar && (
                <div className="avatar-hover-overlay">
                  <Camera size={22} />
                  <span>Đổi ảnh</span>
                </div>
              )}

              {/* Loading spinner overlay */}
              {savingAvatar && (
                <div className="avatar-loading-overlay">
                  <Loader2 size={24} className="spinner" />
                  <span>Đang tải...</span>
                </div>
              )}

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                disabled={savingAvatar}
                onChange={handleAvatarSelect}
              />
            </label>

            <label
              className={`change-avatar-label-btn ${
                savingAvatar ? "disabled" : ""
              }`}
            >
              <Camera size={15} />
              <span>{savingAvatar ? "Đang cập nhật ảnh..." : "Thay đổi ảnh đại diện"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                disabled={savingAvatar}
                onChange={handleAvatarSelect}
              />
            </label>

            <span className="avatar-hint-text">
              Hỗ trợ JPG, PNG, WEBP. Ảnh cập nhật tự động ngay khi chọn.
            </span>
          </div>

          {/* Form details */}
          <div className="profile-body">
            <div className="profile-field-group">
              <label className="profile-field-label">
                <User size={15} />
                <span>Tên hiển thị</span>
              </label>
              <div className="profile-input-wrapper">
                <User size={17} className="profile-input-icon" />
                <input
                  type="text"
                  className="profile-field-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={50}
                  placeholder="Nhập tên hiển thị bạn muốn"
                />
              </div>
            </div>

            <div className="profile-field-group">
              <label className="profile-field-label">
                <AtSign size={15} />
                <span>Tên tài khoản (cố định)</span>
              </label>
              <div className="profile-input-wrapper">
                <AtSign size={17} className="profile-input-icon" />
                <input
                  type="text"
                  className="profile-field-input"
                  value={user?.username || ""}
                  disabled
                />
              </div>
            </div>

            <div className="profile-footer-actions">
              <button
                type="button"
                className="profile-save-btn"
                onClick={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <>
                    <Loader2 size={17} className="spinner" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Lưu thay đổi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
