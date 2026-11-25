const Transaction = require("../models/Transaction");

exports.getTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.findAllByUser(req.user.id);
        res.status(200).json(transactions);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Error fetching transactions" });
    }
};

exports.addTransaction = async (req, res) => {
    try {
        const { title, amount, type, transaction_date } = req.body;

        if (!title || !amount || !type || !transaction_date) {
            return res.status(400).json({
                message: "Title, amount, type and transaction date are required"
            });
        }

        if (!["Income", "Expense"].includes(type)) {
            return res.status(400).json({ message: "Type must be Income or Expense" });
        }

        if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({ message: "Amount must be greater than zero" });
        }

        // Enforce: If balance is zero or insufficient, user cannot debit money
        if (type === "Expense") {
            const allTx = await Transaction.findAllByUser(req.user.id);
            const currentBalance = allTx.reduce((acc, t) => {
                const val = Number(t.amount) || 0;
                return t.type === "Income" ? acc + val : acc - val;
            }, 0);

            if (currentBalance <= 0) {
                return res.status(400).json({
                    message: "Transaction Declined: Your available balance is ₹0.00. You cannot debit or withdraw money when balance is zero. Please credit funds first."
                });
            }

            if (Number(amount) > currentBalance) {
                return res.status(400).json({
                    message: `Transaction Declined: Insufficient balance. Available balance is ₹${currentBalance.toFixed(2)}, which is less than the requested debit of ₹${Number(amount).toFixed(2)}.`
                });
            }
        }

        const transaction = await Transaction.create(req.user.id, req.body);

        res.status(201).json({
            message: "Transaction added successfully",
            transaction
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Error adding transaction" });
    }
};

exports.updateTransaction = async (req, res) => {
    try {
        const { title, amount, type, transaction_date } = req.body;

        if (!title || !amount || !type || !transaction_date) {
            return res.status(400).json({
                message: "Title, amount, type and transaction date are required"
            });
        }

        if (!["Income", "Expense"].includes(type)) {
            return res.status(400).json({ message: "Type must be Income or Expense" });
        }

        if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({ message: "Amount must be greater than zero" });
        }

        const transaction = await Transaction.updateById(
            req.params.id,
            req.user.id,
            req.body
        );

        if (!transaction) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        res.json({
            message: "Transaction updated successfully",
            transaction
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Error updating transaction" });
    }
};

exports.deleteTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.deleteById(
            req.params.id,
            req.user.id
        );

        if (!transaction) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        res.json({
            message: "Transaction deleted successfully",
            transaction
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Error deleting transaction" });
    }
};
