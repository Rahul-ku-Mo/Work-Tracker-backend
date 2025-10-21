const express = require('express');
const router = express.Router();
const milestoneController = require('../controllers/milestone.controller');
const authenticate = require('../middleware/auth');

// Get all milestones for a project
router.get('/project/:projectSlug', authenticate, milestoneController.getProjectMilestones);

// Create a new milestone for a project
router.post('/project/:projectSlug', authenticate, milestoneController.createMilestone);

// Update a specific milestone
router.put('/:milestoneId/project/:projectSlug', authenticate, milestoneController.updateMilestone);

// Delete a specific milestone
router.delete('/:milestoneId/project/:projectSlug', authenticate, milestoneController.deleteMilestone);

// Update milestone completion status
router.patch('/:milestoneId/project/:projectSlug/completion', authenticate, milestoneController.updateMilestoneCompletion);

// Reorder milestones
router.post('/project/:projectSlug/reorder', authenticate, milestoneController.reorderMilestones);

// Bulk update milestones
router.put('/project/:projectSlug/bulk', authenticate, milestoneController.bulkUpdateMilestones);

module.exports = router;
