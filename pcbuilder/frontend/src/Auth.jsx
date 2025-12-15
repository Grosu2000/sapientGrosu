import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const Auth = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });

  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = `http://localhost:5000/api/auth/${mode}`;

      const requestData =
        mode === "register"
          ? formData
          : { email: formData.email, password: formData.password };

      const result = await axios.post(url, requestData);

      localStorage.setItem("token", result.data.token);
      localStorage.setItem("user", JSON.stringify(result.data.user));

      toast.success(`🎉 ${result.data.message}`, {
        position: "top-center",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      setTimeout(() => {
        onLogin(result.data.user);
      }, 1000);
    } catch (error) {
      console.error("Помилка авторизації:", error);

      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Сталася невідома помилка";

      toast.error(`❌ ${errorMessage}`, {
        position: "top-center",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
  };

  return (
    <div className="auth-page">
      <button onClick={() => (window.location.href = "/")} className="back-btn">
        ← Назад на головну
      </button>

      <div className="auth-container">
        <h2>{mode === "login" ? "🔐 Вхід" : "📝 Реєстрація"}</h2>
        <p className="auth-subtitle">
          {mode === "login"
            ? "Увійдіть у свій акаунт"
            : "Створіть новий акаунт"}
        </p>

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <div className="name-fields">
              <input
                type="text"
                name="firstName"
                placeholder="Ім'я"
                value={formData.firstName}
                onChange={handleChange}
                required={mode === "register"}
                className="auth-input"
                disabled={loading}
              />
              <input
                type="text"
                name="lastName"
                placeholder="Прізвище"
                value={formData.lastName}
                onChange={handleChange}
                required={mode === "register"}
                className="auth-input"
                disabled={loading}
              />
            </div>
          )}

          <input
            type="email"
            name="email"
            placeholder="📧 Ваш email"
            value={formData.email}
            onChange={handleChange}
            required
            className="auth-input"
            disabled={loading}
          />

          <input
            type="password"
            name="password"
            placeholder="🔒 Пароль"
            value={formData.password}
            onChange={handleChange}
            required
            className="auth-input"
            disabled={loading}
            minLength="6"
          />

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? (
              <span>⏳ Завантаження...</span>
            ) : (
              <span>
                {mode === "login" ? "🚀 Увійти" : "✨ Зареєструватися"}
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
