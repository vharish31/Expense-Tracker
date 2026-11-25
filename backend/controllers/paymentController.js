const db = require("../config/db");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const { validatePaymentPin } = require("../utils/validation");

// Lookup a registered user by their 10-digit mobile number
exports.lookupUserByPhone = async (req, res) => {
    try {
        const { phone } = req.query;

        if (!phone) {
            return res.status(400).json({ message: "Mobile number is required" });
        }

        const cleanPhone = String(phone).replace(/\D/g, "").slice(-10);
        if (cleanPhone.length !== 10) {
            return res.status(400).json({ message: "Please enter a valid 10-digit mobile number" });
        }

        const recipient = await User.findByPhone(cleanPhone);
        if (!recipient) {
            return res.status(404).json({
                message: `No registered user found with mobile number +91 ${cleanPhone}. Please verify the number.`
            });
        }

        if (recipient.id === req.user.id) {
            return res.status(400).json({
                message: "Self-transfer not allowed: You cannot pay to your own mobile number."
            });
        }

        res.status(200).json({
            exists: true,
            user: {
                id: recipient.id,
                name: recipient.name,
                phone: recipient.phone
            }
        });
    } catch (error) {
        console.error("Lookup user error:", error);
        res.status(500).json({ message: "Error looking up recipient" });
    }
};

// Transfer funds to any registered user by mobile number
exports.transferFunds = async (req, res) => {
    const client = await db.connect();

    try {
        const { recipient_phone, amount, notes, card_id, pin } = req.body;

        if (!pin) {
            return res.status(400).json({ message: "Security PIN is required to authorize payment" });
        }

        const pinVal = validatePaymentPin(pin);
        if (!pinVal.valid) {
            return res.status(400).json({ message: pinVal.error });
        }

        // Fetch sender's full profile including hashed payment PIN
        const sender = await User.findWithPinById(req.user.id);
        if (!sender || !sender.payment_pin) {
            return res.status(400).json({
                message: "You have not set your 4-digit Security PIN yet. Please set your PIN first."
            });
        }

        // Verify Security PIN
        const isPinCorrect = await bcrypt.compare(pinVal.value, sender.payment_pin);
        if (!isPinCorrect) {
            if (req.recordFailedPin) req.recordFailedPin();
            return res.status(400).json({
                message: "Incorrect Security PIN. Payment was declined and no money was deducted."
            });
        }

        if (req.clearFailedPin) req.clearFailedPin();

        if (!recipient_phone) {
            return res.status(400).json({ message: "Recipient mobile number is required" });
        }

        const numAmount = Number(amount);
        if (!Number.isFinite(numAmount) || numAmount <= 0) {
            return res.status(400).json({ message: "Please enter a valid payment amount greater than zero" });
        }

        const cleanPhone = String(recipient_phone).replace(/\D/g, "").slice(-10);
        if (cleanPhone.length !== 10) {
            return res.status(400).json({ message: "Please enter a valid 10-digit mobile number" });
        }

        // Look up recipient
        const recipient = await User.findByPhone(cleanPhone);
        if (!recipient) {
            return res.status(404).json({
                message: `No registered user found with mobile number +91 ${cleanPhone}. Payment cannot proceed.`
            });
        }

        if (recipient.id === req.user.id) {
            return res.status(400).json({
                message: "You cannot transfer money to your own mobile number"
            });
        }

        // Look up sender's vault cards
        const senderCardsRes = await client.query(
            "SELECT * FROM cards WHERE user_id = $1 ORDER BY id ASC",
            [req.user.id]
        );
        const senderCards = senderCardsRes.rows;

        if (senderCards.length === 0) {
            return res.status(400).json({
                message: "Payment Declined: You do not have any cards in your Multi-Card Vault. Please add a vault card with funds first."
            });
        }

        // Find paying card
        let payingCard = null;
        if (card_id) {
            payingCard = senderCards.find((c) => c.id === Number(card_id));
        }

        if (!payingCard) {
            payingCard = senderCards.find((c) => Number(c.balance) >= numAmount) || senderCards[0];
        }

        if (Number(payingCard.balance) < numAmount) {
            return res.status(400).json({
                message: `Payment Declined: Insufficient balance on card "${payingCard.card_name}". Available is ₹${Number(payingCard.balance).toFixed(2)}, which is less than ₹${numAmount.toFixed(2)}.`
            });
        }

        // BEGIN ATOMIC TRANSACTION
        await client.query("BEGIN");

        // 1. Debit sender's card
        const updatedSenderCardRes = await client.query(
            `UPDATE cards
             SET balance = balance - $1
             WHERE id = $2 AND user_id = $3
             RETURNING *`,
            [numAmount, payingCard.id, req.user.id]
        );

        // 2. Credit recipient's card (or create primary vault card if none exists)
        const recipientCardsRes = await client.query(
            "SELECT * FROM cards WHERE user_id = $1 ORDER BY id ASC",
            [recipient.id]
        );
        let recipientCardId = null;

        if (recipientCardsRes.rows.length > 0) {
            const recipientCard = recipientCardsRes.rows[0];
            recipientCardId = recipientCard.id;
            await client.query(
                `UPDATE cards
                 SET balance = balance + $1
                 WHERE id = $2`,
                [numAmount, recipientCard.id]
            );
        } else {
            // Auto-create initial vault card for recipient so their balance reflects immediately!
            const newCardRes = await client.query(
                `INSERT INTO cards (user_id, card_name, card_network, card_number, balance, card_holder, expiry_date, theme)
                 VALUES ($1, 'Main Vault', 'VISA', 'VISA •••• 1001', $2, $3, '12/2029', 'blue')
                 RETURNING id`,
                [recipient.id, numAmount, recipient.name.toUpperCase()]
            );
            recipientCardId = newCardRes.rows[0].id;
        }

        // 3. Generate unified reference UTR
        const todayDate = new Date().toISOString().slice(0, 10);
        const utrNumber = `UPI/PAY/${Date.now().toString().slice(-8)}${Math.floor(1000 + Math.random() * 9000)}`;

        // 4. Record Sender's Ledger Transaction (Debit)
        const senderTitle = `Paid to ${recipient.name}`;
        const senderDesc = `Transfer to Mobile: +91 ${recipient.phone}${notes ? ` | Note: ${notes.trim()}` : ""}`;
        await client.query(
            `INSERT INTO transactions
             (user_id, title, amount, type, category, description, transaction_date, ref_no, card_id)
             VALUES ($1, $2, $3, 'Expense', 'Transfer', $4, $5, $6, $7)`,
            [req.user.id, senderTitle, numAmount, senderDesc, todayDate, utrNumber, payingCard.id]
        );

        // 5. Record Recipient's Ledger Transaction (Credit)
        const recipientTitle = `Received from ${sender.name}`;
        const recipientDesc = `Transfer from Mobile: +91 ${sender.phone || "User"}${notes ? ` | Note: ${notes.trim()}` : ""}`;
        await client.query(
            `INSERT INTO transactions
             (user_id, title, amount, type, category, description, transaction_date, ref_no, card_id)
             VALUES ($1, $2, $3, 'Income', 'Transfer', $4, $5, $6, $7)`,
            [recipient.id, recipientTitle, numAmount, recipientDesc, todayDate, utrNumber, recipientCardId]
        );

        // 6. Record In-App Notifications for both Sender & Recipient
        const formattedAmt = numAmount.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        await client.query(
            `INSERT INTO notifications (user_id, title, message, type, amount, ref_no)
             VALUES ($1, 'Payment Sent', $2, 'debit', $3, $4)`,
            [
                req.user.id,
                `Transferred ₹${formattedAmt} to ${recipient.name} (+91 ${recipient.phone}) via UPI.`,
                numAmount,
                utrNumber
            ]
        );

        await client.query(
            `INSERT INTO notifications (user_id, title, message, type, amount, ref_no)
             VALUES ($1, 'Payment Received', $2, 'credit', $3, $4)`,
            [
                recipient.id,
                `Received ₹${formattedAmt} from ${sender.name} (+91 ${sender.phone || ""}) via UPI.`,
                numAmount,
                utrNumber
            ]
        );

        // COMMIT ATOMIC TRANSACTION
        await client.query("COMMIT");

        res.status(200).json({
            success: true,
            message: `Payment of ₹${numAmount.toFixed(2)} to ${recipient.name} (+91 ${recipient.phone}) completed successfully!`,
            utr: utrNumber,
            amount: numAmount,
            recipient: {
                name: recipient.name,
                phone: recipient.phone
            },
            payingCard: updatedSenderCardRes.rows[0]
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Transfer error:", error);
        res.status(500).json({ message: "Transfer failed. No funds were deducted." });
    } finally {
        client.release();
    }
};

// Get P2P transfer payment history for current user
exports.getPaymentHistory = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM transactions
             WHERE user_id = $1 AND (category = 'Transfer' OR title LIKE 'Paid to %' OR title LIKE 'Received from %')
             ORDER BY id DESC
             LIMIT 30`,
            [req.user.id]
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Error fetching payment history:", error);
        res.status(500).json({ message: "Error fetching payment records" });
    }
};
