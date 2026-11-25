const { Pool } = require("pg");
require("dotenv").config();

const poolConfig = process.env.DATABASE_URL
    ? {
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.DATABASE_URL.includes("localhost")
              ? false
              : { rejectUnauthorized: false }
      }
    : {
          user: process.env.DB_USER,
          host: process.env.DB_HOST,
          database: process.env.DB_NAME,
          password: process.env.DB_PASSWORD,
          port: process.env.DB_PORT,
          ...(process.env.DB_SSL === "true" ? { ssl: { rejectUnauthorized: false } } : {})
      };

const pool = new Pool(poolConfig);

async function initDb() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS categories (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(100) NOT NULL,
            type VARCHAR(20) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS transactions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(200) NOT NULL,
            amount NUMERIC(12, 2) NOT NULL,
            type VARCHAR(20) NOT NULL,
            category VARCHAR(100) NOT NULL,
            description TEXT,
            transaction_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS budgets (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            category VARCHAR(100) NOT NULL,
            amount NUMERIC(12, 2) NOT NULL,
            month VARCHAR(7) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, category, month)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS cards (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            card_name VARCHAR(100) NOT NULL,
            card_network VARCHAR(50) DEFAULT 'VISA',
            card_number VARCHAR(20) NOT NULL,
            balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            card_holder VARCHAR(120) NOT NULL,
            expiry_date VARCHAR(10) NOT NULL,
            theme VARCHAR(50) DEFAULT 'blue',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
    `);

    await pool.query(`
        ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS ref_no VARCHAR(100)
    `);

    await pool.query(`
        ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS card_id INTEGER REFERENCES cards(id) ON DELETE SET NULL
    `);

    await pool.query(`
        ALTER TABLE transactions
        ALTER COLUMN category DROP NOT NULL
    `);

    await pool.query(`
        ALTER TABLE categories
        ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
    `);

    await pool.query(`
        ALTER TABLE categories
        DROP CONSTRAINT IF EXISTS categories_name_key
    `);

    await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS categories_user_name_type_key
        ON categories (user_id, LOWER(name), type)
    `);

    await pool.query(`
        INSERT INTO categories (user_id, name, type)
        SELECT users.id, defaults.name, defaults.type
        FROM users
        CROSS JOIN (
            VALUES
                ('Food', 'Expense'),
                ('Travel', 'Expense'),
                ('Shopping', 'Expense'),
                ('Education', 'Expense'),
                ('Salary', 'Income')
        ) AS defaults(name, type)
        WHERE NOT EXISTS (
            SELECT 1
            FROM categories
            WHERE categories.user_id = users.id
              AND LOWER(categories.name) = LOWER(defaults.name)
              AND categories.type = defaults.type
        )
    `);
}

async function connectDb() {
    try {
        await pool.query("SELECT NOW()");
        await initDb();
        console.log("PostgreSQL Connected Successfully!");
        return true;
    } catch (error) {
        console.error("Database Connection Failed:", error.message);
        return false;
    }
}

module.exports = pool;
module.exports.connectDb = connectDb;
