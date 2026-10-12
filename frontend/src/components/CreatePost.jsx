import { useEffect, useRef, useState } from "react";
import { Camera, Image as ImageIcon, Send, X, Loader2, Sparkles } from "lucide-react";

function CreatePost({ onPostCreated }) {
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user") || "null");

  const quickMoods = ["❤️ Yêu thương", "✨ Khoảnh khắc đẹp", "🌸 Hẹn hò", "☕ Bình yên", "✈️ Đi cùng nhau"];

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleSelectImage = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn file hình ảnh hợp lệ.");
      return;
    }

    // Backend đang giới hạn 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert("Ảnh tối đa dung lượng 10MB.");
      return;
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setImage(null);
    setPreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const addMood = (mood) => {
    setContent((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${mood} ` : `${mood} `;
    });
  };

  const handlePost = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      return;
    }

    if (!content.trim() && !image) {
      alert("Bạn hãy viết một chút kỷ niệm hoặc chọn ảnh nhé!");
      return;
    }

    try {
      setLoading(true);

      let imageUrl = null;
      let imagePublicId = null;

      /*
      ===========================================
      1. UPLOAD ẢNH LÊN CLOUDINARY
      ===========================================
      */
      if (image) {
        const formData = new FormData();
        formData.append("image", image);

        const uploadResponse = await fetch(
          "http://localhost:5001/api/upload/image",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          },
        );

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(uploadData.message || "Không thể upload ảnh.");
        }

        imageUrl = uploadData.image.url;
        imagePublicId = uploadData.image.public_id;
      }

      /*
      ===========================================
      2. LƯU BÀI ĐĂNG VÀO DATABASE
      ===========================================
      */
      const postResponse = await fetch("http://localhost:5001/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: content.trim(),
          image_url: imageUrl,
          image_public_id: imagePublicId,
        }),
      });

      const postData = await postResponse.json();

      if (!postResponse.ok) {
        throw new Error(postData.message || "Không thể đăng bài.");
      }

      /*
      ===========================================
      3. RESET FORM
      ===========================================
      */
      setContent("");

      if (preview) {
        URL.revokeObjectURL(preview);
      }

      setImage(null);
      setPreview("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (onPostCreated) {
        onPostCreated(postData.post);
      }
    } catch (error) {
      console.error("Lỗi đăng bài:", error);
      alert(error.message || "Đăng kỷ niệm không thành công.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="create-post">
      <div className="create-post-header">
        <div className="create-post-avatar">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Avatar" />
          ) : (
            user?.display_name?.charAt(0)?.toUpperCase() ||
            user?.username?.charAt(0)?.toUpperCase() ||
            "?"
          )}
        </div>

        <div className="create-post-user-info">
          <strong>{user?.display_name || user?.username || "Bạn"}</strong>
          <span>Lưu giữ một kỷ niệm hôm nay...</span>
        </div>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Hôm nay có điều gì đáng nhớ mà hai bạn muốn lưu giữ lại?"
        className="create-post-textarea"
        disabled={loading}
      />

      {/* Quick Mood Chips */}
      <div className="mood-chips-bar">
        {quickMoods.map((mood) => (
          <button
            key={mood}
            type="button"
            className="mood-chip"
            onClick={() => addMood(mood)}
            disabled={loading}
          >
            {mood}
          </button>
        ))}
      </div>

      {/* Image Preview */}
      {preview && (
        <div className="create-post-preview">
          <img src={preview} alt="Ảnh xem trước" />
          <button
            type="button"
            className="remove-image-btn"
            onClick={handleRemoveImage}
            disabled={loading}
            title="Xóa ảnh"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="create-post-bottom">
        <label className="add-image-btn">
          <Camera size={18} />
          <span>{image ? "Đổi ảnh khác" : "Thêm hình ảnh"}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            disabled={loading}
            onChange={handleSelectImage}
          />
        </label>

        <button
          type="button"
          className="submit-post-btn"
          onClick={handlePost}
          disabled={loading || (!content.trim() && !image)}
        >
          {loading ? (
            <>
              <Loader2 size={17} className="spinner" />
              <span>Đang lưu...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>Chia sẻ kỷ niệm</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
}

export default CreatePost;
