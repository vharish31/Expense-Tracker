const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { connectDb } = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/transactions", require("./routes/transactionRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/budgets", require("./routes/budgetRoutes"));
app.use("/api/cards", require("./routes/cardRoutes"));

app.get("/", (req, res) => {
    res.send("Expense Tracker API is running!");
});

app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

app.use((error, req, res, next) => {
    console.error("Unhandled API error:", error);
    res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;

connectDb().then((connected) => {
    if (!connected) {
        process.exitCode = 1;
        return;
    }

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
