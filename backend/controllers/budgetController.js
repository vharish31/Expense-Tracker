const db = require("../config/db");

exports.getBudgets = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM budgets
             WHERE user_id = $1
             ORDER BY month DESC, category`,
            [req.user.id]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Error fetching budgets:", error);
        res.status(500).json({ message: "Error fetching budgets" });
    }
};

exports.getBudgetByMonth = async (req, res) => {
    try {
        const { month } = req.params;
        const result = await db.query(
            `SELECT * FROM budgets
             WHERE user_id = $1 AND month = $2`,
            [req.user.id, month]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Error fetching budgets:", error);
        res.status(500).json({ message: "Error fetching budgets" });
    }
};

exports.addBudget = async (req, res) => {
    try {
        const { category, amount, month } = req.body;

        if (!category || !amount || !month) {
            return res.status(400).json({
                message: "Category, amount and month are required"
            });
        }

        if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({ message: "Amount must be greater than zero" });
        }

        const result = await db.query(
            `INSERT INTO budgets (user_id, category, amount, month)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, category, month)
             DO UPDATE SET amount = $3
             RETURNING *`,
            [req.user.id, category, amount, month]
        );

        res.status(201).json({
            message: "Budget saved successfully",
            budget: result.rows[0]
        });
    } catch (error) {
        console.error("Error adding budget:", error);
        res.status(500).json({ message: "Error adding budget" });
    }
};

exports.updateBudget = async (req, res) => {
    try {
        const { category, amount, month } = req.body;

        if (!category || !amount || !month) {
            return res.status(400).json({
                message: "Category, amount and month are required"
            });
        }

        const result = await db.query(
            `UPDATE budgets
             SET amount = $1
             WHERE id = $2 AND user_id = $3
             RETURNING *`,
            [amount, req.params.id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Budget not found" });
        }

        res.json({
            message: "Budget updated successfully",
            budget: result.rows[0]
        });
    } catch (error) {
        console.error("Error updating budget:", error);
        res.status(500).json({ message: "Error updating budget" });
    }
};

exports.deleteBudget = async (req, res) => {
    try {
        const result = await db.query(
            "DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING *",
            [req.params.id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Budget not found" });
        }

        res.status(200).json({
            message: "Budget deleted successfully",
            budget: result.rows[0]
        });
    } catch (error) {
        console.error("Error deleting budget:", error);
        res.status(500).json({ message: "Error deleting budget" });
    }
};
