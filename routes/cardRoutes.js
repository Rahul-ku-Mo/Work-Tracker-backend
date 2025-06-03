const express = require("express");
const cardController = require("../controllers/card.controller");

const router = express.Router();

router.route("/").get(cardController.getCards).post(cardController.createCard);
router.route("/status").get(cardController.getCardsWithStatus);

router
  .route("/:cardId")
  .get(cardController.getCard)
  .patch(cardController.updateCard)
  .delete(cardController.deleteCard);

router.route("/:cardId/complete").patch(cardController.markCardComplete);
router.route("/:cardId/incomplete").patch(cardController.markCardIncomplete);

router.route("/details/:cardId").get(cardController.getCardDetails);

module.exports = router;
