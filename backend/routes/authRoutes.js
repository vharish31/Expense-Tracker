const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { loginRateLimiter } = require("../middleware/rateLimiter");
const { register, login, getMe, setPaymentPin } = require("../controllers/authController");

router.post("/register", register);
router.post("/login", loginRateLimiter, login);
router.get("/me", authMiddleware, getMe);
router.post("/set-pin", authMiddleware, setPaymentPin);

module.exports = router;
