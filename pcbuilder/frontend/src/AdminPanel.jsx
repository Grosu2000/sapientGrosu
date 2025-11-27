import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchStats();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'products') {
      fetchProducts();
      fetchCategories();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      toast.error('Помилка завантаження статистики');
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      toast.error('Помилка завантаження користувачів');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/products');
      setProducts(response.data);
    } catch (error) {
      toast.error('Помилка завантаження товарів');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/categories');
      setCategories(response.data);
    } catch (error) {
      toast.error('Помилка завантаження категорій');
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>👑 Адмін Панель</h1>
        <p>Управління сайтом PCBuilder</p>
      </div>

      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Дашборд
        </button>
        <button 
          className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          🛍️ Товари
        </button>
        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Користувачі
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'dashboard' && <DashboardTab stats={stats} />}
        {activeTab === 'products' && <ProductsTab products={products} categories={categories} onUpdate={fetchProducts} />}
        {activeTab === 'users' && <UsersTab users={users} />}
      </div>
    </div>
  );
};

const DashboardTab = ({ stats }) => (
  <div className="dashboard-tab">
    <h2>Статистика</h2>
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon">👥</div>
        <div className="stat-info">
          <h3>{stats.users || 0}</h3>
          <p>Користувачів</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">🛍️</div>
        <div className="stat-info">
          <h3>{stats.products || 0}</h3>
          <p>Товарів</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">📁</div>
        <div className="stat-info">
          <h3>{stats.categories || 0}</h3>
          <p>Категорій</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">⚠️</div>
        <div className="stat-info">
          <h3>{stats.lowStock || 0}</h3>
          <p>Закінчується</p>
        </div>
      </div>
    </div>
  </div>
);

const ProductsTab = ({ products, categories, onUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const handleDelete = async (productId) => {
    if (!window.confirm('Видалити цей товар?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/admin/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Товар видалено');
      onUpdate();
    } catch (error) {
      toast.error('Помилка видалення товару');
    }
  };

  return (
    <div className="products-tab">
      <div className="tab-header">
        <h2>Управління товарами</h2>
        <button 
          className="add-product-btn"
          onClick={() => setShowForm(true)}
        >
          ➕ Додати товар
        </button>
      </div>

      <div className="products-list">
        {products.map(product => (
          <div key={product.id} className="admin-product-card">
            <div className="product-main-info">
              <h4>{product.name}</h4>
              <p className="product-category">{product.category_name}</p>
              <p className="product-brand">{product.brand}</p>
            </div>
            <div className="product-details">
              <span className="product-price">{product.price} ₴</span>
              <span className={`product-stock ${product.stock_quantity < 5 ? 'low-stock' : ''}`}>
                {product.stock_quantity} шт.
              </span>
            </div>
            <div className="product-actions">
              <button 
                className="edit-btn"
                onClick={() => setEditingProduct(product)}
              >
                ✏️
              </button>
              <button 
                className="delete-btn"
                onClick={() => handleDelete(product.id)}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {(showForm || editingProduct) && (
        <ProductForm 
          product={editingProduct}
          categories={categories}
          onClose={() => {
            setShowForm(false);
            setEditingProduct(null);
          }}
          onSuccess={() => {
            onUpdate();
            setShowForm(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
};

const ProductForm = ({ product, categories, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    category_id: product?.category_id || '',
    brand: product?.brand || '',
    stock_quantity: product?.stock_quantity || 0,
    image_url: product?.image_url || '',
    specifications: product?.specifications || '{}'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const url = product 
        ? `http://localhost:5000/api/admin/products/${product.id}`
        : 'http://localhost:5000/api/admin/products';
      
      const method = product ? 'put' : 'post';

      await axios[method](url, {
        ...formData,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity),
        specifications: JSON.parse(formData.specifications || '{}')
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(product ? 'Товар оновлено' : 'Товар створено');
      onSuccess();
    } catch (error) {
      toast.error('Помилка збереження товару');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="product-form-modal">
        <div className="modal-header">
          <h3>{product ? 'Редагувати товар' : 'Новий товар'}</h3>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <input
              type="text"
              placeholder="Назва товару"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
            <textarea
              placeholder="Опис товару"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
            />
            <input
              type="number"
              placeholder="Ціна"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: e.target.value})}
              required
            />
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({...formData, category_id: e.target.value})}
              required
            >
              <option value="">Оберіть категорію</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Бренд"
              value={formData.brand}
              onChange={(e) => setFormData({...formData, brand: e.target.value})}
            />
            <input
              type="number"
              placeholder="Кількість на складі"
              value={formData.stock_quantity}
              onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
            />
            <input
              type="text"
              placeholder="URL зображення"
              value={formData.image_url}
              onChange={(e) => setFormData({...formData, image_url: e.target.value})}
            />
          </div>
          
          <div className="form-actions">
            <button type="button" onClick={onClose}>Скасувати</button>
            <button type="submit" disabled={loading}>
              {loading ? 'Збереження...' : (product ? 'Оновити' : 'Створити')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UsersTab = ({ users }) => (
  <div className="users-tab">
    <h2>Керування користувачами</h2>
    <div className="users-list">
      {users.map(user => (
        <div key={user.id} className="user-card">
          <div className="user-info">
            <h4>{user.first_name} {user.last_name}</h4>
            <p>{user.email}</p>
            <span className={`user-role ${user.role}`}>
              {user.role === 'admin' ? '👑 Адмін' : '👤 Користувач'}
            </span>
          </div>
          <div className="user-meta">
            <p>Зареєстровано: {new Date(user.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default AdminPanel;