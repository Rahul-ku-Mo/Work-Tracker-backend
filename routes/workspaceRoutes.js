const express = require("express");
const workspaceController = require("../controllers/workspace.controller");
const workspaceUserController = require("../controllers/workspaceUserController");
const workspacePermissionsController = require("../controllers/workspacePermissions.controller");
const columnController = require("../controllers/columnController");
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

// New routes for teamID + slug pattern - with workspace access check
router.use("/team/:teamId/:slug", checkWorkspaceAccess);

router
  .route("/team/:teamId/:slug")
  .get(workspaceController.getWorkspace)
  .delete(workspaceController.deleteWorkspace)
  .put(workspaceController.updateWorkspace);

router
  .route("/team/:teamId/:slug/favorite")
  .post(workspaceController.toggleWorkspaceFavorite);

router
  .route("/team/:teamId/:slug/members")
  .get(workspaceUserController.getWorkspaceMembers)
  .post(workspaceUserController.inviteUserToWorkspace);

// Workspace permissions routes for teamID + slug
router.get("/team/:teamId/:slug/permissions", workspacePermissionsController.getTeamMembersWithWorkspaceAccess);
router.post("/team/:teamId/:slug/permissions/grant", workspacePermissionsController.grantWorkspaceAccess);

// Columns routes for teamID + slug
router
  .route("/team/:teamId/:slug/columns")
  .get(columnController.getColumns)
  .post(columnController.createColumn);


router
  .route("/:workspaceId")
  .get(workspaceController.getWorkspace)
  .delete(workspaceController.deleteWorkspace)
  .put(workspaceController.updateWorkspace);

router
  .route("/:workspaceId/favorite")
  .post(workspaceController.toggleWorkspaceFavorite);

router
  .route("/:teamId/:workspaceSlug/members")
  .get(workspaceUserController.getWorkspaceMembers)
  .post(workspaceUserController.inviteUserToWorkspace);

// Workspace permissions routes
router.get("/:workspaceId/permissions", workspacePermissionsController.getTeamMembersWithWorkspaceAccess);
router.post("/:workspaceId/permissions/grant", workspacePermissionsController.grantWorkspaceAccess);

// Add workspace access check to related routes
router.use("/columns", checkWorkspaceAccess);

router.use("/labels", checkWorkspaceAccess);

module.exports = router; 