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
    password: process.env.DB_PASSWORD || 'Marvit75',
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
            { userId: result.insertId },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.status(201).json({
            message: 'Користувача створено',
            token,
            user: { id: result.insertId, email, firstName, lastName }
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
            { userId: user.id },
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
                lastName: user.last_name
            }
        });
        
    } catch (error) {
        console.error('Помилка авторизації:', error);
        res.status(500).json({ message: 'Помилка сервера' });
    } finally {
        if (connection) await connection.end();
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Сервер запущено на порті ${PORT}`);
});