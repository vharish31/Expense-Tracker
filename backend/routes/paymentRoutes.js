const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const authController = require("../controllers/authController");
const verifyToken = require("../middleware/authMiddleware");
const { pinRateLimiter } = require("../middleware/rateLimiter");

router.use(verifyToken);

router.get("/lookup", paymentController.lookupUserByPhone);
router.post("/transfer", pinRateLimiter, paymentController.transferFunds);
router.get("/history", paymentController.getPaymentHistory);
router.post("/set-pin", authController.setPaymentPin);

module.exports = router;
