const express = require("express");
const projectPermissionsController = require("../controllers/projectPermissions.controller");
const { checkProjectAccess } = require("../middleware/projectAccess");

const router = express.Router();

// Get user's accessible projects (no project access check needed)
router.get("/accessible", projectPermissionsController.getUserAccessibleProjects);

// Project permission routes (require project access)
router.use("/:projectId", checkProjectAccess);

router
  .route("/:projectId/permissions")
  .get(projectPermissionsController.getTeamMembersWithProjectAccess)
  .post(projectPermissionsController.grantProjectAccess);

router
  .route("/:projectId/permissions/:memberId")
  .delete(projectPermissionsController.revokeProjectAccess)
  .patch(projectPermissionsController.updateProjectRole);

module.exports = router;

