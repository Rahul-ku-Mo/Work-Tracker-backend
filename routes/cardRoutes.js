const express = require("express");
const cardController = require("../controllers/cardController");
const userController = require("../controllers/userController");
const { authenticateToken } = require("../utils/validation");

const router = express.Router();

// Apply the authenticateToken middleware to all routes
router.use(authenticateToken);

//middleware to check the user exist or not!
router.use(userController.checkUserExists);

router.route("/").get(cardController.getCards).post(cardController.createCard);

router
  .route("/:cardId")
  .get(cardController.getCard)
  .patch(cardController.updateCard)
  .delete(cardController.deleteCard);

router.route("/details/:cardId").get(cardController.getCardDetails);

module.exports = router;
