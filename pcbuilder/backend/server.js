require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root', 
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pcbuilder'
};

const getConnection = async () => {
    return await mysql.createConnection(dbConfig);
};

getConnection()
    .then(conn => {
        console.log('Підключено до MySQL');
        conn.end();
    })
    .catch(err => {
        console.error('Помилка підключення до MySQL:', err.message);
    });

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'Немає токену, доступ заборонено' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Невірний токен' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Доступ заборонено. Потрібні права адміна' });
  }
  next();
};

app.post('/api/auth/register', async (req, res) => {
    let connection;
    try {
        const { email, password, firstName, lastName } = req.body;
        
        connection = await getConnection();
        
        const [existing] = await connection.execute(
            'SELECT id FROM users WHERE email = ?', 
            [email]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Користувач вже існує' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 12);
        
        const [result] = await connection.execute(
            'INSERT INTO users (email, password, first_name, last_name) VALUES (?, ?, ?, ?)',
            [email, hashedPassword, firstName, lastName]
        );
        
        const token = jwt.sign(
            { userId: result.insertId, email: email, role: 'user' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.status(201).json({
            message: 'Користувача створено',
            token,
            user: { id: result.insertId, email, firstName, lastName, role: 'user' }
        });
        
    } catch (error) {
        console.error('Помилка реєстрації:', error);
        res.status(500).json({ message: 'Помилка сервера' });
    } finally {
        if (connection) await connection.end();
    }
});

app.post('/api/auth/login', async (req, res) => {
    let connection;
    try {
        const { email, password } = req.body;
        
        connection = await getConnection();
        
        const [users] = await connection.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            return res.status(400).json({ message: 'Невірний email або пароль' });
        }
        
        const user = users[0];
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Невірний email або пароль' });
        }
        
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            message: 'Успішний вхід',
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            }
        });
        
    } catch (error) {
        console.error('Помилка авторизації:', error);
        res.status(500).json({ message: 'Помилка сервера' });
    } finally {
        if (connection) await connection.end();
    }
});

app.get('/api/products', async (req, res) => {
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
    console.error('Помилка отримання товарів:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  } finally {
    if (connection) await connection.end();
  }
});

app.get('/api/products/search', async (req, res) => {
  let connection;
  try {
    const { query, category, brand, minPrice, maxPrice, sortBy, sortOrder } = req.query;
    connection = await getConnection();
    
    let sql = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.is_active = true
    `;
    let params = [];
    
    if (query) {
      sql += ' AND p.name LIKE ?';
      params.push(`%${query}%`);
    }
    
    if (category) {
      sql += ' AND c.name = ?';
      params.push(category);
    }
    
    if (brand) {
      sql += ' AND p.brand = ?';
      params.push(brand);
    }
    
    if (minPrice) {
      sql += ' AND p.price >= ?';
      params.push(minPrice);
    }
    
    if (maxPrice) {
      sql += ' AND p.price <= ?';
      params.push(maxPrice);
    }
    
    if (sortBy) {
      const order = sortOrder === 'desc' ? 'DESC' : 'ASC';
      sql += ` ORDER BY p.${sortBy} ${order}`;
    } else {
      sql += ' ORDER BY p.created_at DESC';
    }
    
    const [products] = await connection.execute(sql, params);
    res.json(products);
    
  } catch (error) {
    console.error('Помилка пошуку:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  } finally {
    if (connection) await connection.end();
  }
});

app.get('/api/brands', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const [brands] = await connection.execute(`
      SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL ORDER BY brand
    `);
    res.json(brands.map(b => b.brand));
  } catch (error) {
    console.error('Помилка отримання брендів:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  } finally {
    if (connection) await connection.end();
  }
});

app.get('/api/categories', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const [categories] = await connection.execute('SELECT * FROM categories ORDER BY name');
    res.json(categories);
  } catch (error) {
    console.error('Помилка отримання категорій:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  } finally {
    if (connection) await connection.end();
  }
});

app.get('/api/admin/stats', authMiddleware, adminMiddleware, async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    
    const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
    const [productCount] = await connection.execute('SELECT COUNT(*) as count FROM products WHERE is_active = true');
    const [categoryCount] = await connection.execute('SELECT COUNT(*) as count FROM categories');
    const [lowStockProducts] = await connection.execute('SELECT COUNT(*) as count FROM products WHERE stock_quantity < 10 AND is_active = true');
    
    res.json({
      users: userCount[0].count,
      products: productCount[0].count,
      categories: categoryCount[0].count,
      lowStock: lowStockProducts[0].count
    });
    
  } catch (error) {
    console.error('Помилка отримання статистики:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  } finally {
    if (connection) await connection.end();
  }
});

app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
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
    console.error('Помилка отримання користувачів:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  } finally {
    if (connection) await connection.end();
  }
});

app.post('/api/admin/products', authMiddleware, adminMiddleware, async (req, res) => {
  let connection;
  try {
    const { name, description, price, category_id, brand, specifications, stock_quantity, image_url } = req.body;
    connection = await getConnection();
    
    const [result] = await connection.execute(
      `INSERT INTO products (name, description, price, category_id, brand, specifications, stock_quantity, image_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description, price, category_id, brand, JSON.stringify(specifications), stock_quantity, image_url]
    );
    
    res.status(201).json({ 
      message: 'Товар успішно створено', 
      product: { id: result.insertId, name, price, brand } 
    });
    
  } catch (error) {
    console.error('Помилка створення товару:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  } finally {
    if (connection) await connection.end();
  }
});

app.put('/api/admin/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { name, description, price, category_id, brand, specifications, stock_quantity, image_url, is_active } = req.body;
    connection = await getConnection();
    
    await connection.execute(
      `UPDATE products 
       SET name = ?, description = ?, price = ?, category_id = ?, brand = ?, 
           specifications = ?, stock_quantity = ?, image_url = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [name, description, price, category_id, brand, JSON.stringify(specifications), stock_quantity, image_url, is_active, id]
    );
    
    res.json({ message: 'Товар успішно оновлено' });
    
  } catch (error) {
    console.error('Помилка оновлення товару:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  } finally {
    if (connection) await connection.end();
  }
});

app.delete('/api/admin/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    connection = await getConnection();
    
    await connection.execute(
      'UPDATE products SET is_active = FALSE WHERE id = ?',
      [id]
    );
    
    res.json({ message: 'Товар успішно видалено' });
    
  } catch (error) {
    console.error('Помилка видалення товару:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  } finally {
    if (connection) await connection.end();
  }
});

app.get('/api/user/profile', authMiddleware, (req, res) => {
  res.json({ 
    message: 'Доступ дозволено', 
    user: req.user 
  });
});

app.get('/api/admin/dashboard', authMiddleware, adminMiddleware, (req, res) => {
  res.json({ 
    message: 'Ласкаво просимо в адмін панель', 
    user: req.user 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Сервер запущено на порті ${PORT}`);
});