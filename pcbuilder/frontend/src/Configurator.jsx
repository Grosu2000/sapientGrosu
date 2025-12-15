import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const Configurator = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [components, setComponents] = useState({
    cpu: null,
    motherboard: null,
    ram: null,
    gpu: null,
    storage: null,
    psu: null,
    case: null,
    cooling: null,
  });

  const [availableParts, setAvailableParts] = useState({});
  const [totalPrice, setTotalPrice] = useState(0);
  const [compatibilityIssues, setCompatibilityIssues] = useState([]);
  const [savedBuilds, setSavedBuilds] = useState([]);
  const [loading, setLoading] = useState(true);

  const steps = [
    { id: "cpu", name: "Процесор", icon: "👑" },
    { id: "motherboard", name: "Материнська плата", icon: "🔌" },
    { id: "ram", name: "Оперативна пам'ять", icon: "💾" },
    { id: "gpu", name: "Відеокарта", icon: "🎮" },
    { id: "storage", name: "Накопичувач", icon: "💿" },
    { id: "psu", name: "Блок живлення", icon: "⚡" },
    { id: "case", name: "Корпус", icon: "🖥️" },
    { id: "cooling", name: "Охолодження", icon: "❄️" },
  ];

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    calculateTotalPrice();
    checkCompatibility();
    if (currentStep > 0) {
      fetchCompatibleParts();
    }
  }, [components, currentStep]);

  const fetchInitialData = async () => {
    try {
      const [cpusResponse] = await Promise.all([
        axios.get(
          "http://localhost:5000/api/configurator/products?category=processors"
        ),
      ]);

      setAvailableParts({
        cpu: cpusResponse.data,
      });

      fetchSavedBuilds();
    } catch (error) {
      console.error("Помилка завантаження компонентів:", error);
      toast.error("Помилка завантаження компонентів");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoriesMap = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/categories");
      const categoriesMap = {};
      response.data.forEach((cat) => {
        categoriesMap[cat.name.toLowerCase()] = cat.slug;
      });
      return categoriesMap;
    } catch (error) {
      console.error("Помилка завантаження категорій:", error);
      return {};
    }
  };

  const fetchCompatibleParts = async () => {
    try {
      const currentStepId = steps[currentStep].id;

      let url = "http://localhost:5000/api/configurator/products";
      const params = {};

      const categoryMap = {
        cpu: "processors",
        motherboard: "motherboards",
        ram: "memory",
        gpu: "graphics-cards",
        storage: "storage",
        psu: "power-supplies",
        case: "cases",
        cooling: "cooling",
      };

      params.category = categoryMap[currentStepId];

      switch (currentStepId) {
        case "motherboard":
          if (components.cpu?.socket) {
            params.socket = components.cpu.socket;
          }
          break;

        case "ram":
          if (components.motherboard?.memory_type) {
            params.memory_type = components.motherboard.memory_type;
          }
          break;

        case "gpu":
          if (components.psu?.power_requirements) {
          }
          break;

        case "psu":
          if (components.cpu || components.gpu) {
            let requiredPower = 0;
            if (components.cpu?.power_requirements)
              requiredPower += components.cpu.power_requirements;
            if (components.gpu?.power_requirements)
              requiredPower += components.gpu.power_requirements;
            if (components.ram) requiredPower += 50;
            if (components.storage) requiredPower += 30;

            requiredPower = Math.ceil(requiredPower * 1.2);

            params.min_power = requiredPower;
          }
          break;

        case "case":
          if (components.motherboard?.form_factor) {
            params.form_factor = components.motherboard.form_factor;
          }
          break;

        case "cooling":
          if (components.cpu?.socket) {
            params.socket = components.cpu.socket;
          }
          break;

        case "storage":
          break;
      }

      Object.keys(params).forEach((key) => {
        if (
          params[key] === undefined ||
          params[key] === null ||
          params[key] === ""
        ) {
          delete params[key];
        }
      });

      if (currentStepId === "cpu") {
        delete params.category;
        const response = await axios.get(
          "http://localhost:5000/api/products?category=processors"
        );
        setAvailableParts((prev) => ({
          ...prev,
          cpu: response.data,
        }));
        return;
      }

      const queryString = new URLSearchParams(params).toString();
      console.log(`Запит сумісних компонентів: ${url}?${queryString}`);

      const response = await axios.get(`${url}?${queryString}`);

      if (response.data.length === 0 && params.socket) {
        console.log(
          "Не знайдено сумісних компонентів, завантажуємо всі з категорії"
        );
        delete params.socket;
        delete params.memory_type;
        delete params.form_factor;
        delete params.min_power;

        const fallbackQuery = new URLSearchParams({
          category: categoryMap[currentStepId],
        }).toString();
        const fallbackResponse = await axios.get(`${url}?${fallbackQuery}`);

        setAvailableParts((prev) => ({
          ...prev,
          [currentStepId]: fallbackResponse.data,
        }));

        toast.info(
          `Для вашого процесора не знайдено спеціально сумісних ${steps[currentStep].name}. Показано всі доступні варіанти.`
        );
      } else {
        setAvailableParts((prev) => ({
          ...prev,
          [currentStepId]: response.data,
        }));
      }
    } catch (error) {
      console.error("Помилка завантаження сумісних частин:", error);

      try {
        const currentStepId = steps[currentStep].id;
        const categoryMap = {
          cpu: "processors",
          motherboard: "motherboards",
          ram: "memory",
          gpu: "graphics-cards",
          storage: "storage",
          psu: "power-supplies",
          case: "cases",
          cooling: "cooling",
        };

        const fallbackResponse = await axios.get(
          `http://localhost:5000/api/products?category=${categoryMap[currentStepId]}`
        );

        setAvailableParts((prev) => ({
          ...prev,
          [currentStepId]: fallbackResponse.data,
        }));

        toast.warning("Проблема з фільтрацією. Показано всі доступні товари.");
      } catch (fallbackError) {
        console.error("Резервне завантаження також не вдалося:", fallbackError);
        toast.error("Не вдалося завантажити компоненти");
      }
    }
  };

  const getCategorySlug = (stepId) => {
    const categoryMap = {
      cpu: "processors",
      motherboard: "motherboards",
      ram: "memory",
      gpu: "graphics-cards",
      storage: "storage",
      psu: "power-supplies",
      case: "cases",
      cooling: "cooling",
    };
    return categoryMap[stepId];
  };

  const fetchSavedBuilds = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get(
        "http://localhost:5000/api/pc-builds/my",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSavedBuilds(response.data);
    } catch (error) {
      console.error("Помилка завантаження збережених збірок:", error);
    }
  };

  const calculateTotalPrice = () => {
    let total = 0;
    Object.values(components).forEach((component) => {
      if (component && component.price) {
        total += parseFloat(component.price);
      }
    });
    setTotalPrice(total);
  };

  const checkCompatibility = () => {
    const issues = [];

    if (components.cpu && components.motherboard) {
      if (components.cpu.socket !== components.motherboard.socket) {
        issues.push({
          type: "error",
          message: `⚡ Несумісні сокети! Процесор (${components.cpu.socket}) ≠ Материнська плата (${components.motherboard.socket})`,
        });
      }
    }

    if (components.motherboard && components.ram) {
      if (components.motherboard.memory_type && components.ram.memory_type) {
        if (components.motherboard.memory_type !== components.ram.memory_type) {
          issues.push({
            type: "error",
            message: `💾 Несумісна пам'ять! Плата підтримує ${components.motherboard.memory_type}, а ви обрали ${components.ram.memory_type}`,
          });
        }
      }
    }

    if (components.psu) {
      let requiredPower = 0;
      if (components.cpu)
        requiredPower += components.cpu.power_requirements || 65;
      if (components.gpu)
        requiredPower += components.gpu.power_requirements || 120;
      if (components.ram) requiredPower += 20;
      if (components.storage) requiredPower += 10;

      const psuWattage = parseInt(
        components.psu.wattage || components.psu.power_requirements || 0
      );

      if (requiredPower > psuWattage) {
        issues.push({
          type: "warning",
          message: `⚡ Блок живлення може бути недостатнім! Потрібно: ${requiredPower}W, Маєте: ${psuWattage}W`,
        });
      }
    }

    if (components.motherboard && components.case) {
      const mbSize = components.motherboard.form_factor;
      const caseSize = components.case.form_factor;

      const sizeCompatibility = {
        ATX: ["ATX", "E-ATX", "Micro-ATX", "Mini-ITX"],
        "Micro-ATX": ["ATX", "Micro-ATX", "Mini-ITX"],
        "Mini-ITX": ["ATX", "Micro-ATX", "Mini-ITX"],
      };

      if (
        mbSize &&
        caseSize &&
        !sizeCompatibility[mbSize]?.includes(caseSize)
      ) {
        issues.push({
          type: "warning",
          message: `🖥️ Можлива проблема з розмірами! Плата ${mbSize} може не поміститись у корпус ${caseSize}`,
        });
      }
    }

    setCompatibilityIssues(issues);
  };

  const handleSelectComponent = (component) => {
    const currentStepId = steps[currentStep].id;
    setComponents((prev) => ({
      ...prev,
      [currentStepId]: component,
    }));

    if (currentStep < steps.length - 1) {
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
      }, 300);
    }
  };

  const handleSaveBuild = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Будь ласка, увійдіть в систему");
        return;
      }

      const buildName = prompt(
        "Введіть назву для вашої збірки:",
        `Моя збірка ${new Date().toLocaleDateString()}`
      );

      if (!buildName) return;

      const buildData = {
        name: buildName,
        components: components,
        total_price: totalPrice,
      };

      await axios.post("http://localhost:5000/api/pc-builds/save", buildData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("✅ Збірку збережено!");
      fetchSavedBuilds();
    } catch (error) {
      console.error("Помилка збереження збірки:", error);
      toast.error("Помилка збереження збірки");
    }
  };

  const handleAddAllToCart = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Будь ласка, увійдіть в систему");
        return;
      }

      for (const [type, component] of Object.entries(components)) {
        if (component && component.stock_quantity === 0) {
          toast.error(`Товар "${component.name}" немає в наявності`);
          return;
        }
      }

      for (const [type, component] of Object.entries(components)) {
        if (component) {
          await axios.post(
            "http://localhost:5000/api/cart/add",
            { productId: component.id, quantity: 1 },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      }

      toast.success(
        `🎉 Всі компоненти додано в кошик! Загальна сума: ${totalPrice} ₴`
      );
      window.location.href = "/cart";
    } catch (error) {
      console.error("Помилка додавання в кошик:", error);
      toast.error("Помилка додавання в кошик");
    }
  };

  const loadSavedBuild = (build) => {
    if (build && build.components) {
      setComponents(build.components);
      toast.success(`Збірку "${build.name}" завантажено!`);
    }
  };

  if (loading) {
    return <div className="loading">Завантаження конфігуратора...</div>;
  }

  const currentStepData = steps[currentStep];
  const currentParts = availableParts[currentStepData.id] || [];

  return (
    <div className="configurator-page">
      <div className="configurator-header">
        <h1>⚙️ Конфігуратор ПК</h1>
        <p className="subtitle">Зберіть ідеальний комп'ютер крок за кроком</p>
      </div>

      {}
      <div className="progress-bar">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`progress-step ${
              index === currentStep ? "active" : ""
            } ${components[step.id] ? "completed" : ""}`}
            onClick={() => setCurrentStep(index)}
          >
            <div className="step-icon">{step.icon}</div>
            <div className="step-name">{step.name}</div>
            {components[step.id] && <div className="step-check">✓</div>}
          </div>
        ))}
      </div>

      <div className="configurator-content">
        {}
        <div className="components-section">
          <div className="current-step-header">
            <h2>
              {currentStepData.icon} {currentStep + 1}. Обираємо{" "}
              {currentStepData.name}
            </h2>
            <p>Оберіть один з доступних варіантів:</p>
          </div>

          <div className="components-grid">
            {currentParts.length > 0 ? (
              currentParts.map((component) => (
                <div
                  key={component.id}
                  className={`component-card ${
                    components[currentStepData.id]?.id === component.id
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => handleSelectComponent(component)}
                >
                  <div className="component-image">
                    {component.image_url ? (
                      <img src={component.image_url} alt={component.name} />
                    ) : (
                      <div className="image-placeholder">
                        {currentStepData.icon}
                      </div>
                    )}
                  </div>

                  <div className="component-info">
                    <h4>{component.name}</h4>
                    <p className="component-brand">{component.brand}</p>

                    {component.specifications && (
                      <div className="component-specs">
                        {(() => {
                          try {
                            const specs =
                              typeof component.specifications === "string"
                                ? JSON.parse(component.specifications || "{}")
                                : component.specifications || {};

                            return (
                              <>
                                {specs.cores && (
                                  <span>👑 {specs.cores} ядер</span>
                                )}
                                {specs.memory && <span>💾 {specs.memory}</span>}
                                {specs.capacity && (
                                  <span>💿 {specs.capacity}</span>
                                )}
                                {specs.wattage && (
                                  <span>⚡ {specs.wattage}</span>
                                )}
                                {specs.cuda_cores && (
                                  <span>🎮 {specs.cuda_cores} ядер</span>
                                )}
                                {component.socket && (
                                  <span>🔌 {component.socket}</span>
                                )}
                                {component.memory_type && (
                                  <span>💾 {component.memory_type}</span>
                                )}
                                {component.form_factor && (
                                  <span>📦 {component.form_factor}</span>
                                )}
                              </>
                            );
                          } catch (error) {
                            console.error(
                              "Помилка парсингу специфікацій:",
                              error
                            );
                            return null;
                          }
                        })()}
                      </div>
                    )}

                    <p className="component-price">{component.price} ₴</p>
                    <p
                      className={`component-stock ${
                        component.stock_quantity === 0 ? "out-of-stock" : ""
                      }`}
                    >
                      {component.stock_quantity > 0
                        ? "✅ В наявності"
                        : "❌ Немає"}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-components">
                <p>😔 Немає доступних компонентів для цього кроку</p>
                <p>Спочатку оберіть попередні компоненти</p>
              </div>
            )}
          </div>

          {}
          <div className="step-navigation">
            <button
              onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="nav-btn prev-btn"
            >
              ← Назад
            </button>

            <button
              onClick={() =>
                setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))
              }
              disabled={currentStep === steps.length - 1}
              className="nav-btn next-btn"
            >
              Далі →
            </button>
          </div>
        </div>

        {}
        <div className="summary-section">
          <div className="summary-card">
            <h3>📋 Ваша збірка</h3>

            <div className="selected-components">
              {steps.map((step) => {
                const component = components[step.id];
                return component ? (
                  <div key={step.id} className="selected-component">
                    <span className="component-icon">{step.icon}</span>
                    <div className="component-details">
                      <strong>{component.name}</strong>
                      <span className="component-price">
                        {component.price} ₴
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        setComponents((prev) => ({ ...prev, [step.id]: null }))
                      }
                      className="remove-component"
                      title="Видалити"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div key={step.id} className="selected-component empty">
                    <span className="component-icon">{step.icon}</span>
                    <span className="component-name">
                      {step.name} - не обрано
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="summary-total">
              <h4>
                Загальна вартість:{" "}
                <span className="total-price">{totalPrice} ₴</span>
              </h4>
            </div>

            {}
            {compatibilityIssues.length > 0 && (
              <div className="compatibility-warnings">
                <h4>⚠️ Перевірка сумісності:</h4>
                {compatibilityIssues.map((issue, index) => (
                  <div
                    key={index}
                    className={`compatibility-issue ${issue.type}`}
                  >
                    {issue.message}
                  </div>
                ))}
              </div>
            )}

            {}
            <div className="action-buttons">
              <button
                onClick={handleSaveBuild}
                className="action-btn save-btn"
                disabled={
                  Object.values(components).filter((c) => c).length === 0
                }
              >
                💾 Зберегти збірку
              </button>

              <button
                onClick={handleAddAllToCart}
                className="action-btn cart-btn"
                disabled={
                  Object.values(components).filter((c) => c).length === 0 ||
                  compatibilityIssues.some((i) => i.type === "error")
                }
              >
                🛒 Купити всю збірку
              </button>

              <button
                onClick={() =>
                  setComponents({
                    cpu: null,
                    motherboard: null,
                    ram: null,
                    gpu: null,
                    storage: null,
                    psu: null,
                    case: null,
                    cooling: null,
                  })
                }
                className="action-btn clear-btn"
              >
                🗑️ Очистити все
              </button>
            </div>
          </div>

          {}
          {savedBuilds.length > 0 && (
            <div className="saved-builds">
              <h4>💾 Збережені збірки</h4>
              <div className="builds-list">
                {savedBuilds.map((build) => (
                  <div
                    key={build.id}
                    className="saved-build"
                    onClick={() => loadSavedBuild(build)}
                  >
                    <div className="build-name">{build.name}</div>
                    <div className="build-price">{build.total_price} ₴</div>
                    <div className="build-date">
                      {new Date(build.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Configurator;
