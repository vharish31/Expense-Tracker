const db = require("../config/db");

// Get all notifications for logged-in user
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch notifications
        let result = await db.query(
            `SELECT id, user_id, title, message, type, amount, ref_no, is_read, created_at
             FROM notifications
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 50`,
            [userId]
        );

        // If user has zero notifications, backfill from recent transactions so existing data is populated
        if (result.rows.length === 0) {
            const txRes = await db.query(
                `SELECT id, title, amount, type, description, ref_no, created_at
                 FROM transactions
                 WHERE user_id = $1
                 ORDER BY created_at DESC
                 LIMIT 20`,
                [userId]
            );

            if (txRes.rows.length > 0) {
                for (const t of txRes.rows) {
                    const isIncome = t.type === "Income";
                    const notifTitle = isIncome ? "Funds Credited" : "Funds Debited";
                    const formattedAmt = Number(t.amount).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });
                    const notifMsg = isIncome
                        ? `₹${formattedAmt} credited for "${t.title}"`
                        : `₹${formattedAmt} debited for "${t.title}"`;

                    await db.query(
                        `INSERT INTO notifications (user_id, title, message, type, amount, ref_no, is_read, created_at)
                         VALUES ($1, $2, $3, $4, $5, $6, true, $7)`,
                        [
                            userId,
                            notifTitle,
                            notifMsg,
                            isIncome ? "credit" : "debit",
                            t.amount,
                            t.ref_no || null,
                            t.created_at || new Date()
                        ]
                    );
                }

                result = await db.query(
                    `SELECT id, user_id, title, message, type, amount, ref_no, is_read, created_at
                     FROM notifications
                     WHERE user_id = $1
                     ORDER BY created_at DESC
                     LIMIT 50`,
                    [userId]
                );
            }
        }

        const unreadCount = result.rows.filter((n) => !n.is_read).length;

        res.status(200).json({
            notifications: result.rows,
            unreadCount
        });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ message: "Failed to fetch notifications" });
    }
};

// Mark single notification as read
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query(
            "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2",
            [id, req.user.id]
        );
        res.status(200).json({ success: true, message: "Marked as read" });
    } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ message: "Failed to mark as read" });
    }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
    try {
        await db.query(
            "UPDATE notifications SET is_read = TRUE WHERE user_id = $1",
            [req.user.id]
        );
        res.status(200).json({ success: true, message: "All notifications marked as read" });
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({ message: "Failed to mark all as read" });
    }
};

// Clear all notifications
exports.clearNotifications = async (req, res) => {
    try {
        await db.query(
            "DELETE FROM notifications WHERE user_id = $1",
            [req.user.id]
        );
        res.status(200).json({ success: true, message: "Notifications cleared" });
    } catch (error) {
        console.error("Error clearing notifications:", error);
        res.status(500).json({ message: "Failed to clear notifications" });
    }
};
