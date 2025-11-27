import React, { useState, useEffect } from "react";
import axios from "axios";
import SearchFilters from "./SearchFilters";

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/products");
      setProducts(response.data);
    } catch (error) {
      console.error("Помилка завантаження товарів:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductsUpdate = (filteredProducts) => {
    setProducts(filteredProducts);
  };

  if (loading) {
    return <div className="loading">Завантаження товарів...</div>;
  }

  return (
    <div className="products-page">
      <h2>🛍️ Комплектуючі для ПК</h2>

      {/* Додаємо компонент фільтрів */}
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
              <p className="product-description">{product.description}</p>

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

              <button className="add-to-cart-btn">🛒 Додати в кошик</button>
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
