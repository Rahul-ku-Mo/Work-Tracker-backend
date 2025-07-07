const express = require("express");
const teamController = require("../controllers/team.controller");
const { requireWithinLimits } = require("../middleware/featureGating");

const router = express.Router();

// Team routes
router.route("/").get(teamController.getTeam).post(teamController.createTeam).put(teamController.updateTeam);
router.route("/invite").post(requireWithinLimits('teamMembers'), teamController.inviteMember);
router.route("/join").post(requireWithinLimits('teamMembers'), teamController.joinTeam);
router.route("/members").get(teamController.getTeamMembers);
router.route("/:teamId/members").get(teamController.getTeamMembers);
router.route("/workspaces").get(teamController.getTeamWorkspaces);

// Workspace membership management routes (Admin only)
router.route("/workspaces/:workspaceId/members").get(teamController.getWorkspaceMembers);
router.route("/workspaces/:workspaceId/members/:userId").post(teamController.addUserToWorkspace);
router.route("/workspaces/:workspaceId/members/:userId").delete(teamController.removeUserFromWorkspace);
router.route("/workspaces/:workspaceId/members/:userId/permissions").patch(teamController.updateUserPermissions);

// User management routes (Team captain/Admin only)
router.route("/users/:userId/status").patch(teamController.toggleUserStatus);

// Invitation routes (Admin only)
router.route("/workspaces/:workspaceId/invite").post(teamController.sendWorkspaceInvitation);

// Validation routes
router.route("/validate-code/:code").get(teamController.validateInviteCode);

module.exports = router; 