import React, { useState } from "react";
import Auth from "./Auth";
import Products from "./Products";
import "./App.css";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setShowAuth(false);
  };

  if (user) {
    return (
      <div className="app">
        <header className="header">
          <h1>PCBuilder 🛠️</h1>
          <div className="user-menu">
            <span>
              Вітаємо, {user.firstName}! {user.role === "admin" ? "👑" : ""}
            </span>
            {user.role === "admin" && (
              <button className="admin-btn">Адмін панель</button>
            )}
            <button onClick={handleLogout} className="logout-btn">
              Вийти
            </button>
          </div>
        </header>
        <main className="main-content">
          <Products />
          <div className="welcome-section">
            <h2>Ласкаво просимо до конструктора ПК!</h2>
            <p>Тут ви зможете створити ідеальну збірку для вашого комп'ютера</p>
            <div className="features">
              <div className="feature-card">
                <h3>🖥️ Конфігуратор</h3>
                <p>Збирайте ПК з сумісних компонентів</p>
              </div>
              <div className="feature-card">
                <h3>✅ Перевірка сумісності</h3>
                <p>Автоматична перевірка всіх компонентів</p>
              </div>
              <div className="feature-card">
                <h3>💾 Збереження збірок</h3>
                <p>Зберігайте ваші улюблені конфігурації</p>
              </div>
            </div>
          </div>
        </main>
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
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>PCBuilder 🛠️</h1>
      </header>

      <main className="main-content">
        {showAuth ? (
          <Auth
            mode={authMode}
            onLogin={setUser}
            onBack={() => setShowAuth(false)}
          />
        ) : (
          <div className="hero-section">
            <div className="hero-content">
              <h2>Створюйте ідеальний ПК</h2>
              <p>
                Професійний інструмент для підбору та перевірки сумісності
                компонентів
              </p>

              <div className="cta-buttons">
                <button
                  onClick={() => {
                    setShowAuth(true);
                    setAuthMode("register");
                  }}
                  className="cta-btn primary"
                >
                  Почати роботу
                </button>
                <button
                  onClick={() => {
                    setShowAuth(true);
                    setAuthMode("login");
                  }}
                  className="cta-btn secondary"
                >
                  Вже маю акаунт
                </button>
              </div>

              <div className="features-preview">
                <div className="feature">
                  <span>🔧</span>
                  <p>Інтуїтивний конструктор</p>
                </div>
                <div className="feature">
                  <span>✅</span>
                  <p>Перевірка сумісності</p>
                </div>
                <div className="feature">
                  <span>💾</span>
                  <p>Збереження проектів</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
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
    </div>
  );
}

export default App;