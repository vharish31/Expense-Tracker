const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const verifyToken = require("../middleware/authMiddleware");

router.use(verifyToken);

router.get("/lookup", paymentController.lookupUserByPhone);
router.post("/transfer", paymentController.transferFunds);
router.get("/history", paymentController.getPaymentHistory);

module.exports = router;
