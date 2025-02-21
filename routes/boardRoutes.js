const express = require("express");
const boardController = require("../controllers/boardController");

const boardUserController = require("../controllers/boardUserController");
const { checkBoardAccess } = require("../middleware/boardAccess");

const router = express.Router();

// Public routes (no board access check needed)
router
  .route("/")
  .get(boardController.getBoards)
  .post(boardController.createBoard);

// Protected routes (need board access check)
router.use("/:boardId", checkBoardAccess);

router
  .route("/:boardId")
  .get(boardController.getBoard)
  .patch(boardController.updateBoard)
  .delete(boardController.deleteBoard);

router
  .route("/:boardId/members")
  .get(boardUserController.getBoardMembers)
  .post(boardUserController.inviteUserToBoard);

// Add board access check to related routes
router.use("/columns", checkBoardAccess);
router.use("/cards", checkBoardAccess);
router.use("/labels", checkBoardAccess);

module.exports = router;
