const express = require("express");
const workspaceController = require("../controllers/workspace.controller");
const workspaceUserController = require("../controllers/workspaceUserController");
const workspacePermissionsController = require("../controllers/workspacePermissions.controller");
const { checkWorkspaceAccess } = require("../middleware/workspaceAccess");
const { requireWithinLimits } = require("../middleware/featureGating");

const router = express.Router();

// Public routes (no workspace access check needed)
router
  .route("/")
  .get(workspaceController.getWorkspaces)
  .post(requireWithinLimits('projects'), workspaceController.createWorkspace);

// Favorites routes
router
  .route("/favorites")
  .get(workspaceController.getFavoriteWorkspaces);

// Get user's accessible workspaces (no specific workspace access check needed)
// IMPORTANT: This must come BEFORE /:workspaceId routes
router.get("/accessible", workspacePermissionsController.getUserAccessibleWorkspaces);

// Protected routes (need workspace access check)
router.use("/:workspaceId", checkWorkspaceAccess);

router
  .route("/:workspaceId")
  .get(workspaceController.getWorkspace)
  .delete(workspaceController.deleteWorkspace)
  .put(workspaceController.updateWorkspace);

router
  .route("/:workspaceId/favorite")
  .post(workspaceController.toggleWorkspaceFavorite);

router
  .route("/:workspaceId/members")
  .get(workspaceUserController.getWorkspaceMembers)
  .post(workspaceUserController.inviteUserToWorkspace);

// Workspace permissions routes
router.get("/:workspaceId/permissions", workspacePermissionsController.getTeamMembersWithWorkspaceAccess);
router.post("/:workspaceId/permissions/grant", workspacePermissionsController.grantWorkspaceAccess);

// Add workspace access check to related routes
router.use("/columns", checkWorkspaceAccess);

router.use("/labels", checkWorkspaceAccess);

module.exports = router; 