const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const authenticate = require('../middleware/auth');
const { requireWithinLimits } = require('../middleware/featureGating');
const { checkProjectAccess, checkProjectModifyPermission } = require('../middleware/projectAccess');

// Get all projects for a team (no project-specific access check needed)
router.get('/', authenticate, projectController.getProjects);

// Get all team projects (including locked ones) we might not need this
// router.get('/team/all', authenticate, projectController.getTeamProjects);

// Create a new project (no project-specific access check needed)
router.post('/', authenticate, requireWithinLimits('projects'), projectController.createProject);

// Reorder projects (no project-specific access check needed)
router.post('/reorder', authenticate, projectController.reorderProjects);

// Routes that require project access (read-only)
// Get a specific project
router.get('/:projectSlug', authenticate, checkProjectAccess, projectController.getProject);

// Get project workspaces
router.get('/:projectSlug/workspaces', authenticate, checkProjectAccess, projectController.getProjectWorkspaces);

// Routes that require project modification permissions
// Update a project
router.put('/:projectSlug', authenticate, checkProjectAccess, checkProjectModifyPermission, projectController.updateProject);

// Update project target date
router.patch('/:projectSlug/target-date', authenticate, checkProjectAccess, checkProjectModifyPermission, projectController.updateProjectTargetDate);

// Update project admin
router.patch('/:projectSlug/lead', authenticate, checkProjectAccess, checkProjectModifyPermission, projectController.updateProjectLead);

// Update project members
router.patch('/:projectSlug/members', authenticate, checkProjectAccess, checkProjectModifyPermission, projectController.updateProjectMembers);

// Update project priority
router.patch('/:projectSlug/priority', authenticate, checkProjectAccess, checkProjectModifyPermission, projectController.updateProjectPriority);

// Update milestone completion
router.patch('/:projectSlug/milestone/completion', authenticate, checkProjectAccess, projectController.updateMilestoneCompletion);

// Delete a project
router.delete('/:projectSlug', authenticate, checkProjectAccess, checkProjectModifyPermission, projectController.deleteProject);

module.exports = router; 