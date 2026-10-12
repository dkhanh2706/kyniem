import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Camera, User, LogOut, Sparkles, Image as ImageIcon } from "lucide-react";

import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";

import "../styles/home.css";

function Home() {
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  const [currentUser] = useState(() => {
    return JSON.parse(localStorage.getItem("user") || "null");
  });

  const user = currentUser;

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Chào buổi sáng ☀️";
    if (hour < 18) return "Chào buổi chiều 🌤️";
    return "Chào buổi tối 🌙";
  };

  /*
  ====================================================
  LOAD BÀI ĐĂNG
  ====================================================
  */
  useEffect(() => {
    let isMounted = true;

    const fetchPosts = async () => {
      if (!token) {
        navigate("/");
        return;
      }

      try {
        const response = await fetch("http://localhost:5001/api/posts", {
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
          throw new Error(data.message || "Không thể tải danh sách kỷ niệm.");
        }

        if (isMounted) {
          setPosts(Array.isArray(data.posts) ? data.posts : []);
          setError("");
        }
      } catch (err) {
        console.error("fetchPosts error:", err);
        if (isMounted) {
          setError(err.message || "Không thể tải dữ liệu.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPosts();

    return () => {
      isMounted = false;
    };
  }, [navigate, token]);

  /*
  ====================================================
  BÀI MỚI
  ====================================================
  */
  const handlePostCreated = (newPost) => {
    if (!newPost) return;
    setPosts((currentPosts) => [newPost, ...currentPosts]);
  };

  /*
  ====================================================
  XÓA BÀI
  ====================================================
  */
  const handleDeletePost = async (postId) => {
    if (!token) {
      navigate("/");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5001/api/posts/${postId}`,
        {
          method: "DELETE",
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
        throw new Error(data.message || "Không thể xóa bài đăng.");
      }

      setPosts((currentPosts) =>
        currentPosts.filter((post) => Number(post.id) !== Number(postId)),
      );
    } catch (err) {
      console.error("deletePost error:", err);
      alert(err.message || "Không thể xóa bài.");
    }
  };

  /*
  ====================================================
  ĐĂNG XUẤT
  ====================================================
  */
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="home-page">
      {/* HEADER */}
      <header className="home-header">
        <div className="header-brand" onClick={() => navigate("/home")}>
          <div className="brand-icon-box">
            <Heart size={20} fill="currentColor" />
          </div>
          <div className="brand-title-wrap">
            <span className="brand-title">Kỷ Niệm Của Chúng Mình</span>
            <span className="brand-tagline">Lưu giữ từng khoảnh khắc ngọt ngào</span>
          </div>
        </div>

        <div className="header-actions">
          <div
            className="header-user-badge"
            title="Đến trang cá nhân"
            onClick={() => navigate("/profile")}
          >
            <div className="header-avatar">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" />
              ) : (
                user?.display_name?.charAt(0)?.toUpperCase() ||
                user?.username?.charAt(0)?.toUpperCase() ||
                "?"
              )}
            </div>
            <span className="header-user-name">
              {user?.display_name || user?.username || "Người dùng"}
            </span>
          </div>

          <button
            type="button"
            className="header-btn profile-nav-btn"
            onClick={() => navigate("/profile")}
            title="Cài đặt thông tin"
          >
            <User size={16} />
            <span>Hồ sơ</span>
          </button>

          <button
            type="button"
            className="header-btn logout-nav-btn"
            onClick={handleLogout}
            title="Đăng xuất"
          >
            <LogOut size={16} />
            <span>Thoát</span>
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main className="home-content">
        {/* HERO BANNER */}
        <section className="home-hero">
          <div className="hero-top-badge">
            <Sparkles size={13} />
            <span>Không gian kỷ niệm</span>
          </div>

          <h1 className="hero-title">
            {getGreeting()},{" "}
            {user?.display_name || user?.username || "bạn thân yêu"}!
          </h1>

          <p className="hero-subtitle">
            Mỗi khoảnh khắc bên nhau đều là một câu chuyện đẹp. Hãy ghi dấu lại từng nụ cười, từng chuyến đi và kỷ niệm đáng trân quý.
          </p>

          <div className="hero-stats-bar">
            <div className="hero-stat-item">
              <Camera size={16} />
              <span>{posts.length} kỷ niệm đã lưu giữ</span>
            </div>
            <div className="hero-stat-item">
              <Heart size={16} fill="currentColor" />
              <span>Gắn kết yêu thương mỗi ngày</span>
            </div>
          </div>
        </section>

        {/* CREATE POST */}
        <CreatePost onPostCreated={handlePostCreated} />

        {/* FEED SECTION */}
        <section className="memory-section">
          <div className="memory-section-header">
            <div className="memory-title-wrap">
              <h2>Dòng Thời Gian Kỷ Niệm</h2>
              <span className="memory-count-badge">{posts.length}</span>
            </div>
          </div>

          {/* SKELETON LOADING STATE */}
          {loading && (
            <div className="post-list">
              {[1, 2, 3].map((n) => (
                <div key={n} className="skeleton-card">
                  <div className="skeleton-header">
                    <div className="skeleton-avatar">
                      <div className="skeleton-shimmer" />
                    </div>
                    <div className="skeleton-meta">
                      <div className="skeleton-line title">
                        <div className="skeleton-shimmer" />
                      </div>
                      <div className="skeleton-line sub">
                        <div className="skeleton-shimmer" />
                      </div>
                    </div>
                  </div>
                  <div className="skeleton-content">
                    <div className="skeleton-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="empty-posts" style={{ borderColor: "#fecaca" }}>
              <p style={{ color: "#ef4444" }}>{error}</p>
            </div>
          )}

          {!loading && !error && posts.length === 0 && (
            <div className="empty-posts">
              <div className="empty-icon-wrap">
                <Camera size={32} />
              </div>
              <h3>Chưa có kỷ niệm nào</h3>
              <p>
                Hãy là người đầu tiên chia sẻ một khoảnh khắc ý nghĩa của chúng mình lên đây nhé!
              </p>
            </div>
          )}

          {!loading && !error && posts.length > 0 && (
            <div className="post-list">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={user}
                  onDelete={handleDeletePost}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Home;
