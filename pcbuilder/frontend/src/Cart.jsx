import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const Cart = () => {
  const [cart, setCart] = useState({ items: [], total_amount: 0 });
  const [loading, setLoading] = useState(true);
  const [checkoutData, setCheckoutData] = useState({
    shipping_address: "",
    payment_method: "cash_on_delivery",
    notes: "",
  });
  const [showCheckout, setShowCheckout] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Будь ласка, увійдіть в систему");
        navigate("/");
        return;
      }

      const response = await axios.get("http://localhost:5000/api/cart", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCart(response.data);
    } catch (error) {
      console.error("Помилка завантаження кошика:", error);
      if (error.response?.status === 401) {
        toast.error("Сесія закінчилась. Увійдіть знову");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/";
      }
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) return;

    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:5000/api/cart/update/${productId}`,
        { quantity: newQuantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Кількість оновлено");
      fetchCart();
    } catch (error) {
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
        if (error.response.data.max_quantity) {
          const maxQty = error.response.data.max_quantity;
          await axios.put(
            `http://localhost:5000/api/cart/update/${productId}`,
            { quantity: maxQty },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          fetchCart();
        }
      } else {
        toast.error("Помилка оновлення");
      }
    }
  };

  const removeItem = async (productId) => {
    if (!window.confirm("Видалити товар з кошика?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/api/cart/remove/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Товар видалено з кошика");
      fetchCart();
    } catch (error) {
      toast.error("Помилка видалення");
    }
  };

  const clearCart = async () => {
    if (!window.confirm("Очистити весь кошик?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete("http://localhost:5000/api/cart/clear", {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Кошик очищено");
      fetchCart();
    } catch (error) {
      toast.error("Помилка очищення кошика");
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!checkoutData.shipping_address.trim()) {
      toast.error("Вкажіть адресу доставки");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:5000/api/orders/create",
        checkoutData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(response.data.message);
      setCart({ items: [], total_amount: 0 });
      setShowCheckout(false);

      alert(
        `✅ Замовлення #${response.data.order_id} створено!\nСума: ${response.data.total_amount} ₴\nСтатус можна переглянути в особистому кабінеті.`
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Помилка оформлення замовлення"
      );
    }
  };

  if (loading) {
    return (
      <div className="cart-page">
        <div className="loading">Завантаження кошика...</div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <h1>🛒 Кошик покупок</h1>

      {cart.items.length === 0 ? (
        <div className="empty-cart">
          <div className="empty-icon">🛒</div>
          <h3>Кошик порожній</h3>
          <p>Додайте товари з каталогу, щоб зробити покупку</p>
          <button
            onClick={() => navigate("/products")}
            className="cta-btn primary"
          >
            Перейти до каталогу
          </button>
        </div>
      ) : (
        <>
          <div className="cart-content">
            <div className="cart-items">
              {cart.items.map((item) => (
                <div key={item.id} className="cart-item-card">
                  <div className="cart-item-image">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} />
                    ) : (
                      <div className="image-placeholder">🖥️</div>
                    )}
                  </div>

                  <div className="cart-item-info">
                    <h4>{item.name}</h4>
                    <p className="item-price">{item.price} ₴ за шт.</p>

                    <div className="quantity-controls">
                      <button
                        onClick={() =>
                          updateQuantity(item.product_id, item.quantity - 1)
                        }
                        disabled={item.quantity <= 1}
                      >
                        −
                      </button>
                      <span className="quantity">{item.quantity} шт.</span>
                      <button
                        onClick={() =>
                          updateQuantity(item.product_id, item.quantity + 1)
                        }
                      >
                        +
                      </button>
                    </div>

                    <p className="item-total">Сума: {item.item_total} ₴</p>
                  </div>

                  <button
                    onClick={() => removeItem(item.product_id)}
                    className="remove-item-btn"
                    title="Видалити"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <h3>Підсумок</h3>

              <div className="summary-details">
                <div className="summary-row">
                  <span>Товари ({cart.total_items}):</span>
                  <span>{cart.total_amount} ₴</span>
                </div>
                <div className="summary-row">
                  <span>Доставка:</span>
                  <span>За тарифами перевізника</span>
                </div>
                <div className="summary-row total">
                  <span>До сплати:</span>
                  <span className="final-amount">{cart.total_amount} ₴</span>
                </div>
              </div>

              <button
                onClick={() => setShowCheckout(true)}
                className="checkout-btn"
              >
                💳 Оформити замовлення
              </button>

              <button onClick={clearCart} className="clear-cart-btn">
                Очистити кошик
              </button>

              <button
                onClick={() => navigate("/products")}
                className="continue-shopping"
              >
                ← Продовжити покупки
              </button>
            </div>
          </div>

          {}
          {showCheckout && (
            <div className="checkout-modal">
              <div className="modal-content">
                <div className="modal-header">
                  <h3>💳 Оформлення замовлення</h3>
                  <button
                    onClick={() => setShowCheckout(false)}
                    className="close-modal"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCheckout}>
                  <div className="form-group">
                    <label>Адреса доставки *</label>
                    <textarea
                      value={checkoutData.shipping_address}
                      onChange={(e) =>
                        setCheckoutData({
                          ...checkoutData,
                          shipping_address: e.target.value,
                        })
                      }
                      placeholder="Вкажіть повну адресу (місто, вулиця, будинок, квартира)"
                      required
                      rows="3"
                    />
                  </div>

                  <div className="form-group">
                    <label>Спосіб оплати</label>
                    <select
                      value={checkoutData.payment_method}
                      onChange={(e) =>
                        setCheckoutData({
                          ...checkoutData,
                          payment_method: e.target.value,
                        })
                      }
                    >
                      <option value="cash_on_delivery">
                        💵 Готівкою при отриманні
                      </option>
                      <option value="card_online">💳 Картою онлайн</option>
                      <option value="bank_transfer">
                        🏦 Банківський переказ
                      </option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Коментар до замовлення (необов'язково)</label>
                    <textarea
                      value={checkoutData.notes}
                      onChange={(e) =>
                        setCheckoutData({
                          ...checkoutData,
                          notes: e.target.value,
                        })
                      }
                      placeholder="Ваші побажання щодо доставки тощо..."
                      rows="2"
                    />
                  </div>

                  <div className="order-summary">
                    <h4>До сплати: {cart.total_amount} ₴</h4>
                    <p>
                      Після підтвердження з вами зв'яжеться менеджер для
                      уточнення деталей.
                    </p>
                  </div>

                  <div className="modal-actions">
                    <button
                      type="button"
                      onClick={() => setShowCheckout(false)}
                      className="cancel-btn"
                    >
                      Скасувати
                    </button>
                    <button type="submit" className="confirm-btn">
                      ✅ Підтвердити замовлення
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Cart;
