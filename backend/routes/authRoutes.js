const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { register, login, getMe, setPaymentPin } = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, getMe);
router.post("/set-pin", authMiddleware, setPaymentPin);

module.exports = router;
