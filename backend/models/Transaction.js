const db = require("../config/db");

exports.findAllByUser = async (userId) => {
    const result = await db.query(
        `SELECT * FROM transactions
         WHERE user_id = $1
         ORDER BY transaction_date DESC, id DESC`,
        [userId]
    );
    return result.rows;
};

exports.create = async (userId, data) => {
    const {
        title,
        amount,
        type,
        category,
        description,
        transaction_date,
        ref_no,
        card_id
    } = data;

    const finalCategory = category || "General";
    const generatedRef = ref_no || `UPI/${Date.now().toString().slice(-8)}${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await db.query(
        `INSERT INTO transactions
        (user_id, title, amount, type, category, description, transaction_date, ref_no, card_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [userId, title, amount, type, finalCategory, description || "", transaction_date, generatedRef, card_id || null]
    );

    return result.rows[0];
};

exports.updateById = async (id, userId, data) => {
    const {
        title,
        amount,
        type,
        category,
        description,
        transaction_date,
        ref_no
    } = data;

    const finalCategory = category || "General";

    const result = await db.query(
        `UPDATE transactions
         SET title = $1,
             amount = $2,
             type = $3,
             category = $4,
             description = $5,
             transaction_date = $6,
             ref_no = COALESCE($7, ref_no)
         WHERE id = $8 AND user_id = $9
         RETURNING *`,
        [title, amount, type, finalCategory, description || "", transaction_date, ref_no || null, id, userId]
    );

    return result.rows[0];
};

exports.deleteById = async (id, userId) => {
    const result = await db.query(
        "DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING *",
        [id, userId]
    );
    return result.rows[0];
};
