const db = require("../config/db");

// Get all cards belonging to the logged-in user
exports.getCards = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM cards
             WHERE user_id = $1
             ORDER BY id ASC`,
            [req.user.id]
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Error fetching cards:", error);
        res.status(500).json({ message: "Error fetching cards from vault" });
    }
};

// Add a new card / vault
exports.addCard = async (req, res) => {
    try {
        const { card_name, card_network, card_number, balance, card_holder, expiry_date, theme } = req.body;

        if (balance !== undefined && balance !== null) {
            const numBal = Number(balance);
            if (!Number.isFinite(numBal) || numBal < 0) {
                return res.status(400).json({ message: "Card balance cannot be negative" });
            }
        }

        if (!card_name || !card_number) {
            return res.status(400).json({
                message: "Card name and card number are required"
            });
        }

        // Enforce maximum 4 vault cards per user
        const countResult = await db.query(
            "SELECT COUNT(*) FROM cards WHERE user_id = $1",
            [req.user.id]
        );
        const currentCardCount = parseInt(countResult.rows[0].count, 10);
        if (currentCardCount >= 4) {
            return res.status(400).json({
                message: "You can maintain a maximum of 4 vault cards. Please remove an existing vault to add a new one."
            });
        }

        // Format card number to masked display (e.g., "VISA •••• 4785")
        const cleanNumber = String(card_number).replace(/\s+/g, "");
        const last4 = cleanNumber.slice(-4) || "0000";
        const network = card_network || "VISA";
        const maskedNumber = `${network} •••• ${last4}`;

        const holder = card_holder || req.user.name || "CARD HOLDER";
        const expiry = expiry_date || "12/2028";
        const cardTheme = theme || "blue";
        const cardBalance = balance !== undefined && balance !== null && balance !== "" ? Number(balance) : 0.00;
        if (!Number.isFinite(cardBalance) || cardBalance < 0) {
            return res.status(400).json({
                message: "Vault card balance cannot be negative"
            });
        }

        const result = await db.query(
            `INSERT INTO cards (user_id, card_name, card_network, card_number, balance, card_holder, expiry_date, theme)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [req.user.id, card_name.trim(), network, maskedNumber, cardBalance, holder.trim().toUpperCase(), expiry, cardTheme]
        );

        res.status(201).json({
            message: "Card added to vault successfully",
            card: result.rows[0]
        });
    } catch (error) {
        console.error("Error adding card:", error);
        res.status(500).json({ message: "Error adding card to vault" });
    }
};

// Remove a card from the vault
exports.deleteCard = async (req, res) => {
    try {
        const result = await db.query(
            "DELETE FROM cards WHERE id = $1 AND user_id = $2 RETURNING *",
            [req.params.id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Card not found in your vault" });
        }

        res.status(200).json({
            message: "Card removed from vault successfully",
            deletedCard: result.rows[0]
        });
    } catch (error) {
        console.error("Error deleting card:", error);
        res.status(500).json({ message: "Error deleting card from vault" });
    }
};

// Update card (balance, name, etc.)
exports.updateCard = async (req, res) => {
    try {
        const { card_name, card_network, card_number, balance, card_holder, expiry_date, theme } = req.body;

        if (balance !== undefined && balance !== null) {
            const numBal = Number(balance);
            if (!Number.isFinite(numBal) || numBal < 0) {
                return res.status(400).json({ message: "Card balance cannot be negative" });
            }
        }

        const result = await db.query(
            `UPDATE cards
             SET card_name = COALESCE($1, card_name),
                 card_network = COALESCE($2, card_network),
                 card_number = COALESCE($3, card_number),
                 balance = COALESCE($4, balance),
                 card_holder = COALESCE($5, card_holder),
                 expiry_date = COALESCE($6, expiry_date),
                 theme = COALESCE($7, theme)
             WHERE id = $8 AND user_id = $9
             RETURNING *`,
            [
                card_name || null,
                card_network || null,
                card_number || null,
                balance !== undefined ? Number(balance) : null,
                card_holder || null,
                expiry_date || null,
                theme || null,
                req.params.id,
                req.user.id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Card not found in your vault" });
        }

        res.status(200).json({
            message: "Card updated successfully",
            card: result.rows[0]
        });
    } catch (error) {
        console.error("Error updating card:", error);
        res.status(500).json({ message: "Error updating card" });
    }
};
