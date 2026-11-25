const db = require("../config/db");

const DEFAULT_CATEGORIES = [
    { name: "Food", type: "Expense" },
    { name: "Travel", type: "Expense" },
    { name: "Shopping", type: "Expense" },
    { name: "Education", type: "Expense" },
    { name: "Salary", type: "Income" }
];

exports.createUser = async ({ name, email, password }) => {
    const result = await db.query(
        `INSERT INTO users (name, email, password)
         VALUES ($1, $2, $3)
         RETURNING id, name, email, created_at`,
        [name, email, password]
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
        "SELECT * FROM users WHERE email = $1",
        [email]
    );
    return result.rows[0];
};

exports.findById = async (id) => {
    const result = await db.query(
        "SELECT id, name, email, created_at FROM users WHERE id = $1",
        [id]
    );
    return result.rows[0];
};
