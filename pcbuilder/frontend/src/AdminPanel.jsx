import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchStats();
    } else if (activeTab === "users") {
      fetchUsers();
    } else if (activeTab === "products") {
      fetchProducts();
      fetchCategories();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:5000/api/admin/stats",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setStats(response.data);
    } catch (error) {
      console.error("Помилка завантаження статистики:", error);
      toast.error("Помилка завантаження статистики");
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:5000/api/admin/users",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUsers(response.data);
    } catch (error) {
      toast.error("Помилка завантаження користувачів");
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/products");
      setProducts(response.data);
    } catch (error) {
      toast.error("Помилка завантаження товарів");
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/categories");
      setCategories(response.data);
    } catch (error) {
      toast.error("Помилка завантаження категорій");
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
          className={`tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          📊 Дашборд
        </button>
        <button
          className={`tab-btn ${activeTab === "products" ? "active" : ""}`}
          onClick={() => setActiveTab("products")}
        >
          🛍️ Товари
        </button>
        <button
          className={`tab-btn ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          👥 Користувачі
        </button>
      </div>

      <div className="admin-content">
        {activeTab === "dashboard" && <DashboardTab stats={stats} />}
        {activeTab === "products" && (
          <ProductsTab
            products={products}
            categories={categories}
            onUpdate={fetchProducts}
          />
        )}
        {activeTab === "users" && <UsersTab users={users} />}
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
  const [formLoading, setFormLoading] = useState(false);

  const handleDelete = async (productId) => {
    if (!window.confirm("Видалити цей товар?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `http://localhost:5000/api/admin/products/${productId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success("Товар видалено");
      onUpdate();
    } catch (error) {
      toast.error("Помилка видалення товару");
    }
  };

  const handleFormSubmit = async (formData) => {
    setFormLoading(true);
    try {
      const token = localStorage.getItem("token");
      const url = editingProduct
        ? `http://localhost:5000/api/admin/products/${editingProduct.id}`
        : "http://localhost:5000/api/admin/products";

      const method = editingProduct ? "put" : "post";

      await axios[method](url, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success(editingProduct ? "Товар оновлено" : "Товар створено");
      setShowForm(false);
      setEditingProduct(null);
      onUpdate();
    } catch (error) {
      console.error("Помилка збереження товару:", error);
      toast.error(error.response?.data?.message || "Помилка збереження товару");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="products-tab">
      <div className="tab-header">
        <h2>Управління товарами</h2>
        <button className="add-product-btn" onClick={() => setShowForm(true)}>
          ➕ Додати товар
        </button>
      </div>

      <div className="products-list">
        {products.map((product) => (
          <div key={product.id} className="admin-product-card">
            <div className="product-main-info">
              <h4>{product.name}</h4>
              <p className="product-category">{product.category_name}</p>
              <p className="product-brand">{product.brand || "Без бренду"}</p>
            </div>
            <div className="product-details">
              <span className="product-price">{product.price} ₴</span>
              <span
                className={`product-stock ${
                  product.stock_quantity < 5 ? "low-stock" : ""
                }`}
              >
                {product.stock_quantity} шт.
              </span>
            </div>
            <div className="product-actions">
              <button
                className="edit-btn"
                onClick={() => {
                  setEditingProduct(product);
                  setShowForm(true);
                }}
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
          onSubmit={handleFormSubmit}
          loading={formLoading}
        />
      )}
    </div>
  );
};

const ProductForm = ({ product, categories, onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    price: product?.price || "",
    category_id: product?.category_id || categories[0]?.id || "",
    brand: product?.brand || "",
    stock_quantity: product?.stock_quantity || 1,
    image_url: product?.image_url || "",
    socket: product?.socket || "",
    memory_type: product?.memory_type || "",
    form_factor: product?.form_factor || "",
    power_requirements: product?.power_requirements || "",
    specifications: product?.specifications
      ? typeof product.specifications === "string"
        ? product.specifications
        : JSON.stringify(product.specifications, null, 2)
      : "{}",
  });

  const selectedCategory = categories.find(
    (cat) => cat.id === parseInt(formData.category_id)
  );
  const categoryName = selectedCategory?.name?.toLowerCase() || "";

  const handleSubmit = (e) => {
    e.preventDefault();

    try {
      const parsedSpecifications = JSON.parse(formData.specifications || "{}");

      const submitData = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        category_id: parseInt(formData.category_id) || 1,
        power_requirements: formData.power_requirements
          ? parseInt(formData.power_requirements)
          : null,
        specifications: parsedSpecifications,
        socket: formData.socket || null,
        memory_type: formData.memory_type || null,
        form_factor: formData.form_factor || null,
      };

      onSubmit(submitData);
    } catch (error) {
      console.error("Помилка парсингу специфікацій:", error);
      toast.error("Невірний формат специфікацій (має бути JSON)");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="product-form-modal">
        <div className="modal-header">
          <h3>{product ? "Редагувати товар" : "Новий товар"}</h3>
          <button onClick={onClose} className="close-btn" disabled={loading}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {}
            <div className="form-group">
              <label>Назва товару *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Категорія *</label>
              <select
                value={formData.category_id}
                onChange={(e) =>
                  setFormData({ ...formData, category_id: e.target.value })
                }
                required
                disabled={loading}
              >
                <option value="">Оберіть категорію</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Ціна (₴) *</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                required
                disabled={loading}
                step="0.01"
                min="0"
              />
            </div>

            <div className="form-group">
              <label>Бренд</label>
              <input
                type="text"
                placeholder="Наприклад: AMD, Intel, ASUS"
                value={formData.brand}
                onChange={(e) =>
                  setFormData({ ...formData, brand: e.target.value })
                }
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Кількість на складі</label>
              <input
                type="number"
                value={formData.stock_quantity}
                onChange={(e) =>
                  setFormData({ ...formData, stock_quantity: e.target.value })
                }
                disabled={loading}
                min="0"
              />
            </div>

            <div className="form-group">
              <label>URL зображення</label>
              <input
                type="text"
                placeholder="https://example.com/image.jpg"
                value={formData.image_url}
                onChange={(e) =>
                  setFormData({ ...formData, image_url: e.target.value })
                }
                disabled={loading}
              />
            </div>

            {}

            {}
            {(categoryName.includes("процесор") ||
              categoryName.includes("материнськ")) && (
              <>
                <div className="form-group">
                  <label>Сокет *</label>
                  <select
                    value={formData.socket}
                    onChange={(e) =>
                      setFormData({ ...formData, socket: e.target.value })
                    }
                    required
                    disabled={loading}
                  >
                    <option value="">Оберіть сокет</option>
                    <option value="AM4">AM4</option>
                    <option value="AM5">AM5</option>
                    <option value="LGA1700">LGA1700</option>
                    <option value="LGA1200">LGA1200</option>
                    <option value="LGA1151">LGA1151</option>
                  </select>
                </div>

                {categoryName.includes("процесор") && (
                  <div className="form-group">
                    <label>Потужність (W)</label>
                    <input
                      type="number"
                      placeholder="Наприклад: 65"
                      value={formData.power_requirements}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          power_requirements: e.target.value,
                        })
                      }
                      disabled={loading}
                      min="0"
                    />
                  </div>
                )}
              </>
            )}

            {}
            {(categoryName.includes("материнськ") ||
              categoryName.includes("пам'ять") ||
              categoryName.includes("memory")) && (
              <div className="form-group">
                <label>Тип пам'яті</label>
                <select
                  value={formData.memory_type}
                  onChange={(e) =>
                    setFormData({ ...formData, memory_type: e.target.value })
                  }
                  disabled={loading}
                >
                  <option value="">Оберіть тип пам'яті</option>
                  <option value="DDR4">DDR4</option>
                  <option value="DDR5">DDR5</option>
                  <option value="DDR3">DDR3</option>
                </select>
              </div>
            )}

            {}
            {(categoryName.includes("материнськ") ||
              categoryName.includes("корпус") ||
              categoryName.includes("case")) && (
              <div className="form-group">
                <label>Форм-фактор</label>
                <select
                  value={formData.form_factor}
                  onChange={(e) =>
                    setFormData({ ...formData, form_factor: e.target.value })
                  }
                  disabled={loading}
                >
                  <option value="">Оберіть форм-фактор</option>
                  <option value="ATX">ATX</option>
                  <option value="Micro-ATX">Micro-ATX</option>
                  <option value="Mini-ITX">Mini-ITX</option>
                  <option value="E-ATX">E-ATX</option>
                  <option value="Mid-Tower">Mid-Tower</option>
                  <option value="Full-Tower">Full-Tower</option>
                  <option value="Mini-Tower">Mini-Tower</option>
                </select>
              </div>
            )}

            {}
            {(categoryName.includes("відеокарт") ||
              categoryName.includes("graphics") ||
              categoryName.includes("живлення") ||
              categoryName.includes("power")) && (
              <div className="form-group">
                <label>Потужність (W)</label>
                <input
                  type="number"
                  placeholder="Наприклад: 120"
                  value={formData.power_requirements}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      power_requirements: e.target.value,
                    })
                  }
                  disabled={loading}
                  min="0"
                />
              </div>
            )}

            {}
            {categoryName.includes("охолодження") ||
              (categoryName.includes("cooling") && (
                <div className="form-group">
                  <label>Сокет кулера</label>
                  <input
                    type="text"
                    placeholder="Наприклад: AM4, LGA1700, Universal"
                    value={formData.socket}
                    onChange={(e) =>
                      setFormData({ ...formData, socket: e.target.value })
                    }
                    disabled={loading}
                  />
                </div>
              ))}

            {}
            <div className="form-group full-width">
              <label>Специфікації (JSON формат)</label>
              <textarea
                placeholder='{"cores": 6, "memory": "8GB", "frequency": "3.7GHz"}'
                value={formData.specifications}
                onChange={(e) =>
                  setFormData({ ...formData, specifications: e.target.value })
                }
                disabled={loading}
                rows="4"
              />
              <small>Вкажіть додаткові характеристики у форматі JSON</small>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="cancel-btn"
              disabled={loading}
            >
              Скасувати
            </button>
            <button type="submit" className="save-btn" disabled={loading}>
              {loading ? "Збереження..." : product ? "Оновити" : "Створити"}
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
      {users.map((user) => (
        <div key={user.id} className="user-card">
          <div className="user-info">
            <h4>
              {user.first_name} {user.last_name}
            </h4>
            <p>{user.email}</p>
            <span className={`user-role ${user.role}`}>
              {user.role === "admin" ? "👑 Адмін" : "👤 Користувач"}
            </span>
          </div>
          <div className="user-meta">
            <p>
              Зареєстровано: {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default AdminPanel;
