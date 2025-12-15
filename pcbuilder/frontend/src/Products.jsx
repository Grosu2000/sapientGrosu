import React, { useState, useEffect } from "react";
import axios from "axios";
import SearchFilters from "./SearchFilters";
import { toast } from "react-toastify";

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/products");
      setProducts(response.data);
    } catch (error) {
      console.error("Помилка завантаження товарів:", error);
      toast.error("Помилка завантаження товарів");
    } finally {
      setLoading(false);
    }
  };

  const handleProductsUpdate = (filteredProducts) => {
    setProducts(filteredProducts);
  };

  const handleAddToCart = async (productId) => {
    setAddingToCart((prev) => ({ ...prev, [productId]: true }));

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Будь ласка, увійдіть в систему");
        window.location.href = "/";
        return;
      }

      const response = await axios.post(
        "http://localhost:5000/api/cart/add",
        { productId, quantity: 1 },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(response.data.message || "Товар додано в кошик! 🛒");
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Сесія закінчилась. Увійдіть знову");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/";
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Помилка додавання в кошик");
      }
    } finally {
      setAddingToCart((prev) => ({ ...prev, [productId]: false }));
    }
  };

  if (loading) {
    return <div className="loading">Завантаження товарів...</div>;
  }

  return (
    <div className="products-page">
      <h2>🛍️ Комплектуючі для ПК</h2>

      <SearchFilters onProductsUpdate={handleProductsUpdate} />

      <div className="products-info">
        <p>
          Знайдено товарів: <strong>{products.length}</strong>
        </p>
      </div>

      <div className="products-grid">
        {products.map((product) => (
          <div key={product.id} className="product-card">
            <div className="product-image">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} />
              ) : (
                <div className="image-placeholder">🖥️</div>
              )}
            </div>

            <div className="product-info">
              <h3>{product.name}</h3>
              <p className="product-category">{product.category_name}</p>
              {product.brand && (
                <p className="product-brand">Бренд: {product.brand}</p>
              )}
              <p className="product-description">
                {product.description && product.description.length > 100
                  ? `${product.description.substring(0, 100)}...`
                  : product.description}
              </p>

              <div className="product-footer">
                <span className="product-price">{product.price} ₴</span>
                <span
                  className={`product-stock ${
                    product.stock_quantity === 0 ? "out-of-stock" : ""
                  }`}
                >
                  {product.stock_quantity > 0
                    ? `В наявності: ${product.stock_quantity}`
                    : "Немає в наявності"}
                </span>
              </div>

              <button
                onClick={() => handleAddToCart(product.id)}
                className="add-to-cart-btn"
                disabled={
                  addingToCart[product.id] || product.stock_quantity === 0
                }
              >
                {addingToCart[product.id]
                  ? "⏳ Додаємо..."
                  : product.stock_quantity === 0
                  ? "Немає в наявності"
                  : "🛒 Додати в кошик"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && !loading && (
        <div className="no-products">
          <p>😔 Товари за вашими критеріями не знайдені</p>
          <p>Спробуйте змінити параметри пошуку</p>
        </div>
      )}
    </div>
  );
};

export default Products;
