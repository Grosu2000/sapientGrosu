import React, { useState, useEffect } from "react";
import axios from "axios";

const SearchFilters = ({ onProductsUpdate }) => {
  const [filters, setFilters] = useState({
    query: "",
    category: "",
    brand: "",
    minPrice: "",
    maxPrice: "",
    sortBy: "name",
    sortOrder: "asc",
  });

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFiltersData();
  }, []);

  const fetchFiltersData = async () => {
    try {
      const [catsResponse, brandsResponse] = await Promise.all([
        axios.get("http://localhost:5000/api/products"),
        axios.get("http://localhost:5000/api/brands"),
      ]);

      const uniqueCategories = [
        ...new Set(catsResponse.data.map((p) => p.category_name)),
      ];
      setCategories(uniqueCategories.filter(Boolean));
      setBrands(brandsResponse.data);
    } catch (error) {
      console.error("Помилка завантаження фільтрів:", error);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    performSearch(newFilters);
  };

  const performSearch = async (searchFilters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(searchFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await axios.get(
        `http://localhost:5000/api/products/search?${params}`
      );
      onProductsUpdate(response.data);
    } catch (error) {
      console.error("Помилка пошуку:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    const clearedFilters = {
      query: "",
      category: "",
      brand: "",
      minPrice: "",
      maxPrice: "",
      sortBy: "name",
      sortOrder: "asc",
    };
    setFilters(clearedFilters);
    performSearch(clearedFilters);
  };

  return (
    <div className="search-filters">
      <div className="filters-header">
        <h3>🔍 Пошук та фільтри</h3>
        <button onClick={clearFilters} className="clear-filters-btn">
          Очистити
        </button>
      </div>

      <div className="filters-grid">
        {/* Пошук по назві */}
        <div className="filter-group">
          <label>Пошук:</label>
          <input
            type="text"
            placeholder="Введіть назву товару..."
            value={filters.query}
            onChange={(e) => handleFilterChange("query", e.target.value)}
            className="filter-input"
          />
        </div>

        {/* Фільтр по категорії */}
        <div className="filter-group">
          <label>Категорія:</label>
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange("category", e.target.value)}
            className="filter-select"
          >
            <option value="">Всі категорії</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Фільтр по бренду */}
        <div className="filter-group">
          <label>Бренд:</label>
          <select
            value={filters.brand}
            onChange={(e) => handleFilterChange("brand", e.target.value)}
            className="filter-select"
          >
            <option value="">Всі бренди</option>
            {brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </div>

        {/* Фільтр по ціні */}
        <div className="filter-group">
          <label>Ціна:</label>
          <div className="price-range">
            <input
              type="number"
              placeholder="Від"
              value={filters.minPrice}
              onChange={(e) => handleFilterChange("minPrice", e.target.value)}
              className="price-input"
            />
            <span>-</span>
            <input
              type="number"
              placeholder="До"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
              className="price-input"
            />
          </div>
        </div>

        {/* Сортування */}
        <div className="filter-group">
          <label>Сортування:</label>
          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange("sortBy", e.target.value)}
            className="filter-select"
          >
            <option value="name">За назвою</option>
            <option value="price">За ціною</option>
            <option value="created_at">За новизною</option>
          </select>
          <select
            value={filters.sortOrder}
            onChange={(e) => handleFilterChange("sortOrder", e.target.value)}
            className="filter-select"
          >
            <option value="asc">За зростанням</option>
            <option value="desc">За спаданням</option>
          </select>
        </div>
      </div>

      {loading && <div className="search-loading">Пошук...</div>}
    </div>
  );
};

export default SearchFilters;
