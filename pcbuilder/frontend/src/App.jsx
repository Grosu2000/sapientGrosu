import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Auth from "./Auth";
import Products from "./Products";
import AdminPanel from "./AdminPanel";
import Cart from "./Cart";
import Configurator from "./Configurator";
import "./App.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [authMode, setAuthMode] = useState("login");

  const handleLogin = (userData) => {
    setUser(userData);
    toast.success(`🎉 Вітаємо, ${userData.firstName}!`);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    toast.info("👋 До побачення!");
  };

  const handleShowRegister = () => {
    setAuthMode("register");
    window.location.href = "/auth";
  };

  const handleShowLogin = () => {
    setAuthMode("login");
    window.location.href = "/auth";
  };

  return (
    <Router>
      <div className="app">
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />

        <Routes>
          {}
          <Route
            path="/"
            element={
              !user ? (
                <div>
                  <header className="header">
                    <h1>PCBuilder 🛠️</h1>
                  </header>
                  <main className="main-content">
                    <div className="hero-section">
                      <div className="hero-content">
                        <h2>Створюйте ідеальний ПК</h2>
                        <p>
                          Професійний конфігуратор комп'ютерних комплектуючих з
                          перевіркою сумісності
                        </p>
                        <div className="cta-buttons">
                          <button
                            onClick={handleShowRegister}
                            className="cta-btn primary"
                          >
                            Почати збірку
                          </button>
                          <button
                            onClick={handleShowLogin}
                            className="cta-btn secondary"
                          >
                            Вже маю акаунт
                          </button>
                        </div>
                      </div>
                    </div>
                  </main>
                </div>
              ) : (
                <Navigate to="/products" />
              )
            }
          />

          {}
          <Route
            path="/auth"
            element={
              <div>
                <header className="header">
                  <h1>PCBuilder 🛠️</h1>
                  <button
                    onClick={() => (window.location.href = "/")}
                    className="back-btn"
                  >
                    ← На головну
                  </button>
                </header>
                <main className="main-content">
                  <Auth mode={authMode} onLogin={handleLogin} />
                </main>
              </div>
            }
          />

          {}
          <Route
            path="/products"
            element={
              user ? (
                <ProtectedLayout user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/" />
              )
            }
          />

          {}
          <Route
            path="/cart"
            element={
              user ? (
                <CartLayout user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/" />
              )
            }
          />

          {}
          <Route
            path="/configurator"
            element={
              user ? (
                <ConfiguratorLayout user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

const ProtectedLayout = ({ user, onLogout }) => {
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  return (
    <div>
      <header className="header">
        <h1>PCBuilder 🛠️</h1>
        <div className="user-menu">
          <span>
            👤 {user.firstName} {user.role === "admin" ? "👑" : ""}
          </span>
          <button
            onClick={() => (window.location.href = "/configurator")}
            className="configurator-btn"
          >
            ⚙️ Конфігуратор
          </button>
          <button
            onClick={() => (window.location.href = "/cart")}
            className="cart-btn"
          >
            🛒 Кошик
          </button>
          {user.role === "admin" && (
            <button
              className="admin-btn"
              onClick={() => setShowAdminPanel(!showAdminPanel)}
            >
              {showAdminPanel ? "← Товари" : "👑 Адмін"}
            </button>
          )}
          <button onClick={onLogout} className="logout-btn">
            Вийти
          </button>
        </div>
      </header>

      <main className="main-content">
        {showAdminPanel ? <AdminPanel /> : <Products />}
      </main>
    </div>
  );
};

const CartLayout = ({ user, onLogout }) => {
  return (
    <div>
      <header className="header">
        <h1>PCBuilder 🛠️</h1>
        <div className="user-menu">
          <span>👤 {user.firstName}</span>
          <button
            onClick={() => (window.location.href = "/products")}
            className="admin-btn"
          >
            ← Товари
          </button>
          <button
            onClick={() => (window.location.href = "/configurator")}
            className="configurator-btn"
          >
            ⚙️ Конфігуратор
          </button>
          <button onClick={onLogout} className="logout-btn">
            Вийти
          </button>
        </div>
      </header>
      <main className="main-content">
        <Cart />
      </main>
    </div>
  );
};

const ConfiguratorLayout = ({ user, onLogout }) => {
  return (
    <div>
      <header className="header">
        <h1>PCBuilder 🛠️</h1>
        <div className="user-menu">
          <span>👤 {user.firstName}</span>
          <button
            onClick={() => (window.location.href = "/products")}
            className="admin-btn"
          >
            ← Товари
          </button>
          <button
            onClick={() => (window.location.href = "/cart")}
            className="cart-btn"
          >
            🛒 Кошик
          </button>
          <button onClick={onLogout} className="logout-btn">
            Вийти
          </button>
        </div>
      </header>
      <main className="main-content">
        <Configurator />
      </main>
    </div>
  );
};

export default App;
