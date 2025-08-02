const { PrismaClient } = require('@prisma/client');
const { pusherServer } = require('../services/pusherServer');
const prisma = new PrismaClient();

/**
 * Enhanced mention processing with diff-based detection and Pusher notifications
 * @param {string} contentType - "task", "project", "note"
 * @param {string|number} contentId - ID of the content
 * @param {string} newContent - The new content text to parse for mentions
 * @param {string} authorId - ID of the user who created/updated the content
 * @param {string} authorName - Name of the user who created/updated the content
 * @param {string} contentTitle - Title of the content being mentioned (for notification context)
 */
async function processMentionsWithDiff(contentType, contentId, newContent, authorId, authorName, contentTitle) {
  try {
    console.log(`Processing mentions for ${contentType} ${contentId}`);
    
    // Step 1: Parse new content → extract new_mentions[]
    const newMentions = extractMentionsFromContent(newContent);
    console.log(`Found ${newMentions.length} mentions in new content:`, newMentions);

    if (newMentions.length === 0) {
      // No mentions found, clean up any existing mentions
      await cleanupMentions(contentType, contentId);
      return { success: true, newNotifications: 0, message: 'No mentions found' };
    }

    // Step 2: Query DB → get old_mentions[] for this content
    const existingMentions = await getExistingMentions(contentType, contentId);
    const existingUsernames = existingMentions.map(m => m.mentionedUser.username);
    console.log(`Existing mentions:`, existingUsernames);

    // Step 3: Calculate diff → notify_users = new_mentions - old_mentions
    const newlyMentioned = newMentions.filter(username => 
      !existingUsernames.includes(username)
    );
    console.log(`Newly mentioned users:`, newlyMentioned);

    if (newlyMentioned.length === 0) {
      return { success: true, newNotifications: 0, message: 'No new mentions' };
    }

    // Step 4: Get user details for newly mentioned users
    const usersToNotify = await prisma.user.findMany({
      where: {
        username: { in: newlyMentioned }
      },
      select: { 
        id: true, 
        username: true, 
        name: true,
        imageUrl: true
      }
    });

    console.log(`Users to notify:`, usersToNotify.map(u => u.username));

    // Step 5: Create notifications and mention records for new users
    const notificationPromises = usersToNotify.map(async (user) => {
      try {
        // Create mention record
        await prisma.mention.create({
          data: {
            mentionedId: user.id,
            contentType,
            contentId: contentId.toString()
          }
        });

        // Create notification
        const notification = await prisma.notification.create({
          data: {
            receiverId: user.id,
            senderId: authorId,
            type: 'mention',
            title: 'You were mentioned',
            message: 'MENTION',
            contentType,
            contentId: contentId.toString(),
            metadata: JSON.stringify({
              authorName,
              contentTitle,
              contentType,
              contentId: contentId.toString()
            })
          }
        });

        // Send real-time notification via Pusher
        await sendPusherNotification(user.id, {
          type: 'mention',
          title: 'You were mentioned',
          message: `${authorName} mentioned you in ${contentTitle}`,
          notificationId: notification.id,
          contentType,
          contentId: contentId.toString(),
          authorName,
          contentTitle,
          isRead: false
        });

        return notification;
      } catch (error) {
        console.error(`Error creating notification for user ${user.username}:`, error);
        return null;
      }
    });

    const createdNotifications = await Promise.all(notificationPromises);
    const successfulNotifications = createdNotifications.filter(n => n !== null);

    console.log(`Successfully created ${successfulNotifications.length} notifications`);

    return { 
      success: true, 
      newNotifications: successfulNotifications.length,
      mentionedUsers: usersToNotify.map(u => u.username),
      message: `Created ${successfulNotifications.length} notifications`
    };

  } catch (error) {
    console.error('Error processing mentions with diff:', error);
    throw error;
  }
}

/**
 * Update mentions when content is modified (removes old mentions and adds new ones)
 * @param {string} contentType - "task", "project", "note"
 * @param {string|number} contentId - ID of the content
 * @param {string} newContent - The new content text
 * @param {string} authorId - ID of the user who updated the content
 * @param {string} authorName - Name of the user who updated the content
 * @param {string} contentTitle - Title of the content being mentioned
 */
async function updateMentionsWithDiff(contentType, contentId, newContent, authorId, authorName, contentTitle) {
  try {
    console.log(`Updating mentions for ${contentType} ${contentId}`);
    
    // Step 1: Parse new content → extract new_mentions[]
    const newMentions = extractMentionsFromContent(newContent);
    console.log(`Found ${newMentions.length} mentions in updated content:`, newMentions);

    // Step 2: Query DB → get old_mentions[] for this content
    const existingMentions = await getExistingMentions(contentType, contentId);
    const existingUsernames = existingMentions.map(m => m.mentionedUser.username);
    console.log(`Existing mentions:`, existingUsernames);

    // Step 3: Calculate diff → notify_users = new_mentions - old_mentions
    const newlyMentioned = newMentions.filter(username => 
      !existingUsernames.includes(username)
    );
    console.log(`Newly mentioned users:`, newlyMentioned);

    // Step 4: Remove mentions that are no longer in the content
    const removedMentions = existingUsernames.filter(username => 
      !newMentions.includes(username)
    );
    console.log(`Removed mentions:`, removedMentions);

    // Clean up removed mentions
    if (removedMentions.length > 0) {
      await cleanupSpecificMentions(contentType, contentId, removedMentions);
    }

    // Step 5: Create notifications for newly mentioned users
    if (newlyMentioned.length === 0) {
      return { success: true, newNotifications: 0, removedMentions: removedMentions.length };
    }

    // Get user details for newly mentioned users
    const usersToNotify = await prisma.user.findMany({
      where: {
        username: { in: newlyMentioned }
      },
      select: { 
        id: true, 
        username: true, 
        name: true,
        imageUrl: true
      }
    });

    // Create notifications and mention records for new users
    const notificationPromises = usersToNotify.map(async (user) => {
      try {
        // Create mention record
        await prisma.mention.create({
          data: {
            mentionedId: user.id,
            contentType,
            contentId: contentId.toString()
          }
        });

        // Create notification
        const notification = await prisma.notification.create({
          data: {
            receiverId: user.id,
            senderId: authorId,
            type: 'mention',
            title: 'You were mentioned',
            message: 'MENTION',
            contentType,
            contentId: contentId.toString(),
            metadata: JSON.stringify({
              authorName,
              contentTitle,
              contentType,
              contentId: contentId.toString()
            })
          }
        });

        // Send real-time notification via Pusher
        await sendPusherNotification(user.id, {
          type: 'mention',
          title: 'You were mentioned',
          message: `${authorName} mentioned you in ${contentTitle}`,
          notificationId: notification.id,
          contentType,
          contentId: contentId.toString(),
          authorName,
          contentTitle
        });

        return notification;
      } catch (error) {
        console.error(`Error creating notification for user ${user.username}:`, error);
        return null;
      }
    });

    const createdNotifications = await Promise.all(notificationPromises);
    const successfulNotifications = createdNotifications.filter(n => n !== null);

    return { 
      success: true, 
      newNotifications: successfulNotifications.length,
      removedMentions: removedMentions.length,
      mentionedUsers: usersToNotify.map(u => u.username),
      message: `Created ${successfulNotifications.length} notifications, removed ${removedMentions.length} mentions`
    };

  } catch (error) {
    console.error('Error updating mentions with diff:', error);
    throw error;
  }
}

/**
 * Extract mentions from content using regex
 * @param {string} content - The content to parse
 * @returns {string[]} Array of usernames mentioned
 */
function extractMentionsFromContent(content) {
  if (!content) return [];
  
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]); // username
  }

  // Remove duplicates
  return [...new Set(mentions)];
}

/**
 * Get existing mentions for content
 * @param {string} contentType - Type of content
 * @param {string|number} contentId - ID of content
 * @returns {Array} Array of mention records with user details
 */
async function getExistingMentions(contentType, contentId) {
  return await prisma.mention.findMany({
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
}

/**
 * Clean up all mentions for content
 * @param {string} contentType - Type of content
 * @param {string|number} contentId - ID of content
 */
async function cleanupMentions(contentType, contentId) {
  await prisma.mention.deleteMany({
    where: {
      contentType,
      contentId: contentId.toString()
    }
  });
}

/**
 * Clean up specific mentions for content
 * @param {string} contentType - Type of content
 * @param {string|number} contentId - ID of content
 * @param {string[]} usernames - Usernames to remove
 */
async function cleanupSpecificMentions(contentType, contentId, usernames) {
  if (usernames.length === 0) return;

  const users = await prisma.user.findMany({
    where: {
      username: { in: usernames }
    },
    select: { id: true }
  });

  const userIds = users.map(u => u.id);

  await prisma.mention.deleteMany({
    where: {
      contentType,
      contentId: contentId.toString(),
      mentionedId: { in: userIds }
    }
  });
}

/**
 * Send real-time notification via Pusher
 * @param {string} userId - ID of user to notify
 * @param {Object} notificationData - Notification data
 */
async function sendPusherNotification(userId, notificationData) {
  try {
    await pusherServer.trigger(`user-${userId}`, 'notification', {
      ...notificationData,
      timestamp: new Date().toISOString()
    });
    
    console.log(`Sent Pusher notification to user ${userId}`);
  } catch (error) {
    console.error(`Error sending Pusher notification to user ${userId}:`, error);
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
  processMentionsWithDiff,
  updateMentionsWithDiff,
  getMentionsForContent,
  getMentionsForUser,
  extractMentionsFromContent
}; 