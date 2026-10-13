import { useCallback, useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  Plus,
  Image as ImageIcon,
  Trash2,
  FolderHeart,
  X,
} from "lucide-react";

import "../styles/album.css";

const API_URL = "http://localhost:5001";

function Album() {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
  });

  /*
  ====================================================
  LOAD ALBUM
  ====================================================
  */

  const fetchAlbums = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/albums`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/");
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Không thể tải danh sách album.");
      }

      setAlbums(Array.isArray(data.albums) ? data.albums : []);
    } catch (err) {
      console.error("fetchAlbums error:", err);

      setError(err.message || "Không thể tải album.");
    } finally {
      setLoading(false);
    }
  }, [navigate, token]);

  /*
  ====================================================
  LOAD LẦN ĐẦU
  ====================================================
  */

  useEffect(() => {
    if (!token) {
      navigate("/");
      return undefined;
    }

    const timer = setTimeout(() => {
      fetchAlbums();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [fetchAlbums, navigate, token]);

  /*
  ====================================================
  INPUT
  ====================================================
  */

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  /*
  ====================================================
  TẠO ALBUM
  ====================================================
  */

  const handleCreateAlbum = async (e) => {
    e.preventDefault();

    const title = form.title.trim();

    if (!title) {
      alert("Bạn hãy nhập tên album.");

      return;
    }

    try {
      setCreating(true);

      const response = await fetch(`${API_URL}/api/albums`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          title,

          description: form.description.trim(),
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
        throw new Error(data.message || "Không thể tạo album.");
      }

      setAlbums((current) => [
        {
          ...data.album,
          photo_count: 0,
        },
        ...current,
      ]);

      setForm({
        title: "",
        description: "",
      });

      setShowCreateModal(false);
    } catch (err) {
      console.error("createAlbum error:", err);

      alert(err.message || "Không thể tạo album.");
    } finally {
      setCreating(false);
    }
  };

  /*
  ====================================================
  XÓA ALBUM
  ====================================================
  */

  const handleDeleteAlbum = async (e, album) => {
    e.stopPropagation();

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa album "${album.title}"?\n\nTất cả ảnh trong album cũng sẽ bị xóa khỏi Cloudflare R2.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/albums/${album.id}`, {
        method: "DELETE",

        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/");
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Không thể xóa album.");
      }

      setAlbums((current) =>
        current.filter((item) => Number(item.id) !== Number(album.id)),
      );
    } catch (err) {
      console.error("deleteAlbum error:", err);

      alert(err.message || "Không thể xóa album.");
    }
  };

  /*
  ====================================================
  FORMAT DATE
  ====================================================
  */

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "";
    }

    const date = new Date(dateValue);

    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  /*
  ====================================================
  RENDER
  ====================================================
  */

  return (
    <div className="album-page">
      {/* HEADER */}

      <header className="album-header">
        <div className="album-header-inner">
          <button
            type="button"
            className="album-back-btn"
            onClick={() => navigate("/home")}
          >
            <ArrowLeft size={18} />

            <span>Trang chủ</span>
          </button>

          <div className="album-header-title">
            <FolderHeart size={22} />

            <span>Album Kỷ Niệm</span>
          </div>

          <button
            type="button"
            className="album-create-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={18} />

            <span>Tạo album</span>
          </button>
        </div>
      </header>

      {/* MAIN */}

      <main className="album-main">
        <section className="album-hero">
          <div>
            <span className="album-hero-badge">❤️ Góc nhỏ của chúng mình</span>

            <h1>Những khoảnh khắc đáng nhớ</h1>

            <p>
              Mỗi album là một câu chuyện, mỗi bức ảnh là một phần ký ức được
              lưu giữ theo thời gian.
            </p>
          </div>

          <div className="album-total-box">
            <strong>{albums.length}</strong>

            <span>album</span>
          </div>
        </section>

        {/* LOADING */}

        {loading && (
          <div className="album-loading-grid">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="album-skeleton" />
            ))}
          </div>
        )}

        {/* ERROR */}

        {!loading && error && (
          <div className="album-empty">
            <ImageIcon size={44} />

            <h3>Không thể tải album</h3>

            <p>{error}</p>

            <button type="button" onClick={fetchAlbums}>
              Thử lại
            </button>
          </div>
        )}

        {/* EMPTY */}

        {!loading && !error && albums.length === 0 && (
          <div className="album-empty">
            <div className="album-empty-icon">
              <ImageIcon size={42} />
            </div>

            <h3>Chưa có album nào</h3>

            <p>
              Hãy tạo album đầu tiên để bắt đầu lưu lại những bức ảnh đáng nhớ.
            </p>

            <button type="button" onClick={() => setShowCreateModal(true)}>
              <Plus size={17} />
              Tạo album đầu tiên
            </button>
          </div>
        )}

        {/* LIST */}

        {!loading && !error && albums.length > 0 && (
          <section className="album-grid">
            {albums.map((album) => (
              <article
                key={album.id}
                className="album-card"
                onClick={() => navigate(`/album/${album.id}`)}
              >
                <div className="album-cover">
                  {album.cover_url ? (
                    <img src={album.cover_url} alt={album.title} />
                  ) : (
                    <div className="album-cover-empty">
                      <ImageIcon size={42} />

                      <span>Chưa có ảnh</span>
                    </div>
                  )}

                  <div className="album-photo-count">
                    <ImageIcon size={14} />

                    <span>{Number(album.photo_count || 0)} ảnh</span>
                  </div>

                  <button
                    type="button"
                    className="album-delete-btn"
                    title="Xóa album"
                    onClick={(e) => handleDeleteAlbum(e, album)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="album-card-body">
                  <h2>{album.title}</h2>

                  {album.description ? (
                    <p>{album.description}</p>
                  ) : (
                    <p className="album-no-description">Chưa có mô tả</p>
                  )}

                  <div className="album-card-footer">
                    <span>{formatDate(album.created_at)}</span>

                    <span>Xem album →</span>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>

      {/* CREATE MODAL */}

      {showCreateModal && (
        <div
          className="album-modal-overlay"
          onMouseDown={() => setShowCreateModal(false)}
        >
          <div className="album-modal" onMouseDown={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="album-modal-close"
              onClick={() => setShowCreateModal(false)}
            >
              <X size={20} />
            </button>

            <div className="album-modal-icon">
              <FolderHeart size={27} />
            </div>

            <h2>Tạo Album Mới</h2>

            <p className="album-modal-subtitle">
              Tạo một nơi riêng cho những khoảnh khắc đáng nhớ.
            </p>

            <form onSubmit={handleCreateAlbum}>
              <div className="album-form-group">
                <label>Tên album</label>

                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleInputChange}
                  placeholder="Ví dụ: Đà Lạt 2026"
                  maxLength={255}
                  autoFocus
                />
              </div>

              <div className="album-form-group">
                <label>Mô tả</label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleInputChange}
                  placeholder="Một vài dòng về album này..."
                  rows={4}
                />
              </div>

              <div className="album-modal-actions">
                <button
                  type="button"
                  className="album-cancel-btn"
                  disabled={creating}
                  onClick={() => setShowCreateModal(false)}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="album-submit-btn"
                  disabled={creating}
                >
                  {creating ? (
                    "Đang tạo..."
                  ) : (
                    <>
                      <Plus size={17} />
                      Tạo album
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Album;
