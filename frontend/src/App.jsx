import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import CreatePassword from "./pages/CreatePassword";
import Home from "./pages/Home";
import Profile from "./pages/Profile";

// ==============================
// KIỂM TRA TOKEN CÒN HẠN KHÔNG
// ==============================
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

    // JWT dùng Base64URL nên cần đổi về Base64 bình thường
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

    // Không có exp thì coi như không hợp lệ
    if (!decoded.exp) {
      throw new Error("Token không có thời hạn");
    }

    const now = Math.floor(Date.now() / 1000);

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

// ==============================
// CHỈ CHO NGƯỜI ĐÃ LOGIN VÀO
// ==============================
function ProtectedRoute({ children }) {
  if (!isTokenValid()) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// ==============================
// NẾU ĐÃ LOGIN THÌ KHÔNG HIỆN LOGIN
// ==============================
function LoginRoute() {
  if (isTokenValid()) {
    return <Navigate to="/home" replace />;
  }

  return <Login />;
}

// ==============================
// CREATE PASSWORD
// ==============================
function CreatePasswordRoute() {
  if (isTokenValid()) {
    return <Navigate to="/home" replace />;
  }

  return <CreatePassword />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* LOGIN */}
        <Route path="/" element={<LoginRoute />} />

        {/* TẠO PASSWORD LẦN ĐẦU */}
        <Route path="/create-password" element={<CreatePasswordRoute />} />

        {/* HOME */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        {/* PROFILE */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* URL KHÔNG TỒN TẠI */}
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
