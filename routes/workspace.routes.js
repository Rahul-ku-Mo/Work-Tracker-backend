const express = require("express");
const workspaceController = require("../controllers/workspace.controller");
const workspaceUserController = require("../controllers/workspaceUserController");
const workspacePermissionsController = require("../controllers/workspacePermissions.controller");
const { checkWorkspaceAccess } = require("../middleware/workspaceAccess");
const { checkProjectAccessViaWorkspace } = require("../middleware/projectAccess");
const { requireWithinLimits } = require("../middleware/featureGating");

const router = express.Router();

// Public routes (no workspace access check needed)
router
  .route("/team/:teamId")
  .get(workspaceController.getWorkspaces);

router
  .route("/project/:projectSlug")
  .post(requireWithinLimits('workspacesPerProject'), workspaceController.createWorkspace);

// Favorites routes
router
  .route("/favorites")
  .get(workspaceController.getFavoriteWorkspaces);

// Get user's accessible workspaces (no specific workspace access check needed)
// IMPORTANT: This must come BEFORE /:workspaceId routes
router.get("/accessible", workspacePermissionsController.getUserAccessibleWorkspaces);

// Team-scoped routes (NEW PATTERN) - with project and workspace access check
router.use("/team/:teamId/:slug", checkProjectAccessViaWorkspace, checkWorkspaceAccess);

router
  .route("/team/:teamId/:slug")
  .get(workspaceController.getWorkspace)
  .put(workspaceController.updateWorkspace)
  .delete(workspaceController.deleteWorkspace);

router
  .route("/:teamId/:slug/members")
  .get(workspaceUserController.getWorkspaceMembers)
  .post(workspaceUserController.inviteUserToWorkspace);

router
  .route("/:teamId/:slug/favorite")
  .post(workspaceController.toggleWorkspaceFavorite);

router
  .route("/:teamId/:slug/permissions")
  .get(workspacePermissionsController.getTeamMembersWithWorkspaceAccess)
  .post(workspacePermissionsController.grantWorkspaceAccess);

router
  .route("/:teamId/:slug/permissions/:memberId")
  .delete(workspacePermissionsController.revokeWorkspaceAccess);


module.exports = router; 