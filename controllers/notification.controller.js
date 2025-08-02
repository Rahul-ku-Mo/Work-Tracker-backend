const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class NotificationController {
  
  // Get current user's notifications (no userId required)
  static async getCurrentUserNotifications(req, res) {
    try {
      const { userId } = req.user;
      const { page = 1, limit = 20, unreadOnly = false } = req.query;
      
      const skip = (page - 1) * limit;
      
      const whereClause = {
        receiverId: userId,
        ...(unreadOnly === 'true' && { isRead: false })
      };

      const notifications = await prisma.notification.findMany({
        where: whereClause,
        include: {
          sender: {
            select: { id: true, username: true, name: true, imageUrl: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      });

      const total = await prisma.notification.count({ where: whereClause });

      res.json({
        success: true,
        data: {
          notifications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching current user notifications:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
    }
  }

  // Get all notifications for a user
  static async getUserNotifications(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20, unreadOnly = false } = req.query;
      
      const skip = (page - 1) * limit;
      
      const whereClause = {
        receiverId: userId,
        ...(unreadOnly === 'true' && { isRead: false })
      };

      const notifications = await prisma.notification.findMany({
        where: whereClause,
        include: {
          sender: {
            select: { id: true, username: true, name: true, imageUrl: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      });

      const total = await prisma.notification.count({ where: whereClause });

      res.json({
        success: true,
        data: {
          notifications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
    }
  }

  // Mark notification as read
  static async markAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const { userId } = req.user; // From auth middleware

      const notification = await prisma.notification.update({
        where: {
          id: parseInt(notificationId),
          receiverId: userId // Ensure user can only update their own notifications
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      res.json({ success: true, data: notification });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ success: false, error: 'Failed to update notification' });
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(req, res) {
    try {
      const { userId } = req.params;

      await prisma.notification.updateMany({
        where: {
          receiverId: userId,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ success: false, error: 'Failed to update notifications' });
    }
  }

  // Get unread notification count
  static async getUnreadCount(req, res) {
    try {
      const { userId } = req.params;

      const count = await prisma.notification.count({
        where: {
          receiverId: userId,
          isRead: false
        }
      });

      res.json({ success: true, data: { count } });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch unread count' });
    }
  }

  // Process mentions and create notifications (called when content is updated)
  static async processMentions(contentType, contentId, newContent, authorId) {
    try {
      // Extract mentions from content (assuming @username format)
      const mentionRegex = /@(\w+)/g;
      const newMentions = [];
      let match;
      
      while ((match = mentionRegex.exec(newContent)) !== null) {
        newMentions.push(match[1]); // username
      }

      // Get current mentions for this content
      const existingMentions = await prisma.mention.findMany({
        where: {
          contentType,
          contentId: contentId.toString()
        },
        include: {
          mentionedUser: { select: { username: true } }
        }
      });

      const existingUsernames = existingMentions.map(m => m.mentionedUser.username);
      
      // Find new mentions (diff approach)
      const newlyMentioned = newMentions.filter(username => 
        !existingUsernames.includes(username)
      );

      if (newlyMentioned.length === 0) {
        return { success: true, newNotifications: 0 };
      }

      // Get user IDs for newly mentioned usernames
      const usersToNotify = await prisma.user.findMany({
        where: {
          username: { in: newlyMentioned }
        },
        select: { id: true, username: true }
      });

      // Create mention records and notifications
      const mentionPromises = usersToNotify.map(async (user) => {
        // Create mention record
        await prisma.mention.create({
          data: {
            mentionedId: user.id,
            contentType,
            contentId: contentId.toString()
          }
        });

        // Create notification
        return prisma.notification.create({
          data: {
            receiverId: user.id,
            senderId: authorId,
            type: 'mention',
            title: 'You were mentioned',
            message: 'MENTION',
            contentType,
            contentId: contentId.toString()
          }
        });
      });

      await Promise.all(mentionPromises);

      return { success: true, newNotifications: usersToNotify.length };
    } catch (error) {
      console.error('Error processing mentions:', error);
      throw error;
    }
  }

  // Delete old mentions when content is updated (cleanup)
  static async updateMentions(contentType, contentId, newContent, authorId) {
    try {
      // First, remove all existing mentions for this content
      await prisma.mention.deleteMany({
        where: {
          contentType,
          contentId: contentId.toString()
        }
      });

      // Then process new mentions
      return await this.processMentions(contentType, contentId, newContent, authorId);
    } catch (error) {
      console.error('Error updating mentions:', error);
      throw error;
    }
  }

  // Delete notification
  static async deleteNotification(req, res) {
    try {
      const { notificationId } = req.params;
      const { userId } = req.body; // From auth middleware

      await prisma.notification.delete({
        where: {
          id: parseInt(notificationId),
          receiverId: userId // Ensure user can only delete their own notifications
        }
      });

      res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ success: false, error: 'Failed to delete notification' });
    }
  }

  // Create a general notification
  static async createNotification(senderId, receiverId, type, title, message, contentType = null, contentId = null) {
    try {
      const notification = await prisma.notification.create({
        data: {
          senderId,
          receiverId,
          type,
          title,
          message,
          contentType,
          contentId: contentId ? contentId.toString() : null
        }
      });

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Notify when a card is assigned to a user
  static async notifyCardAssignment(cardId, assigneeId, assignedByUserId) {
    try {
      // Get card details for notification context
      const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
          column: {
            include: {
              workspace: true
            }
          }
        }
      });

      if (!card) {
        console.error('Card not found for assignment notification:', cardId);
        return;
      }

      // Get assigner details
      const assigner = await prisma.user.findUnique({
        where: { id: assignedByUserId },
        select: { name: true, username: true }
      });

      const assignerName = assigner?.name || assigner?.username || 'Unknown User';

      // Create notification for the assignee
      const notification = await this.createNotification(
        assignedByUserId,
        assigneeId,
        'card_assignment',
        'Card Assigned',
        `${assignerName} assigned you to "${card.title}"`,
        'task',
        cardId
      );

      // Send real-time notification via Pusher
      const { pusherServer } = require('../services/pusherServer');
      await pusherServer.trigger(`user-${assigneeId}`, 'notification', {
        type: 'card_assignment',
        title: 'Card Assigned',
        message: `${assignerName} assigned you to "${card.title}"`,
        notificationId: notification.id,
        contentType: 'task',
        contentId: cardId.toString(),
        authorName: assignerName,
        contentTitle: card.title,
        isRead: false
      });

      console.log(`Assignment notification sent to user ${assigneeId} for card ${cardId}`);
    } catch (error) {
      console.error('Error sending card assignment notification:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  // Notify when a card is updated
  static async notifyCardUpdate(cardId, updatedByUserId, previousData, newData) {
    try {
      // Get card details
      const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
          assignees: {
            select: { id: true }
          },
          column: {
            include: {
              workspace: true
            }
          }
        }
      });

      if (!card) {
        console.error('Card not found for update notification:', cardId);
        return;
      }

      // Get updater details
      const updater = await prisma.user.findUnique({
        where: { id: updatedByUserId },
        select: { name: true, username: true }
      });

      const updaterName = updater?.name || updater?.username || 'Unknown User';

      // Determine what changed for the notification message
      const changes = [];
      if (previousData.title !== newData.title) changes.push('title');
      if (previousData.description !== newData.description) changes.push('description');
      if (previousData.dueDate?.getTime() !== newData.dueDate?.getTime()) changes.push('due date');
      if (previousData.priority !== newData.priority) changes.push('priority');

      if (changes.length === 0) return; // No significant changes

      const changeText = changes.join(', ');
      const message = `${updaterName} updated the ${changeText} of "${card.title}"`;

      // Notify all assignees except the updater
      const assigneeIds = card.assignees.map(a => a.id).filter(id => id !== updatedByUserId);

      // Send real-time notification via Pusher
      const { pusherServer } = require('../services/pusherServer');
      
      for (const assigneeId of assigneeIds) {
        const notification = await this.createNotification(
          updatedByUserId,
          assigneeId,
          'card_update',
          'Card Updated',
          message,
          'task',
          cardId
        );

        await pusherServer.trigger(`user-${assigneeId}`, 'notification', {
          type: 'card_update',
          title: 'Card Updated',
          message: message,
          notificationId: notification.id,
          contentType: 'task',
          contentId: cardId.toString(),
          authorName: updaterName,
          contentTitle: card.title,
          isRead: false
        });
      }

      console.log(`Update notification sent for card ${cardId} to ${assigneeIds.length} assignees`);
    } catch (error) {
      console.error('Error sending card update notification:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  // Notify when a card is completed
  static async notifyCardCompletion(cardId, completedByUserId) {
    try {
      // Get card details
      const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
          assignees: {
            select: { id: true }
          },
          column: {
            include: {
              workspace: true
            }
          }
        }
      });

      if (!card) {
        console.error('Card not found for completion notification:', cardId);
        return;
      }

      // Get completer details
      const completer = await prisma.user.findUnique({
        where: { id: completedByUserId },
        select: { name: true, username: true }
      });

      const completerName = completer?.name || completer?.username || 'Unknown User';

      const message = `${completerName} marked "${card.title}" as complete`;

      // Notify all assignees except the completer
      const assigneeIds = card.assignees.map(a => a.id).filter(id => id !== completedByUserId);

      // Send real-time notification via Pusher
      const { pusherServer } = require('../services/pusherServer');
      
      for (const assigneeId of assigneeIds) {
        const notification = await this.createNotification(
          completedByUserId,
          assigneeId,
          'card_completion',
          'Card Completed',
          message,
          'task',
          cardId
        );

        await pusherServer.trigger(`user-${assigneeId}`, 'notification', {
          type: 'card_completion',
          title: 'Card Completed',
          message: message,
          notificationId: notification.id,
          contentType: 'task',
          contentId: cardId.toString(),
          authorName: completerName,
          contentTitle: card.title,
          isRead: false
        });
      }

      console.log(`Completion notification sent for card ${cardId} to ${assigneeIds.length} assignees`);
    } catch (error) {
      console.error('Error sending card completion notification:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  // Notify when a comment is added to a card
  static async notifyCardComment(cardId, commenterId, commentContent) {
    try {
      // Get card details
      const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
          assignees: {
            select: { id: true }
          },
          column: {
            include: {
              workspace: true
            }
          }
        }
      });

      if (!card) {
        console.error('Card not found for comment notification:', cardId);
        return;
      }

      // Get commenter details
      const commenter = await prisma.user.findUnique({
        where: { id: commenterId },
        select: { name: true, username: true }
      });

      const commenterName = commenter?.name || commenter?.username || 'Unknown User';

      // Truncate comment content for notification
      const truncatedComment = commentContent.length > 50 
        ? commentContent.substring(0, 50) + '...' 
        : commentContent;

      const message = `${commenterName} commented on "${card.title}": "${truncatedComment}"`;

      // Notify all assignees except the commenter
      const assigneeIds = card.assignees.map(a => a.id).filter(id => id !== commenterId);

      // Send real-time notification via Pusher
      const { pusherServer } = require('../services/pusherServer');
      
      for (const assigneeId of assigneeIds) {
        const notification = await this.createNotification(
          commenterId,
          assigneeId,
          'card_comment',
          'New Comment',
          message,
          'task',
          cardId
        );

        await pusherServer.trigger(`user-${assigneeId}`, 'notification', {
          type: 'card_comment',
          title: 'New Comment',
          message: message,
          notificationId: notification.id,
          contentType: 'task',
          contentId: cardId.toString(),
          authorName: commenterName,
          contentTitle: card.title,
          isRead: false
        });
      }

      console.log(`Comment notification sent for card ${cardId} to ${assigneeIds.length} assignees`);
    } catch (error) {
      console.error('Error sending card comment notification:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }
}

module.exports = NotificationController;