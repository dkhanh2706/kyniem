import { useCallback, useEffect, useRef, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Upload,
  Trash2,
  Image as ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Star,
  FolderHeart,
} from "lucide-react";

import "../styles/album.css";

const API_URL = "http://localhost:5001";

function AlbumDetail() {
  const navigate = useNavigate();

  const { id } = useParams();

  const token = localStorage.getItem("token");

  const fileInputRef = useRef(null);

  const [album, setAlbum] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [uploading, setUploading] = useState(false);

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);

  /*
  ====================================================
  LOAD ALBUM
  ====================================================
  */

  const fetchAlbum = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/albums/${id}`, {
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
        throw new Error(data.message || "Không thể tải album.");
      }

      setAlbum(data.album);
    } catch (err) {
      console.error("fetchAlbum error:", err);

      setError(err.message || "Không thể tải album.");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, token]);

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
      fetchAlbum();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [fetchAlbum, navigate, token]);

  /*
  ====================================================
  CHỌN ẢNH
  ====================================================
  */

  const handleChooseImages = () => {
    fileInputRef.current?.click();
  };

  /*
  ====================================================
  UPLOAD ẢNH
  ====================================================
  */

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);

    e.target.value = "";

    if (files.length === 0) {
      return;
    }

    if (files.length > 30) {
      alert("Bạn chỉ được chọn tối đa 30 ảnh mỗi lần.");

      return;
    }

    const formData = new FormData();

    files.forEach((file) => {
      formData.append("images", file);
    });

    try {
      setUploading(true);

      const response = await fetch(`${API_URL}/api/albums/${id}/photos`, {
        method: "POST",

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
        throw new Error(data.message || "Không thể upload ảnh.");
      }

      await fetchAlbum();
    } catch (err) {
      console.error("uploadAlbumPhotos error:", err);

      alert(err.message || "Không thể upload ảnh.");
    } finally {
      setUploading(false);
    }
  };

  /*
  ====================================================
  XÓA ẢNH
  ====================================================
  */

  const handleDeletePhoto = async (e, photo) => {
    e.stopPropagation();

    const confirmed = window.confirm("Bạn có chắc muốn xóa ảnh này?");

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/albums/photos/${photo.id}`, {
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
        throw new Error(data.message || "Không thể xóa ảnh.");
      }

      setAlbum((current) => {
        if (!current) {
          return current;
        }

        const newPhotos = current.photos.filter(
          (item) => Number(item.id) !== Number(photo.id),
        );

        let newCover = current.cover_url;

        if (current.cover_url === photo.image_url) {
          newCover = newPhotos.length > 0 ? newPhotos[0].image_url : null;
        }

        return {
          ...current,

          cover_url: newCover,

          photos: newPhotos,
        };
      });

      setSelectedPhotoIndex(null);
    } catch (err) {
      console.error("deletePhoto error:", err);

      alert(err.message || "Không thể xóa ảnh.");
    }
  };

  /*
  ====================================================
  ĐẶT ẢNH BÌA
  ====================================================
  */

  const handleSetCover = async (e, photo) => {
    e.stopPropagation();

    try {
      const response = await fetch(
        `${API_URL}/api/albums/${id}/cover/${photo.id}`,
        {
          method: "PUT",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("token");

        localStorage.removeItem("user");

        navigate("/");

        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Không thể đặt ảnh bìa.");
      }

      setAlbum((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          cover_url: photo.image_url,
        };
      });
    } catch (err) {
      console.error("setCoverPhoto error:", err);

      alert(err.message || "Không thể đặt ảnh bìa.");
    }
  };

  /*
  ====================================================
  LIGHTBOX
  ====================================================
  */

  const photos = album?.photos || [];

  const selectedPhoto =
    selectedPhotoIndex !== null ? photos[selectedPhotoIndex] : null;

  const previousPhoto = () => {
    setSelectedPhotoIndex((current) => {
      if (current === null) {
        return null;
      }

      if (current === 0) {
        return photos.length - 1;
      }

      return current - 1;
    });
  };

  const nextPhoto = () => {
    setSelectedPhotoIndex((current) => {
      if (current === null) {
        return null;
      }

      if (current === photos.length - 1) {
        return 0;
      }

      return current + 1;
    });
  };

  /*
  ====================================================
  LOADING
  ====================================================
  */

  if (loading) {
    return (
      <div className="album-detail-status">
        <div className="album-detail-spinner" />

        <p>Đang tải album...</p>
      </div>
    );
  }

  /*
  ====================================================
  ERROR
  ====================================================
  */

  if (error || !album) {
    return (
      <div className="album-detail-status">
        <ImageIcon size={45} />

        <h2>Không thể mở album</h2>

        <p>{error}</p>

        <button type="button" onClick={() => navigate("/album")}>
          Quay lại
        </button>
      </div>
    );
  }

  /*
  ====================================================
  RENDER
  ====================================================
  */

  return (
    <div className="album-detail-page">
      {/* HEADER */}

      <header className="album-detail-header">
        <div className="album-detail-header-inner">
          <button
            type="button"
            className="album-back-btn"
            onClick={() => navigate("/album")}
          >
            <ArrowLeft size={18} />

            <span>Album</span>
          </button>

          <div className="album-detail-brand">
            <FolderHeart size={20} />

            <span>Kỷ Niệm Của Chúng Mình</span>
          </div>

          <button
            type="button"
            className="album-upload-btn"
            disabled={uploading}
            onClick={handleChooseImages}
          >
            <Upload size={17} />

            <span>{uploading ? "Đang tải..." : "Thêm ảnh"}</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            hidden
            onChange={handleUpload}
          />
        </div>
      </header>

      {/* MAIN */}

      <main className="album-detail-main">
        <section className="album-detail-hero">
          <div>
            <span className="album-detail-label">ALBUM KỶ NIỆM</span>

            <h1>{album.title}</h1>

            {album.description && <p>{album.description}</p>}
          </div>

          <div className="album-detail-count">
            <strong>{photos.length}</strong>

            <span>ảnh</span>
          </div>
        </section>

        {/* UPLOADING */}

        {uploading && (
          <div className="album-upload-progress">
            <div className="album-detail-spinner" />

            <div>
              <strong>Đang tải ảnh lên Cloudflare R2...</strong>

              <span>Vui lòng không đóng trang.</span>
            </div>
          </div>
        )}

        {/* EMPTY */}

        {!uploading && photos.length === 0 && (
          <div className="album-detail-empty">
            <div>
              <ImageIcon size={44} />
            </div>

            <h2>Album đang trống</h2>

            <p>Hãy thêm những bức ảnh đầu tiên vào album này.</p>

            <button type="button" onClick={handleChooseImages}>
              <Upload size={17} />
              Thêm ảnh
            </button>
          </div>
        )}

        {/* GALLERY */}

        {photos.length > 0 && (
          <section className="album-photo-grid">
            {photos.map((photo, index) => (
              <article
                key={photo.id}
                className="album-photo-card"
                onClick={() => setSelectedPhotoIndex(index)}
              >
                <img
                  src={photo.image_url}
                  alt={photo.caption || `Ảnh ${index + 1}`}
                  loading="lazy"
                />

                {album.cover_url === photo.image_url && (
                  <div className="album-cover-label">
                    <Star size={13} fill="currentColor" />
                    Ảnh bìa
                  </div>
                )}

                <div className="album-photo-actions">
                  <button
                    type="button"
                    title="Đặt làm ảnh bìa"
                    className={
                      album.cover_url === photo.image_url ? "active" : ""
                    }
                    onClick={(e) => handleSetCover(e, photo)}
                  >
                    <Star size={16} />
                  </button>

                  <button
                    type="button"
                    title="Xóa ảnh"
                    onClick={(e) => handleDeletePhoto(e, photo)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {photo.caption && (
                  <div className="album-photo-caption">{photo.caption}</div>
                )}
              </article>
            ))}
          </section>
        )}
      </main>

      {/* LIGHTBOX */}

      {selectedPhoto && (
        <div
          className="album-lightbox"
          onMouseDown={() => setSelectedPhotoIndex(null)}
        >
          <button
            type="button"
            className="album-lightbox-close"
            onClick={() => setSelectedPhotoIndex(null)}
          >
            <X size={25} />
          </button>

          {photos.length > 1 && (
            <button
              type="button"
              className="album-lightbox-nav album-lightbox-prev"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={previousPhoto}
            >
              <ChevronLeft size={30} />
            </button>
          )}

          <div
            className="album-lightbox-content"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <img
              src={selectedPhoto.image_url}
              alt={selectedPhoto.caption || "Ảnh album"}
            />

            <div className="album-lightbox-info">
              <span>
                {selectedPhotoIndex + 1} / {photos.length}
              </span>

              {selectedPhoto.caption && <p>{selectedPhoto.caption}</p>}
            </div>
          </div>

          {photos.length > 1 && (
            <button
              type="button"
              className="album-lightbox-nav album-lightbox-next"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={nextPhoto}
            >
              <ChevronRight size={30} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default AlbumDetail;
