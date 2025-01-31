const express = require("express");
const boardController = require("../controllers/boardController");
const userController = require("../controllers/userController");
const { authenticateToken } = require("../utils/validation");

const router = express.Router();

// Apply the authenticateToken middleware to all routes
router.use(authenticateToken);

//middleware to check the user exist or not!
router.use(userController.checkUserExists);

router
  .route("/")
  .get(boardController.getBoards)
  .post(boardController.createBoard)
  .patch(boardController.updateBoard);

router
  .route("/:boardId")
  .get(boardController.getBoard)
  .delete(boardController.deleteBoard);

module.exports = router;
