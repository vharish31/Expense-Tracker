const db = require("../config/db");

const DEFAULT_CATEGORIES = [
    { name: "Food", type: "Expense" },
    { name: "Travel", type: "Expense" },
    { name: "Shopping", type: "Expense" },
    { name: "Education", type: "Expense" },
    { name: "Salary", type: "Income" }
];

exports.createUser = async ({ name, email, password, phone, payment_pin, is_email_verified = true }) => {
    const result = await db.query(
        `INSERT INTO users (name, email, password, phone, payment_pin, is_email_verified)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, email, phone, (payment_pin IS NOT NULL) AS has_pin, is_email_verified, created_at`,
        [name, email, password, phone || null, payment_pin || null, is_email_verified]
    );

    const user = result.rows[0];

    for (const category of DEFAULT_CATEGORIES) {
        await db.query(
            `INSERT INTO categories (user_id, name, type)
             VALUES ($1, $2, $3)`,
            [user.id, category.name, category.type]
        );
    }

    return user;
};

exports.findByEmail = async (email) => {
    const result = await db.query(
        "SELECT id, name, email, phone, password, payment_pin, (payment_pin IS NOT NULL) AS has_pin, created_at FROM users WHERE email = $1",
        [email]
    );
    return result.rows[0];
};

exports.findByPhone = async (phone) => {
    const result = await db.query(
        "SELECT id, name, email, phone, created_at FROM users WHERE phone = $1",
        [phone]
    );
    return result.rows[0];
};

exports.findById = async (id) => {
    const result = await db.query(
        "SELECT id, name, email, phone, (payment_pin IS NOT NULL) AS has_pin, created_at FROM users WHERE id = $1",
        [id]
    );
    return result.rows[0];
};

exports.findWithPinById = async (id) => {
    const result = await db.query(
        "SELECT id, name, email, phone, payment_pin, created_at FROM users WHERE id = $1",
        [id]
    );
    return result.rows[0];
};

exports.updatePaymentPin = async (id, hashedPin) => {
    const result = await db.query(
        "UPDATE users SET payment_pin = $1 WHERE id = $2 RETURNING id, name, email, phone, (payment_pin IS NOT NULL) AS has_pin",
        [hashedPin, id]
    );
    return result.rows[0];
};
