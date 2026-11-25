const Transaction = require("../models/Transaction");
const db = require("../config/db");

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
        const { title, amount, type, transaction_date, card_id } = req.body;

        if (!title || !amount || !type || !transaction_date) {
            return res.status(400).json({
                message: "Title, amount, type and transaction date are required"
            });
        }

        if (!["Income", "Expense"].includes(type)) {
            return res.status(400).json({ message: "Type must be Income or Expense" });
        }

        const numAmount = Number(amount);
        if (!Number.isFinite(numAmount) || numAmount <= 0) {
            return res.status(400).json({ message: "Amount must be greater than zero" });
        }

        // Fetch user's cards to compute card-based balance and update card balance
        const cardsRes = await db.query(
            "SELECT * FROM cards WHERE user_id = $1 ORDER BY id ASC",
            [req.user.id]
        );
        const cards = cardsRes.rows;
        const totalCardBalance = cards.reduce((sum, c) => sum + (Number(c.balance) || 0), 0);

        // Fetch transactions for transaction balance fallback
        const allTx = await Transaction.findAllByUser(req.user.id);
        const txBalance = allTx.reduce((acc, t) => {
            const val = Number(t.amount) || 0;
            return t.type === "Income" ? acc + val : acc - val;
        }, 0);

        // Total Available balance is strictly based on cards if cards exist, else transactions
        const availableBalance = cards.length > 0 ? totalCardBalance : txBalance;

        // Determine target card if cards exist in user vault
        let targetCard = null;
        if (cards.length > 0) {
            if (card_id) {
                targetCard = cards.find((c) => c.id === Number(card_id));
            }
            if (!targetCard) {
                targetCard = type === "Expense"
                    ? cards.find((c) => Number(c.balance) >= numAmount) || cards[0]
                    : cards[0];
            }
        }

        // Enforce: If balance is zero or insufficient, user cannot debit money
        if (type === "Expense") {
            if (availableBalance <= 0) {
                return res.status(400).json({
                    message: "Transaction Declined: Your available balance is ₹0.00. You cannot debit or withdraw money when balance is zero. Please deposit/credit funds first."
                });
            }

            if (numAmount > availableBalance) {
                return res.status(400).json({
                    message: `Transaction Declined: Insufficient balance. Available balance is ₹${availableBalance.toFixed(2)}, which is less than the requested debit of ₹${numAmount.toFixed(2)}.`
                });
            }

            if (targetCard && Number(targetCard.balance) < numAmount) {
                return res.status(400).json({
                    message: `Transaction Declined: Card "${targetCard.card_name}" has ₹${Number(targetCard.balance).toFixed(2)}, which is less than requested debit of ₹${numAmount.toFixed(2)}. Please choose another card with sufficient funds.`
                });
            }
        }

        // Create transaction record
        const transaction = await Transaction.create(req.user.id, {
            ...req.body,
            card_id: targetCard ? targetCard.id : null
        });

        // Automatically sync & update target card balance in database!
        if (targetCard) {
            const balanceDelta = type === "Income" ? numAmount : -numAmount;
            await db.query(
                "UPDATE cards SET balance = balance + $1 WHERE id = $2 AND user_id = $3",
                [balanceDelta, targetCard.id, req.user.id]
            );
        }

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
