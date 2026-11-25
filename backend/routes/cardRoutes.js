const express = require("express");
const router = express.Router();
const cardController = require("../controllers/cardController");
const verifyToken = require("../middleware/authMiddleware");

router.use(verifyToken);

router.get("/", cardController.getCards);
router.post("/", cardController.addCard);
router.put("/:id", cardController.updateCard);
router.delete("/:id", cardController.deleteCard);

module.exports = router;
