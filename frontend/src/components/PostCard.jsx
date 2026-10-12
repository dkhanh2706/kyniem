import { useState } from "react";
import { Heart, Trash2, Calendar, Maximize2, X, AlertTriangle } from "lucide-react";

function PostCard({ post, currentUser, onDelete }) {
  const [showLightbox, setShowLightbox] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLiked, setIsLiked] = useState(() => {
    return localStorage.getItem(`post_liked_${post.id}`) === "true";
  });
  const [likeCount, setLikeCount] = useState(() => {
    const saved = localStorage.getItem(`post_liked_${post.id}`) === "true";
    return saved ? 1 : 0;
  });

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isOwner = Number(currentUser?.id) === Number(post.user_id);

  const handleToggleLike = () => {
    setIsLiked((prev) => {
      const next = !prev;
      localStorage.setItem(`post_liked_${post.id}`, next ? "true" : "false");
      setLikeCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
      return next;
    });
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete(post.id);
  };

  return (
    <>
      <article className="post-card">
        {/* Card Header */}
        <div className="post-header">
          <div className="post-user-info">
            <div className="post-avatar">
              {post.avatar_url ? (
                <img src={post.avatar_url} alt="Avatar" />
              ) : (
                post.display_name?.charAt(0)?.toUpperCase() ||
                post.username?.charAt(0)?.toUpperCase() ||
                "?"
              )}
            </div>

            <div className="post-meta">
              <h3 className="post-author-name">{post.display_name || post.username}</h3>
              <span className="post-time">
                <Calendar size={12} />
                {formatDate(post.created_at)}
              </span>
            </div>
          </div>

          {isOwner && (
            <button
              type="button"
              className="delete-post-btn"
              onClick={() => setShowDeleteConfirm(true)}
              title="Xóa kỷ niệm này"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {/* Content text */}
        {post.content && <p className="post-content">{post.content}</p>}

        {/* Image wrapper */}
        {post.image_url && (
          <div
            className="post-image-wrapper"
            onClick={() => setShowLightbox(true)}
            title="Nhấp để xem kích thước đầy đủ"
          >
            <img
              src={post.image_url}
              alt="Kỷ niệm"
              className="post-image"
              loading="lazy"
            />
            <div className="image-zoom-overlay">
              <Maximize2 size={13} />
              <span>Xem ảnh</span>
            </div>
          </div>
        )}

        {/* Card Footer */}
        <div className="post-footer">
          <button
            type="button"
            className={`like-btn ${isLiked ? "liked" : ""}`}
            onClick={handleToggleLike}
          >
            <Heart size={15} fill={isLiked ? "currentColor" : "none"} />
            <span>{isLiked ? "Đã yêu thích" : "Yêu thích"}</span>
            {likeCount > 0 && <span style={{ opacity: 0.85 }}>({likeCount})</span>}
          </button>
        </div>
      </article>

      {/* Lightbox Modal */}
      {showLightbox && (
        <div className="modal-overlay" onClick={() => setShowLightbox(false)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="lightbox-close-btn"
              onClick={() => setShowLightbox(false)}
              title="Đóng (Esc)"
            >
              <X size={22} />
            </button>
            <img src={post.image_url} alt="Kỷ niệm lớn" className="lightbox-img" />
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="confirm-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon-wrap">
              <AlertTriangle size={26} />
            </div>
            <h3>Xác nhận xóa kỷ niệm</h3>
            <p>
              Bạn có chắc chắn muốn xóa bài viết này không? Hành động này sẽ không thể hoàn tác.
            </p>
            <div className="confirm-actions">
              <button
                type="button"
                className="confirm-cancel-btn"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="confirm-delete-btn"
                onClick={handleConfirmDelete}
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PostCard;
