const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const authenticate = require('../middleware/auth');

// Get all projects for a team
router.get('/', authenticate, projectController.getProjects);

// Get a specific project
router.get('/:projectSlug', authenticate, projectController.getProject);

// Create a new project
router.post('/', authenticate, projectController.createProject);

// Update a project
router.put('/:projectSlug', authenticate, projectController.updateProject);

// Delete a project
router.delete('/:projectSlug', authenticate, projectController.deleteProject);

// Reorder projects
router.post('/reorder', authenticate, projectController.reorderProjects);

module.exports = router; 