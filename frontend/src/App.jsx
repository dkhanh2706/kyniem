import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import CreatePassword from "./pages/CreatePassword";
import Home from "./pages/Home";
import Profile from "./pages/Profile";

// Album Cloudflare R2
import Album from "./pages/Album";
import AlbumDetail from "./pages/AlbumDetail";

/*
====================================================
KIỂM TRA TOKEN CÒN HẠN KHÔNG
====================================================
*/

function isTokenValid() {
  const token = localStorage.getItem("token");

  if (!token) {
    return false;
  }

  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      throw new Error("Token không hợp lệ");
    }

    /*
    JWT dùng Base64URL.

    Chuyển sang Base64 bình thường.
    */

    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");

    while (payload.length % 4) {
      payload += "=";
    }

    const decoded = JSON.parse(
      decodeURIComponent(
        atob(payload)
          .split("")
          .map(
            (char) => "%" + ("00" + char.charCodeAt(0).toString(16)).slice(-2),
          )
          .join(""),
      ),
    );

    /*
    Không có exp
    → coi như token không hợp lệ.
    */

    if (!decoded.exp) {
      throw new Error("Token không có thời hạn");
    }

    const now = Math.floor(Date.now() / 1000);

    /*
    Token đã hết hạn.
    */

    if (decoded.exp <= now) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      return false;
    }

    return true;
  } catch (error) {
    console.error("Kiểm tra token thất bại:", error);

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    return false;
  }
}

/*
====================================================
PROTECTED ROUTE

Chỉ cho người đã đăng nhập truy cập.
====================================================
*/

function ProtectedRoute({ children }) {
  if (!isTokenValid()) {
    return <Navigate to="/" replace />;
  }

  return children;
}

/*
====================================================
LOGIN ROUTE

Nếu đã login
→ không cho quay lại trang login.
====================================================
*/

function LoginRoute() {
  if (isTokenValid()) {
    return <Navigate to="/home" replace />;
  }

  return <Login />;
}

/*
====================================================
CREATE PASSWORD ROUTE
====================================================
*/

function CreatePasswordRoute() {
  if (isTokenValid()) {
    return <Navigate to="/home" replace />;
  }

  return <CreatePassword />;
}

/*
====================================================
APP
====================================================
*/

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* =========================
            LOGIN
        ========================= */}

        <Route path="/" element={<LoginRoute />} />

        {/* =========================
            CREATE PASSWORD
        ========================= */}

        <Route path="/create-password" element={<CreatePasswordRoute />} />

        {/* =========================
            HOME
        ========================= */}

        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        {/* =========================
            ALBUM
        ========================= */}

        <Route
          path="/album"
          element={
            <ProtectedRoute>
              <Album />
            </ProtectedRoute>
          }
        />

        {/* =========================
            ALBUM DETAIL
        ========================= */}

        <Route
          path="/album/:id"
          element={
            <ProtectedRoute>
              <AlbumDetail />
            </ProtectedRoute>
          }
        />

        {/* =========================
            PROFILE
        ========================= */}

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* =========================
            URL KHÔNG TỒN TẠI
        ========================= */}

        <Route
          path="*"
          element={
            isTokenValid() ? (
              <Navigate to="/home" replace />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
