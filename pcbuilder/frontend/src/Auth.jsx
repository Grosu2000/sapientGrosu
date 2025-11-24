import React, { useState } from 'react';
import axios from 'axios';

const Auth = ({ mode, onLogin, onBack }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = `http://localhost:5000/api/auth/${mode}`;
      const response = await axios.post(url, formData);
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      alert(response.data.message);
      onLogin(response.data.user);
    } catch (error) {
      alert(error.response?.data?.message || 'Сталася помилка');
    }
  };

  return (
    <div className="auth-page">
      <button onClick={onBack} className="back-btn">
        ← Назад
      </button>
      
      <div className="auth-container">
        <h2>{mode === 'login' ? 'Вхід' : 'Реєстрація'}</h2>
        
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
              />
              <input
                type="text"
                name="lastName"
                placeholder="Прізвище"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="auth-input"
              />
            </div>
          )}
          
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
            className="auth-input"
          />
          
          <input
            type="password"
            name="password"
            placeholder="Пароль"
            value={formData.password}
            onChange={handleChange}
            required
            className="auth-input"
          />
          
          <button type="submit" className="auth-button">
            {mode === 'login' ? 'Увійти' : 'Зареєструватися'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;