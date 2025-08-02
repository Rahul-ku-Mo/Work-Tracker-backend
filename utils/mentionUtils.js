const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const NotificationController = require('../controllers/notificationController');

/**
 * Process mentions in content and create notifications
 * @param {string} contentType - "task", "project", "note"
 * @param {string|number} contentId - ID of the content
 * @param {string} content - The content text to parse for mentions
 * @param {string} authorId - ID of the user who created/updated the content
 */
async function processMentions(contentType, contentId, content, authorId) {
  try {
    // Extract mentions from content (assuming @username format)
    const mentionRegex = /@(\w+)/g;
    const newMentions = [];
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      newMentions.push(match[1]); // username
    }

    if (newMentions.length === 0) {
      return { success: true, newNotifications: 0 };
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

/**
 * Update mentions when content is modified (removes old mentions and adds new ones)
 * @param {string} contentType - "task", "project", "note"
 * @param {string|number} contentId - ID of the content
 * @param {string} newContent - The new content text
 * @param {string} authorId - ID of the user who updated the content
 */
async function updateMentions(contentType, contentId, newContent, authorId) {
  try {
    // First, remove all existing mentions for this content
    await prisma.mention.deleteMany({
      where: {
        contentType,
        contentId: contentId.toString()
      }
    });

    // Then process new mentions
    return await processMentions(contentType, contentId, newContent, authorId);
  } catch (error) {
    console.error('Error updating mentions:', error);
    throw error;
  }
}

/**
 * Get all mentions for a specific content
 * @param {string} contentType - "task", "project", "note"
 * @param {string|number} contentId - ID of the content
 */
async function getMentionsForContent(contentType, contentId) {
  try {
    const mentions = await prisma.mention.findMany({
      where: {
        contentType,
        contentId: contentId.toString()
      },
      include: {
        mentionedUser: {
          select: {
            id: true,
            username: true,
            name: true,
            imageUrl: true
          }
        }
      }
    });

    return mentions;
  } catch (error) {
    console.error('Error fetching mentions:', error);
    throw error;
  }
}

/**
 * Get all content where a user is mentioned
 * @param {string} userId - ID of the user
 */
async function getMentionsForUser(userId) {
  try {
    const mentions = await prisma.mention.findMany({
      where: {
        mentionedId: userId
      },
      include: {
        mentionedUser: {
          select: {
            id: true,
            username: true,
            name: true,
            imageUrl: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return mentions;
  } catch (error) {
    console.error('Error fetching user mentions:', error);
    throw error;
  }
}

module.exports = {
  processMentions,
  updateMentions,
  getMentionsForContent,
  getMentionsForUser
}; 