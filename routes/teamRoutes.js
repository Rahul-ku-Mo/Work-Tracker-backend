const express = require("express");
const teamController = require("../controllers/team.controller");

const router = express.Router();

// Team routes
router.route("/").get(teamController.getTeam).post(teamController.createTeam);
router.route("/invite").post(teamController.inviteMember);
router.route("/join").post(teamController.joinTeam);
router.route("/members").get(teamController.getTeamMembers);
router.route("/:teamId/members").get(teamController.getTeamMembers);
router.route("/boards").get(teamController.getTeamBoards);

// Board membership management routes (Admin only)
router.route("/boards/:boardId/members").get(teamController.getBoardMembers);
router.route("/boards/:boardId/members/:userId").post(teamController.addUserToBoard);
router.route("/boards/:boardId/members/:userId").delete(teamController.removeUserFromBoard);
router.route("/boards/:boardId/members/:userId/permissions").patch(teamController.updateUserPermissions);

// User management routes (Team captain/Admin only)
router.route("/users/:userId/status").patch(teamController.toggleUserStatus);

// Invitation routes (Admin only)
router.route("/boards/:boardId/invite").post(teamController.sendBoardInvitation);

// Validation routes
router.route("/validate-code/:code").get(teamController.validateInviteCode);

module.exports = router; 