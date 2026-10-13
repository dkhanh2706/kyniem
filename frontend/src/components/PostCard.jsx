import { useState, useRef, useEffect } from "react";
import {
  Heart,
  MessageCircle,
  Trash2,
  Calendar,
  Maximize2,
  X,
  AlertTriangle,
  Send,
  Loader2,
  CornerDownRight,
} from "lucide-react";

const REACTION_CONFIG = {
  heart: { emoji: "❤️", label: "Yêu thích", className: "active-heart" },
  care: { emoji: "🥰", label: "Thương thương", className: "active-care" },
  laugh: { emoji: "😂", label: "Haha", className: "active-laugh" },
  touched: { emoji: "🥺", label: "Xúc động", className: "active-touched" },
  sparkle: { emoji: "✨", label: "Tuyệt vời", className: "active-sparkle" },
  wow: { emoji: "😮", label: "Wow", className: "active-wow" },
};

const QUICK_COMMENT_EMOJIS = ["❤️", "🥰", "🌸", "✨", "🥺", "☕"];

function PostCard({ post, currentUser, onDelete }) {
  const token = localStorage.getItem("token");

  // Lightbox & Delete Post Confirm
  const [showLightbox, setShowLightbox] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reactions state
  const [userReaction, setUserReaction] = useState(post.user_reaction || null);
  const [reactionsCount, setReactionsCount] = useState(Number(post.reactions_count) || 0);
  const [reactionTypes, setReactionTypes] = useState(post.reaction_types || []);
  const [showDock, setShowDock] = useState(false);
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [reactionsList, setReactionsList] = useState([]);
  const [loadingReactions, setLoadingReactions] = useState(false);
  const dockTimeoutRef = useRef(null);

  // Comments state (ALWAYS VISIBLE)
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [mainCommentText, setMainCommentText] = useState("");
  const [submittingMain, setSubmittingMain] = useState(false);

  // Reply state
  // replyingTo: { commentId: rootCommentId, authorName: string } | null
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const replyInputRef = useRef(null);

  const isPostOwner = Number(currentUser?.id) === Number(post.user_id);

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

  /*
  ===========================================
  TỰ ĐỘNG TẢI BÌNH LUẬN KHI HIỂN THỊ
  ===========================================
  */
  useEffect(() => {
    let isMounted = true;

    const fetchComments = async () => {
      if (!token) {
        setLoadingComments(false);
        return;
      }

      try {
        setLoadingComments(true);
        const response = await fetch(
          `http://localhost:5001/api/posts/${post.id}/comments`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();

        if (isMounted && response.ok) {
          setComments(Array.isArray(data.comments) ? data.comments : []);
        }
      } catch (err) {
        console.error("fetchComments error:", err);
      } finally {
        if (isMounted) {
          setLoadingComments(false);
        }
      }
    };

    fetchComments();

    return () => {
      isMounted = false;
    };
  }, [post.id, token]);

  /*
  ===========================================
  XỬ LÝ CẢM XÚC (REACTIONS)
  ===========================================
  */
  const handleToggleReaction = async (type = "heart") => {
    setShowDock(false);

    if (!token) {
      alert("Vui lòng đăng nhập để bày tỏ cảm xúc.");
      return;
    }

    const previousReaction = userReaction;
    const previousCount = reactionsCount;

    let nextReaction = type;
    let nextCount = reactionsCount;

    if (previousReaction === type) {
      nextReaction = null;
      nextCount = Math.max(0, reactionsCount - 1);
    } else if (!previousReaction) {
      nextCount = reactionsCount + 1;
    }

    setUserReaction(nextReaction);
    setReactionsCount(nextCount);

    try {
      const response = await fetch(
        `http://localhost:5001/api/posts/${post.id}/reactions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reaction_type: type }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Không thể bày tỏ cảm xúc.");
      }

      setUserReaction(data.user_reaction);
      setReactionsCount(data.reactions_count);
      setReactionTypes(data.reaction_types || []);
    } catch (err) {
      console.error("toggleReaction error:", err);
      setUserReaction(previousReaction);
      setReactionsCount(previousCount);
    }
  };

  const handleMouseEnterButton = () => {
    clearTimeout(dockTimeoutRef.current);
    setShowDock(true);
  };

  const handleMouseLeaveButton = () => {
    dockTimeoutRef.current = setTimeout(() => {
      setShowDock(false);
    }, 450);
  };

  const handleOpenReactionsModal = async () => {
    if (reactionsCount === 0) return;
    setShowReactionsModal(true);
    setLoadingReactions(true);

    try {
      const response = await fetch(
        `http://localhost:5001/api/posts/${post.id}/reactions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await response.json();
      if (response.ok) {
        setReactionsList(data.reactions || []);
      }
    } catch (err) {
      console.error("getReactions error:", err);
    } finally {
      setLoadingReactions(false);
    }
  };

  /*
  ===========================================
  GỬI BÌNH LUẬN CHÍNH (MAIN COMMENT)
  ===========================================
  */
  const handleSendMainComment = async (e) => {
    if (e) e.preventDefault();
    if (!mainCommentText.trim() || submittingMain) return;

    if (!token) {
      alert("Vui lòng đăng nhập để bình luận.");
      return;
    }

    try {
      setSubmittingMain(true);
      const response = await fetch(
        `http://localhost:5001/api/posts/${post.id}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: mainCommentText.trim(),
            parent_id: null,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Không thể gửi bình luận.");
      }

      setComments((prev) => [...prev, data.comment]);
      setMainCommentText("");
    } catch (err) {
      console.error("sendMainComment error:", err);
      alert(err.message || "Không thể gửi bình luận.");
    } finally {
      setSubmittingMain(false);
    }
  };

  /*
  ===========================================
  TRẢ LỜI BÌNH LUẬN (REPLY)
  ===========================================
  */
  const handleStartReply = (targetComment, rootCommentId) => {
    const authorName = targetComment.display_name || targetComment.username || "bạn";
    setReplyingTo({
      commentId: rootCommentId,
      authorName,
      targetUserId: targetComment.user_id,
    });
    setReplyText(`@${authorName} `);
    setTimeout(() => {
      if (replyInputRef.current) {
        replyInputRef.current.focus();
      }
    }, 80);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setReplyText("");
  };

  const handleSendReply = async (e) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || submittingReply || !replyingTo) return;

    if (!token) {
      alert("Vui lòng đăng nhập để trả lời.");
      return;
    }

    try {
      setSubmittingReply(true);
      const response = await fetch(
        `http://localhost:5001/api/posts/${post.id}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: replyText.trim(),
            parent_id: replyingTo.commentId,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Không thể gửi câu trả lời.");
      }

      setComments((prev) => [...prev, data.comment]);
      setReplyingTo(null);
      setReplyText("");
    } catch (err) {
      console.error("sendReply error:", err);
      alert(err.message || "Không thể gửi câu trả lời.");
    } finally {
      setSubmittingReply(false);
    }
  };

  /*
  ===========================================
  XÓA BÌNH LUẬN HOẶC TRẢ LỜI
  ===========================================
  */
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Bạn có muốn xóa bình luận này?")) return;

    try {
      const response = await fetch(
        `http://localhost:5001/api/posts/${post.id}/comments/${commentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Không thể xóa bình luận.");
      }

      // Xóa bình luận đó và các reply của nó nếu có
      setComments((prev) =>
        prev.filter((c) => c.id !== commentId && c.parent_id !== commentId),
      );
    } catch (err) {
      console.error("deleteComment error:", err);
      alert(err.message || "Không thể xóa bình luận.");
    }
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete(post.id);
  };

  const activeReactionData = userReaction ? REACTION_CONFIG[userReaction] : null;

  // Lọc các bình luận gốc (top-level) và các câu trả lời
  const rootComments = comments.filter((c) => !c.parent_id);

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

          {isPostOwner && (
            <button
              type="button"
              className="delete-post-btn"
              onClick={() => setShowDeleteConfirm(true)}
              title="Xóa bài viết này"
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

        {/* Footer: Reactions Row */}
        <div className="post-footer">
          {/* Reactions summary stat */}
          {reactionsCount > 0 && (
            <div className="post-stats-row">
              <div
                className="reactions-count-pill"
                onClick={handleOpenReactionsModal}
                title="Xem người đã bày tỏ cảm xúc"
              >
                <span className="reaction-icons-stack">
                  {reactionTypes && reactionTypes.length > 0
                    ? reactionTypes.slice(0, 3).map((r) => REACTION_CONFIG[r]?.emoji || "❤️").join("")
                    : "❤️"}
                </span>
                <span>{reactionsCount}</span>
              </div>
            </div>
          )}

          {/* Action button: Reaction button & Floating Dock */}
          <div className="post-actions-row">
            <div
              className="reaction-wrapper"
              onMouseEnter={handleMouseEnterButton}
              onMouseLeave={handleMouseLeaveButton}
            >
              <button
                type="button"
                className={`reaction-trigger-btn ${
                  activeReactionData ? activeReactionData.className : ""
                }`}
                onClick={() => handleToggleReaction(userReaction ? userReaction : "heart")}
              >
                {activeReactionData ? (
                  <>
                    <span style={{ fontSize: "16px" }}>{activeReactionData.emoji}</span>
                    <span>{activeReactionData.label}</span>
                  </>
                ) : (
                  <>
                    <Heart size={16} />
                    <span>Cảm xúc</span>
                  </>
                )}
              </button>

              {/* Floating Dock */}
              {showDock && (
                <div className="reactions-dock" onMouseEnter={handleMouseEnterButton}>
                  {Object.entries(REACTION_CONFIG).map(([key, item]) => (
                    <button
                      key={key}
                      type="button"
                      className="reaction-emoji-btn"
                      onClick={() => handleToggleReaction(key)}
                      title={item.label}
                    >
                      {item.emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ fontSize: "13px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
              <MessageCircle size={15} />
              <span>{comments.length} bình luận</span>
            </div>
          </div>

          {/* ====================================================
              PHẦN BÌNH LUẬN & TRẢ LỜI (LUÔN HIỂN THỊ CỐ ĐỊNH)
              ==================================================== */}
          <div className="post-comments-container">
            {/* Danh sách bình luận */}
            {loadingComments ? (
              <div style={{ padding: "10px 0", color: "var(--text-muted)", fontSize: "13px" }}>
                <Loader2 size={16} className="spinner spinner-primary" style={{ display: "inline-block", marginRight: "6px", verticalAlign: "middle" }} />
                <span>Đang tải bình luận...</span>
              </div>
            ) : rootComments.length === 0 ? (
              <p className="empty-comments-message">
                Chưa có bình luận nào. Hãy để lại vài dòng cảm nghĩ dưới đây nhé! 💕
              </p>
            ) : (
              <div className="comments-list">
                {rootComments.map((rootComment) => {
                  const isRootAuthor = Number(currentUser?.id) === Number(rootComment.user_id);
                  const canDeleteRoot = isRootAuthor || isPostOwner;

                  // Lấy các câu trả lời trực thuộc bình luận gốc này
                  const replies = comments.filter((c) => c.parent_id === rootComment.id);
                  const isReplyingThisThread = replyingTo?.commentId === rootComment.id;

                  return (
                    <div key={rootComment.id} className="comment-thread">
                      {/* Bình luận gốc */}
                      <div className="comment-item">
                        <div className="comment-user-avatar">
                          {rootComment.avatar_url ? (
                            <img src={rootComment.avatar_url} alt="Avatar" />
                          ) : (
                            rootComment.display_name?.charAt(0)?.toUpperCase() ||
                            rootComment.username?.charAt(0)?.toUpperCase() ||
                            "?"
                          )}
                        </div>

                        <div className="comment-content-bubble">
                          <div className="comment-header">
                            <span className="comment-author-name">
                              {rootComment.display_name || rootComment.username}
                            </span>
                            <span className="comment-created-time">
                              {formatDate(rootComment.created_at)}
                            </span>
                          </div>

                          <p className="comment-body-text">{rootComment.content}</p>
                        </div>
                      </div>

                      {/* Nút Trả Lời & Xóa cho bình luận gốc */}
                      <div className="comment-actions-bar">
                        <button
                          type="button"
                          className="comment-reply-btn"
                          onClick={() => handleStartReply(rootComment, rootComment.id)}
                        >
                          <CornerDownRight size={13} />
                          <span>Trả lời</span>
                        </button>

                        {canDeleteRoot && (
                          <button
                            type="button"
                            className="comment-delete-link-btn"
                            onClick={() => handleDeleteComment(rootComment.id)}
                          >
                            Xóa
                          </button>
                        )}
                      </div>

                      {/* Danh sách các câu trả lời (Replies lồng nhau) */}
                      {replies.length > 0 && (
                        <div className="comment-replies-list">
                          {replies.map((reply) => {
                            const isReplyAuthor = Number(currentUser?.id) === Number(reply.user_id);
                            const canDeleteReply = isReplyAuthor || isPostOwner;

                            return (
                              <div key={reply.id}>
                                <div className="reply-item">
                                  <div className="reply-user-avatar">
                                    {reply.avatar_url ? (
                                      <img src={reply.avatar_url} alt="Avatar" />
                                    ) : (
                                      reply.display_name?.charAt(0)?.toUpperCase() ||
                                      reply.username?.charAt(0)?.toUpperCase() ||
                                      "?"
                                    )}
                                  </div>

                                  <div className="reply-content-bubble">
                                    <div className="comment-header">
                                      <span className="comment-author-name">
                                        {reply.display_name || reply.username}
                                      </span>
                                      <span className="comment-created-time">
                                        {formatDate(reply.created_at)}
                                      </span>
                                    </div>

                                    <p className="comment-body-text">{reply.content}</p>
                                  </div>
                                </div>

                                <div className="reply-actions-bar">
                                  <button
                                    type="button"
                                    className="comment-reply-btn"
                                    onClick={() => handleStartReply(reply, rootComment.id)}
                                  >
                                    <CornerDownRight size={12} />
                                    <span>Trả lời</span>
                                  </button>

                                  {canDeleteReply && (
                                    <button
                                      type="button"
                                      className="comment-delete-link-btn"
                                      onClick={() => handleDeleteComment(reply.id)}
                                    >
                                      Xóa
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Khung nhập câu trả lời trực tiếp dưới bình luận */}
                      {isReplyingThisThread && (
                        <div className="inline-reply-composer">
                          <div className="replying-badge">
                            <span>Đang trả lời @{replyingTo.authorName}</span>
                            <button
                              type="button"
                              className="cancel-reply-btn"
                              onClick={handleCancelReply}
                              title="Hủy trả lời"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          <form onSubmit={handleSendReply} className="comment-input-wrapper">
                            <input
                              ref={replyInputRef}
                              type="text"
                              className="comment-text-input"
                              placeholder={`Trả lời @${replyingTo.authorName}...`}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              disabled={submittingReply}
                            />
                            <button
                              type="submit"
                              className="comment-send-icon-btn"
                              disabled={submittingReply || !replyText.trim()}
                              title="Gửi câu trả lời"
                            >
                              {submittingReply ? (
                                <Loader2 size={14} className="spinner" />
                              ) : (
                                <Send size={14} />
                              )}
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Ô VIẾT BÌNH LUẬN CHÍNH Ở BÀI VIẾT (LUÔN Ở ĐÓ, MUỐN THÊM THÌ VIẾT TIẾP) */}
            <form className="main-comment-composer" onSubmit={handleSendMainComment}>
              <div className="comment-composer-avatar">
                {currentUser?.avatar_url ? (
                  <img src={currentUser.avatar_url} alt="Avatar" />
                ) : (
                  currentUser?.display_name?.charAt(0)?.toUpperCase() ||
                  currentUser?.username?.charAt(0)?.toUpperCase() ||
                  "?"
                )}
              </div>

              <div className="comment-input-box">
                <div className="comment-input-wrapper">
                  <input
                    type="text"
                    className="comment-text-input"
                    placeholder="Viết bình luận cho kỷ niệm này..."
                    value={mainCommentText}
                    onChange={(e) => setMainCommentText(e.target.value)}
                    disabled={submittingMain}
                  />
                  <button
                    type="submit"
                    className="comment-send-icon-btn"
                    disabled={submittingMain || !mainCommentText.trim()}
                    title="Gửi bình luận"
                  >
                    {submittingMain ? (
                      <Loader2 size={15} className="spinner" />
                    ) : (
                      <Send size={15} />
                    )}
                  </button>
                </div>

                {/* Quick emoji chips */}
                <div className="comment-quick-emojis">
                  {QUICK_COMMENT_EMOJIS.map((emoji) => (
                    <span
                      key={emoji}
                      className="quick-emoji-chip"
                      onClick={() => setMainCommentText((prev) => prev + emoji)}
                      title={`Thêm ${emoji}`}
                    >
                      {emoji}
                    </span>
                  ))}
                </div>
              </div>
            </form>
          </div>
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

      {/* Confirm Delete Post Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="confirm-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon-wrap">
              <AlertTriangle size={26} />
            </div>
            <h3>Xác nhận xóa bài viết</h3>
            <p>
              Bạn có chắc chắn muốn xóa bài viết này không? Toàn bộ ảnh, cảm xúc và bình luận sẽ bị xóa vĩnh viễn.
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

      {/* Reactions Details Modal */}
      {showReactionsModal && (
        <div className="modal-overlay" onClick={() => setShowReactionsModal(false)}>
          <div className="reactions-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="reactions-modal-header">
              <h3>Người đã bày tỏ cảm xúc ({reactionsCount})</h3>
              <button
                type="button"
                className="delete-post-btn"
                onClick={() => setShowReactionsModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            {loadingReactions ? (
              <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>
                <Loader2 size={20} className="spinner spinner-primary" />
              </div>
            ) : (
              <div className="reactions-user-list">
                {reactionsList.map((r) => (
                  <div key={r.id} className="reaction-user-item">
                    <div className="reaction-user-left">
                      <div className="reaction-user-avatar">
                        {r.avatar_url ? (
                          <img src={r.avatar_url} alt="Avatar" />
                        ) : (
                          r.display_name?.charAt(0)?.toUpperCase() ||
                          r.username?.charAt(0)?.toUpperCase() ||
                          "?"
                        )}
                      </div>
                      <span className="reaction-user-name">
                        {r.display_name || r.username}
                      </span>
                    </div>

                    <span className="reaction-user-emoji">
                      {REACTION_CONFIG[r.reaction_type]?.emoji || "❤️"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default PostCard;
