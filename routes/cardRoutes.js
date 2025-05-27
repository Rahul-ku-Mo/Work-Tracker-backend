const express = require("express");
const cardController = require("../controllers/card.controller");

const router = express.Router();

router.route("/").get(cardController.getCards).post(cardController.createCard);

router
  .route("/:cardId")
  .get(cardController.getCard)
  .patch(cardController.updateCard)
  .delete(cardController.deleteCard);

router.route("/details/:cardId").get(cardController.getCardDetails);

module.exports = router;
