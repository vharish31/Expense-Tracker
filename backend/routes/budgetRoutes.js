/**
 * ==============================================================================
 * BUDGET CEILINGS ROUTES (FEATURE DISABLED / COMMENTED OUT)
 * ==============================================================================
 */

const express = require("express");
const router = express.Router();

/*
const authMiddleware = require("../middleware/authMiddleware");
const {
    getBudgets,
    getBudgetByMonth,
    addBudget,
    updateBudget,
    deleteBudget
} = require("../controllers/budgetController");

router.use(authMiddleware);

router.get("/", getBudgets);
router.get("/month/:month", getBudgetByMonth);
router.post("/", addBudget);
router.put("/:id", updateBudget);
router.delete("/:id", deleteBudget);
*/

module.exports = router;
