require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "pcbuilder",
};

const getConnection = async () => {
  return await mysql.createConnection(dbConfig);
};

getConnection()
  .then((conn) => {
    console.log("Підключено до MySQL");
    conn.end();
  })
  .catch((err) => {
    console.error("Помилка підключення до MySQL:", err.message);
  });

const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "Немає токену, доступ заборонено" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Невірний токен" });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Доступ заборонено. Потрібні права адміна" });
  }
  next();
};

app.post("/api/auth/register", async (req, res) => {
  let connection;
  try {
    const { email, password, firstName, lastName } = req.body;

    connection = await getConnection();

    const [existing] = await connection.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Користувач вже існує" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [result] = await connection.execute(
      "INSERT INTO users (email, password, first_name, last_name) VALUES (?, ?, ?, ?)",
      [email, hashedPassword, firstName, lastName]
    );

    const token = jwt.sign(
      { userId: result.insertId, email: email, role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      message: "Користувача створено",
      token,
      user: { id: result.insertId, email, firstName, lastName, role: "user" },
    });
  } catch (error) {
    console.error("Помилка реєстрації:", error);
    res.status(500).json({ message: "Помилка сервера" });
  } finally {
    if (connection) await connection.end();
  }
});

app.post("/api/auth/login", async (req, res) => {
  let connection;
  try {
    const { email, password } = req.body;

    connection = await getConnection();

    const [users] = await connection.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: "Невірний email або пароль" });
    }

    const user = users[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Невірний email або пароль" });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Успішний вхід",
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Помилка авторизації:", error);
    res.status(500).json({ message: "Помилка сервера" });
  } finally {
    if (connection) await connection.end();
  }
});

app.get("/api/products", async (req, res) => {
  let connection;
  try {
    connection = await getConnection();

    const [products] = await connection.execute(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.is_active = true
      ORDER BY p.created_at DESC
    `);

    res.json(products);
  } catch (error) {
    console.error("Помилка отримання товарів:", error);
    res.status(500).json({ message: "Помилка сервера" });
  } finally {
    if (connection) await connection.end();
  }
});

app.get("/api/products/search", async (req, res) => {
  let connection;
  try {
    const { query, category, brand, minPrice, maxPrice, sortBy, sortOrder } =
      req.query;
    connection = await getConnection();

    let sql = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.is_active = true
    `;
    let params = [];

    if (query) {
      sql += " AND p.name LIKE ?";
      params.push(`%${query}%`);
    }

    if (category) {
      sql += " AND c.name = ?";
      params.push(category);
    }

    if (brand) {
      sql += " AND p.brand = ?";
      params.push(brand);
    }

    if (minPrice) {
      sql += " AND p.price >= ?";
      params.push(minPrice);
    }

    if (maxPrice) {
      sql += " AND p.price <= ?";
      params.push(maxPrice);
    }

    if (sortBy) {
      const order = sortOrder === "desc" ? "DESC" : "ASC";
      sql += ` ORDER BY p.${sortBy} ${order}`;
    } else {
      sql += " ORDER BY p.created_at DESC";
    }

    const [products] = await connection.execute(sql, params);
    res.json(products);
  } catch (error) {
    console.error("Помилка пошуку:", error);
    res.status(500).json({ message: "Помилка сервера" });
  } finally {
    if (connection) await connection.end();
  }
});

app.get("/api/brands", async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const [brands] = await connection.execute(`
      SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL ORDER BY brand
    `);
    res.json(brands.map((b) => b.brand));
  } catch (error) {
    console.error("Помилка отримання брендів:", error);
    res.status(500).json({ message: "Помилка сервера" });
  } finally {
    if (connection) await connection.end();
  }
});

app.get("/api/cart", authMiddleware, async (req, res) => {
  let connection;
  try {
    const userId = req.user.userId;
    connection = await getConnection();

    const [cartItems] = await connection.execute(
      `
      SELECT ci.*, p.name, p.price, p.image_url, p.stock_quantity 
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = ? AND p.is_active = true
      ORDER BY ci.added_at DESC
    `,
      [userId]
    );

    let total = 0;
    const formattedItems = cartItems.map((item) => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;
      return {
        ...item,
        item_total: itemTotal,
      };
    });

    res.json({
      items: formattedItems,
      total_items: cartItems.length,
      total_amount: total,
    });
  } catch (error) {
    console.error("Помилка отримання кошика:", error);
    res.status(500).json({ message: "Помилка сервера" });
  } finally {
    if (connection) await connection.end();
  }
});

app.post("/api/cart/add", authMiddleware, async (req, res) => {
  let connection;
  try {
    const { productId, quantity = 1 } = req.body;
    const userId = req.user.userId;

    if (!productId) {
      return res.status(400).json({ message: "Не вказано ID товару" });
    }

    connection = await getConnection();

    const [products] = await connection.execute(
      "SELECT id, stock_quantity FROM products WHERE id = ? AND is_active = true",
      [productId]
    );

    if (products.length === 0) {
      return res.status(404).json({ message: "Товар не знайдено" });
    }

    const availableStock = products[0].stock_quantity;

    const [existing] = await connection.execute(
      "SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?",
      [userId, productId]
    );

    if (existing.length > 0) {
      const newQuantity = existing[0].quantity + quantity;

      if (newQuantity > availableStock) {
        return res.status(400).json({
          message: `На складі лише ${availableStock} шт.`,
          max_quantity: availableStock,
        });
      }

      await connection.execute(
        "UPDATE cart_items SET quantity = ? WHERE id = ?",
        [newQuantity, existing[0].id]
      );

      res.json({
        message: "Кількість оновлено",
        quantity: newQuantity,
      });
    } else {
      if (quantity > availableStock) {
        return res.status(400).json({
          message: `На складі лише ${availableStock} шт.`,
          max_quantity: availableStock,
        });
      }

      await connection.execute(
        "INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)",
        [userId, productId, quantity]
      );

      res.status(201).json({
        message: "Товар додано в кошик",
        quantity: quantity,
      });
    }
  } catch (error) {
    console.error("Помилка додавання в кошик:", error);
    res.status(500).json({ message: "Помилка сервера" });
  } finally {
    if (connection) await connection.end();
  }
});

app.put("/api/cart/update/:productId", authMiddleware, async (req, res) => {
  let connection;
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.userId;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: "Некоректна кількість" });
    }

    connection = await getConnection();

    const [products] = await connection.execute(
      "SELECT stock_quantity FROM products WHERE id = ? AND is_active = true",
      [productId]
    );

    if (products.length === 0) {
      return res.status(404).json({ message: "Товар не знайдено" });
    }

    if (quantity > products[0].stock_quantity) {
      return res.status(400).json({
        message: `На складі лише ${products[0].stock_quantity} шт.`,
        max_quantity: products[0].stock_quantity,
      });
    }

    const [result] = await connection.execute(
      "UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?",
      [quantity, userId, productId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Товар не знайдено в кошику" });
    }

    res.json({
      message: "Кількість оновлено",
      quantity: quantity,
    });
  } catch (error) {
    console.error("Помилка оновлення кошика:", error);
    res.status(500).json({ message: "Помилка сервера" });
  } finally {
    if (connection) await connection.end();
  }
});

app.delete("/api/cart/remove/:productId", authMiddleware, async (req, res) => {
  let connection;
  try {
    const { productId } = req.params;
    const userId = req.user.userId;

    connection = await getConnection();

    const [result] = await connection.execute(
      "DELETE FROM cart_items WHERE user_id = ? AND product_id = ?",
      [userId, productId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Товар не знайдено в кошику" });
    }

    res.json({ message: "Товар видалено з кошика" });
  } catch (error) {
    console.error("Помилка видалення з кошика:", error);
    res.status(500).json({ message: "Помилка сервера" });
  } finally {
    if (connection) await connection.end();
  }
});

app.delete("/api/cart/clear", authMiddleware, async (req, res) => {
  let connection;
  try {
    const userId = req.user.userId;
    connection = await getConnection();

    await connection.execute("DELETE FROM cart_items WHERE user_id = ?", [
      userId,
    ]);

    res.json({ message: "Кошик очищено" });
  } catch (error) {
    console.error("Помилка очищення кошика:", error);
    res.status(500).json({ message: "Помилка сервера" });
  } finally {
    if (connection) await connection.end();
  }
});

app.post("/api/orders/create", authMiddleware, async (req, res) => {
  let connection;
  try {
    const { shipping_address, payment_method, notes } = req.body;
    const userId = req.user.userId;

    if (!shipping_address) {
      return res.status(400).json({ message: "Вкажіть адресу доставки" });
    }

    connection = await getConnection();

    await connection.beginTransaction();

    try {
      const [cartItems] = await connection.execute(
        `
        SELECT ci.product_id, ci.quantity, p.price, p.stock_quantity, p.name
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.user_id = ? AND p.is_active = true
      `,
        [userId]
      );

      if (cartItems.length === 0) {
        throw new Error("Кошик порожній");
      }

      for (const item of cartItems) {
        if (item.quantity > item.stock_quantity) {
          throw new Error(
            `Товар "${item.name}" недоступний в такій кількості. На складі: ${item.stock_quantity} шт.`
          );
        }
      }

      let totalAmount = 0;
      cartItems.forEach((item) => {
        totalAmount += item.price * item.quantity;
      });

      const [orderResult] = await connection.execute(
        `INSERT INTO orders (user_id, total_amount, shipping_address, payment_method, notes) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, totalAmount, shipping_address, payment_method, notes]
      );

      const orderId = orderResult.insertId;

      for (const item of cartItems) {
        await connection.execute(
          `INSERT INTO order_items (order_id, product_id, quantity, price_at_order) 
           VALUES (?, ?, ?, ?)`,
          [orderId, item.product_id, item.quantity, item.price]
        );

        await connection.execute(
          "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?",
          [item.quantity, item.product_id]
        );
      }

      await connection.execute("DELETE FROM cart_items WHERE user_id = ?", [
        userId,
      ]);

      await connection.commit();

      res.status(201).json({
        message: "Замовлення успішно створено!",
        order_id: orderId,
        total_amount: totalAmount,
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Помилка створення замовлення:", error.message);
    res.status(400).json({ message: error.message || "Помилка сервера" });
  } finally {
    if (connection) await connection.end();
  }
});

app.get("/api/orders/my", authMiddleware, async (req, res) => {
  let connection;
  try {
    const userId = req.user.userId;
    connection = await getConnection();

    const [orders] = await connection.execute(
      `
      SELECT o.*, 
             COUNT(oi.id) as items_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `,
      [userId]
    );

    res.json(orders);
  } catch (error) {
    console.error("Помилка отримання замовлень:", error);
    res.status(500).json({ message: "Помилка сервера" });
  } finally {
    if (connection) await connection.end();
  }
});

app.get("/api/orders/:orderId", authMiddleware, async (req, res) => {
  let connection;
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;

    connection = await getConnection();

    const [orders] = await connection.execute(
      "SELECT * FROM orders WHERE id = ? AND user_id = ?",
      [orderId, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: "Замовлення не знайдено" });
    }

    const [orderItems] = await connection.execute(
      `
      SELECT oi.*, p.name, p.image_url, p.brand
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `,
      [orderId]
    );

    res.json({
      order: orders[0],
      items: orderItems,
    });
  } catch (error) {
    console.error("Помилка отримання замовлення:", error);
    res.status(500).json({ message: "Помилка сервера" });
  } finally {
    if (connection) await connection.end();
  }
});

app.get("/api/categories", async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const [categories] = await connection.execute(
      "SELECT * FROM categories ORDER BY name"
    );
    res.json(categories);
  } catch (error) {
    console.error("Помилка отримання категорій:", error);
    res.status(500).json({ message: "Помилка сервера" });
  } finally {
    if (connection) await connection.end();
  }
});

app.get(
  "/api/admin/stats",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    let connection;
    try {
      connection = await getConnection();

      const [userCount] = await connection.execute(
        "SELECT COUNT(*) as count FROM users"
      );
      const [productCount] = await connection.execute(
        "SELECT COUNT(*) as count FROM products WHERE is_active = true"
      );
      const [categoryCount] = await connection.execute(
        "SELECT COUNT(*) as count FROM categories"
      );
      const [lowStockProducts] = await connection.execute(
        "SELECT COUNT(*) as count FROM products WHERE stock_quantity < 10 AND is_active = true"
      );

      res.json({
        users: userCount[0].count,
        products: productCount[0].count,
        categories: categoryCount[0].count,
        lowStock: lowStockProducts[0].count,
      });
    } catch (error) {
      console.error("Помилка отримання статистики:", error);
      res.status(500).json({ message: "Помилка сервера" });
    } finally {
      if (connection) await connection.end();
    }
  }
);

app.get(
  "/api/admin/users",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    let connection;
    try {
      connection = await getConnection();
      const [users] = await connection.execute(`
      SELECT id, email, first_name, last_name, role, created_at 
      FROM users 
      ORDER BY created_at DESC
    `);
      res.json(users);
    } catch (error) {
      console.error("Помилка отримання користувачів:", error);
      res.status(500).json({ message: "Помилка сервера" });
    } finally {
      if (connection) await connection.end();
    }
  }
);

app.post(
  "/api/admin/products",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    let connection;
    try {
      const {
        name,
        description,
        price,
        category_id,
        brand,
        specifications,
        stock_quantity,
        image_url,
      } = req.body;
      connection = await getConnection();

      const [result] = await connection.execute(
        `INSERT INTO products (name, description, price, category_id, brand, specifications, stock_quantity, image_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          description,
          price,
          category_id,
          brand,
          JSON.stringify(specifications),
          stock_quantity,
          image_url,
        ]
      );

      res.status(201).json({
        message: "Товар успішно створено",
        product: { id: result.insertId, name, price, brand },
      });
    } catch (error) {
      console.error("Помилка створення товару:", error);
      res.status(500).json({ message: "Помилка сервера" });
    } finally {
      if (connection) await connection.end();
    }
  }
);

app.put(
  "/api/admin/products/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const {
        name,
        description,
        price,
        category_id,
        brand,
        specifications,
        stock_quantity,
        image_url,
        socket,
        memory_type,
        form_factor,
        power_requirements,
        is_active = true,
      } = req.body;

      console.log("Оновлення товару ID:", id);
      console.log("Дані:", req.body);

      connection = await getConnection();

      const [existingProduct] = await connection.execute(
        "SELECT id FROM products WHERE id = ?",
        [id]
      );

      if (existingProduct.length === 0) {
        return res.status(404).json({ message: "Товар не знайдено" });
      }

      const parsedSpecifications = specifications
        ? JSON.stringify(specifications)
        : "{}";
      const parsedPower = power_requirements
        ? parseInt(power_requirements)
        : null;

      const query = `
      UPDATE products 
      SET name = ?, 
          description = ?, 
          price = ?, 
          category_id = ?, 
          brand = ?, 
          specifications = ?, 
          stock_quantity = ?, 
          image_url = ?,
          socket = ?,
          memory_type = ?,
          form_factor = ?,
          power_requirements = ?,
          is_active = ?, 
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;

      const params = [
        name,
        description,
        parseFloat(price) || 0,
        parseInt(category_id) || 1,
        brand || null,
        parsedSpecifications,
        parseInt(stock_quantity) || 0,
        image_url || null,
        socket || null,
        memory_type || null,
        form_factor || null,
        parsedPower,
        is_active,
        parseInt(id),
      ];

      console.log("SQL запит:", query);
      console.log("Параметри:", params);

      await connection.execute(query, params);

      res.json({
        message: "Товар успішно оновлено",
        product_id: id,
      });
    } catch (error) {
      console.error("Помилка оновлення товару:", error.message);
      console.error("Деталі помилки:", error);
      res.status(500).json({
        message: "Помилка сервера",
        error: error.message,
      });
    } finally {
      if (connection) await connection.end();
    }
  }
);

app.delete(
  "/api/admin/products/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await getConnection();

      await connection.execute(
        "UPDATE products SET is_active = FALSE WHERE id = ?",
        [id]
      );

      res.json({ message: "Товар успішно видалено" });
    } catch (error) {
      console.error("Помилка видалення товару:", error);
      res.status(500).json({ message: "Помилка сервера" });
    } finally {
      if (connection) await connection.end();
    }
  }
);

app.get("/api/user/profile", authMiddleware, (req, res) => {
  res.json({
    message: "Доступ дозволено",
    user: req.user,
  });
});

app.get("/api/admin/dashboard", authMiddleware, adminMiddleware, (req, res) => {
  res.json({
    message: "Ласкаво просимо в адмін панель",
    user: req.user,
  });
});

app.get("/api/products", async (req, res) => {
  let connection;
  try {
    const { category, socket, memory_type, form_factor } = req.query;
    connection = await getConnection();

    let sql = `
      SELECT p.*, c.name as category_name, c.slug as category_slug 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.is_active = true
    `;
    let params = [];

    if (category) {
      sql += " AND c.slug = ?";
      params.push(category);
    }

    if (socket) {
      sql += " AND p.socket = ?";
      params.push(socket);
    }

    if (memory_type) {
      sql += " AND p.memory_type = ?";
      params.push(memory_type);
    }

    if (form_factor) {
      sql += " AND p.form_factor = ?";
      params.push(form_factor);
    }

    sql += " ORDER BY p.created_at DESC";

    const [products] = await connection.execute(sql, params);
    res.json(products);
  } catch (error) {
    console.error("Помилка отримання товарів:", error);
    res.status(500).json({ message: "Помилка сервера" });
  } finally {
    if (connection) await connection.end();
  }
});

app.post("/api/pc-builds/save", authMiddleware, async (req, res) => {
  let connection;
  try {
    const { name, components, total_price } = req.body;
    const userId = req.user.userId;

    if (!name || !components) {
      return res
        .status(400)
        .json({ message: "Необхідно вказати назву та компоненти" });
    }

    connection = await getConnection();

    const [result] = await connection.execute(
      `INSERT INTO pc_builds (user_id, name, total_price, components) 
       VALUES (?, ?, ?, ?)`,
      [userId, name, total_price, JSON.stringify(components)]
    );

    res.status(201).json({
      message: "Збірку збережено!",
      build_id: result.insertId,
    });
  } catch (error) {
    console.error("Помилка збереження збірки:", error);
    res.status(500).json({ message: "Помилка сервера" });
  } finally {
    if (connection) await connection.end();
  }
});

app.get("/api/pc-builds/my", authMiddleware, async (req, res) => {
  let connection;
  try {
    const userId = req.user.userId;
    connection = await getConnection();

    const [builds] = await connection.execute(
      `SELECT id, name, total_price, components, created_at 
       FROM pc_builds 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    );

    const formattedBuilds = builds.map((build) => ({
      ...build,
      components: JSON.parse(build.components),
    }));

    res.json(formattedBuilds);
  } catch (error) {
    console.error("Помилка отримання збірок:", error);
    res.status(500).json({ message: "Помилка сервера" });
  } finally {
    if (connection) await connection.end();
  }
});

app.get("/api/configurator/products", async (req, res) => {
  let connection;
  try {
    const { category, socket, memory_type, form_factor, min_power } = req.query;
    connection = await getConnection();

    let sql = `
      SELECT p.*, c.name as category_name, c.slug as category_slug 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.is_active = true
    `;
    let params = [];

    if (category) {
      sql += " AND c.slug = ?";
      params.push(category);
    }

    if (socket) {
      sql += " AND p.socket = ?";
      params.push(socket);
    }

    if (memory_type) {
      sql += " AND p.memory_type = ?";
      params.push(memory_type);
    }

    if (form_factor) {
      if (category === "cases") {
        const sizeOrder = { "Mini-ITX": 1, "Micro-ATX": 2, ATX: 3, "E-ATX": 4 };
        if (sizeOrder[form_factor]) {
          sql += " AND (p.form_factor = ? OR p.form_factor LIKE ?)";
          params.push(form_factor, "%ATX%");
        } else {
          sql += " AND p.form_factor = ?";
          params.push(form_factor);
        }
      } else {
        sql += " AND p.form_factor = ?";
        params.push(form_factor);
      }
    }

    if (min_power && category === "power-supplies") {
      sql += " AND (p.power_requirements >= ? OR p.name LIKE ?)";
      params.push(parseInt(min_power), `%${min_power}W%`);
    }

    sql += " ORDER BY p.price ASC";

    console.log("SQL запит:", sql, "Параметри:", params);

    const [products] = await connection.execute(sql, params);
    res.json(products);
  } catch (error) {
    console.error("Помилка отримання товарів для конфігуратора:", error);
    res.status(500).json({ message: "Помилка сервера" });
  } finally {
    if (connection) await connection.end();
  }
});

app.post("/api/pc-builds/save", authMiddleware, async (req, res) => {
  let connection;
  try {
    const { name, components, total_price } = req.body;
    const userId = req.user.userId;

    if (!name || !components) {
      return res
        .status(400)
        .json({ message: "Необхідно вказати назву та компоненти" });
    }

    connection = await getConnection();

    const [result] = await connection.execute(
      `INSERT INTO pc_builds (user_id, name, total_price, components) 
       VALUES (?, ?, ?, ?)`,
      [userId, name, total_price, JSON.stringify(components)]
    );

    res.status(201).json({
      message: "Збірку збережено!",
      build_id: result.insertId,
    });
  } catch (error) {
    console.error("Помилка збереження збірки:", error);
    res.status(500).json({ message: "Помилка сервера" });
  } finally {
    if (connection) await connection.end();
  }
});
app.put(
  "/api/admin/products/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const {
        name,
        description,
        price,
        category_id,
        brand,
        specifications,
        stock_quantity,
        image_url,
        socket,
        memory_type,
        form_factor,
        power_requirements,
        is_active = true,
      } = req.body;

      connection = await getConnection();

      await connection.execute(
        `UPDATE products 
       SET name = ?, 
           description = ?, 
           price = ?, 
           category_id = ?, 
           brand = ?, 
           specifications = ?, 
           stock_quantity = ?, 
           image_url = ?, 
           socket = ?,
           memory_type = ?,
           form_factor = ?,
           power_requirements = ?,
           is_active = ?, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
        [
          name,
          description,
          price,
          category_id,
          brand || null,
          JSON.stringify(specifications || {}),
          stock_quantity,
          image_url || null,
          socket || null,
          memory_type || null,
          form_factor || null,
          power_requirements || null,
          is_active,
          id,
        ]
      );

      res.json({ message: "Товар успішно оновлено" });
    } catch (error) {
      console.error("Помилка оновлення товару:", error);
      res.status(500).json({ message: "Помилка сервера" });
    } finally {
      if (connection) await connection.end();
    }
  }
);

app.post(
  "/api/admin/products",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    let connection;
    try {
      const {
        name,
        description,
        price,
        category_id,
        brand,
        specifications,
        stock_quantity,
        image_url,
        socket,
        memory_type,
        form_factor,
        power_requirements,
      } = req.body;

      console.log("Створення нового товару:", req.body);

      connection = await getConnection();

      const [categoryExists] = await connection.execute(
        "SELECT id FROM categories WHERE id = ?",
        [category_id]
      );

      if (categoryExists.length === 0) {
        return res.status(400).json({ message: "Категорія не існує" });
      }

      const parsedSpecifications = specifications
        ? JSON.stringify(specifications)
        : "{}";
      const parsedPower = power_requirements
        ? parseInt(power_requirements)
        : null;

      const query = `
      INSERT INTO products (
        name, description, price, category_id, brand, 
        specifications, stock_quantity, image_url,
        socket, memory_type, form_factor, power_requirements
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

      const params = [
        name,
        description,
        parseFloat(price) || 0,
        parseInt(category_id) || 1,
        brand || null,
        parsedSpecifications,
        parseInt(stock_quantity) || 0,
        image_url || null,
        socket || null,
        memory_type || null,
        form_factor || null,
        parsedPower,
      ];

      console.log("SQL запит для створення:", query);
      console.log("Параметри:", params);

      const [result] = await connection.execute(query, params);

      const [newProduct] = await connection.execute(
        `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.id = ?`,
        [result.insertId]
      );

      res.status(201).json({
        message: "Товар успішно створено",
        product: newProduct[0],
      });
    } catch (error) {
      console.error("Помилка створення товару:", error.message);
      console.error("Деталі помилки:", error);
      res.status(500).json({
        message: "Помилка сервера",
        error: error.message,
        sqlMessage: error.sqlMessage || "Немає SQL помилки",
      });
    } finally {
      if (connection) await connection.end();
    }
  }
);

app.get("/api/pc-builds/my", authMiddleware, async (req, res) => {
  let connection;
  try {
    const userId = req.user.userId;
    connection = await getConnection();

    const [builds] = await connection.execute(
      `SELECT id, name, total_price, components, created_at 
       FROM pc_builds 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [userId]
    );

    const formattedBuilds = builds.map((build) => ({
      ...build,
      components: JSON.parse(build.components || "{}"),
    }));

    res.json(formattedBuilds);
  } catch (error) {
    console.error("Помилка отримання збірок:", error);
    res.status(500).json({ message: "Помилка сервера" });
  } finally {
    if (connection) await connection.end();
  }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Сервер запущено на порті ${PORT}`);
});
