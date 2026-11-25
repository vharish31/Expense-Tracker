const db = require("../config/db");

exports.getCategories = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM categories
             WHERE user_id = $1
             ORDER BY type, name`,
            [req.user.id]
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ message: "Error fetching categories" });
    }
};

exports.addCategory = async (req, res) => {
    try {
        const { name, type } = req.body;

        if (!name || !type) {
            return res.status(400).json({
                message: "Name and type are required"
            });
        }

        if (!["Income", "Expense"].includes(type)) {
            return res.status(400).json({ message: "Type must be Income or Expense" });
        }

        const result = await db.query(
            `INSERT INTO categories (user_id, name, type)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [req.user.id, name.trim(), type]
        );

        res.status(201).json({
            message: "Category added successfully",
            category: result.rows[0]
        });
    } catch (error) {
        console.error("Error adding category:", error);
        res.status(500).json({ message: "Error adding category" });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const result = await db.query(
            "DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING *",
            [req.params.id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Category not found" });
        }

        res.status(200).json({
            message: "Category deleted successfully",
            category: result.rows[0]
        });
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ message: "Error deleting category" });
    }
};
