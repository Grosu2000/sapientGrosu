import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const Auth = ({ mode, onLogin, onBack }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const url = `http://localhost:5000/api/auth/${mode}`;
      const response = await axios.post(url, formData);
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      toast.success(`🎉 ${response.data.message}`, {
        position: "top-center",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      

      setTimeout(() => {
        onLogin(response.data.user);
      }, 1000);
      
    } catch (error) {
      toast.error(`❌ ${error.response?.data?.message || 'Сталася помилка'}`, {
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

  return (
    <div className="auth-page">
      <button onClick={onBack} className="back-btn">
        ← Назад на головну
      </button>
      
      <div className="auth-container">
        <h2>{mode === 'login' ? '🔐 Вхід' : '📝 Реєстрація'}</h2>
        <p className="auth-subtitle">
          {mode === 'login' 
            ? 'Увійдіть у свій акаунт' 
            : 'Створіть новий акаунт'
          }
        </p>
        
        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="name-fields">
              <input
                type="text"
                name="firstName"
                placeholder="Ім'я"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="auth-input"
                disabled={loading}
              />
              <input
                type="text"
                name="lastName"
                placeholder="Прізвище"
                value={formData.lastName}
                onChange={handleChange}
                required
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
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? (
              <span>⏳ Завантаження...</span>
            ) : (
              <span>
                {mode === 'login' ? '🚀 Увійти' : '✨ Зареєструватися'}
              </span>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {mode === 'login' 
              ? 'Ще не маєте акаунту? ' 
              : 'Вже маєте акаунт? '
            }
            <span className="auth-mode-hint">
              {mode === 'login' 
                ? 'Створіть новий!' 
                : 'Увійдіть!'
              }
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;