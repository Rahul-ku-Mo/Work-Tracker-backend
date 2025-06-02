const express = require("express");
const boardController = require("../controllers/board.controller");
const boardUserController = require("../controllers/boardUserController");
const boardPermissionsController = require("../controllers/boardPermissions.controller");
const { checkBoardAccess } = require("../middleware/boardAccess");

const router = express.Router();

// Public routes (no board access check needed)
router
  .route("/")
  .get(boardController.getBoards)
  .post(boardController.createBoard);

// Get user's accessible boards (no specific board access check needed)
router.get("/accessible", boardPermissionsController.getUserAccessibleBoards);

// Protected routes (need board access check)
router.use("/:boardId", checkBoardAccess);

router
  .route("/:boardId")
  .get(boardController.getBoard)
  .delete(boardController.deleteBoard)
  .put(boardController.updateBoard);

router
  .route("/:boardId/members")
  .get(boardUserController.getBoardMembers)
  .post(boardUserController.inviteUserToBoard);

// Board permissions routes
router.get("/:boardId/permissions", boardPermissionsController.getTeamMembersWithBoardAccess);
router.post("/:boardId/permissions/grant", boardPermissionsController.grantBoardAccess);
router.delete("/:boardId/permissions/:memberId", boardPermissionsController.revokeBoardAccess);

// Add board access check to related routes
router.use("/columns", checkBoardAccess);
router.use("/cards", checkBoardAccess);
router.use("/labels", checkBoardAccess);

module.exports = router;
