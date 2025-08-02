const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notification.controller');
const { authenticateToken } = require("../utils/validation");

// Get current user's notifications (no userId required)
router.get('/', authenticateToken, NotificationController.getCurrentUserNotifications);

// Get user's notifications (with userId)
router.get('/:userId', authenticateToken, NotificationController.getUserNotifications);

// Get unread notification count
router.get('/:userId/count', authenticateToken, NotificationController.getUnreadCount);

// Mark notification as read
router.put('/:notificationId/read', authenticateToken, NotificationController.markAsRead);

// Mark all notifications as read for a user
router.put('/:userId/read-all', authenticateToken, NotificationController.markAllAsRead);

// Delete notification
router.delete('/:notificationId', authenticateToken, NotificationController.deleteNotification);

module.exports = router;
