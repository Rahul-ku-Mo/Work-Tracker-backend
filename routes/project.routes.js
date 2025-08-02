const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const authenticate = require('../middleware/auth');

// Get all projects for a team
router.get('/', authenticate, projectController.getProjects);

// Get a specific project
router.get('/:projectSlug', authenticate, projectController.getProject);

// Get project workspaces
router.get('/:projectSlug/workspaces', authenticate, projectController.getProjectWorkspaces);

// Create a new project
router.post('/', authenticate, projectController.createProject);

// Update a project
router.put('/:projectSlug', authenticate, projectController.updateProject);

// Update project target date
router.patch('/:projectSlug/target-date', authenticate, projectController.updateProjectTargetDate);

// Update project lead
router.patch('/:projectSlug/lead', authenticate, projectController.updateProjectLead);

// Update project members
router.patch('/:projectSlug/members', authenticate, projectController.updateProjectMembers);

// Delete a project
router.delete('/:projectSlug', authenticate, projectController.deleteProject);

// Reorder projects
router.post('/reorder', authenticate, projectController.reorderProjects);

// Update project priority
router.patch('/:projectSlug/priority', authenticate, projectController.updateProjectPriority);

// Update milestone completion
router.patch('/:projectSlug/milestone/completion', authenticate, projectController.updateMilestoneCompletion);

module.exports = router; 