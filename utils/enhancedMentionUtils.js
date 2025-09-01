const { PrismaClient } = require("@prisma/client");
const { pusherServer } = require("../services/pusherServer");
const prisma = new PrismaClient();

/**
 * Converts HTML content to plain text.
 * Use before extracting mentions or mention context.
 * @param {string} htmlContent
 * @returns {string} Plain text output
 */
function htmlToText(htmlContent) {
  if (!htmlContent) return "";
  let text = htmlContent
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<p[^>]*>/gi, ' ')
    .replace(/<\/div>/gi, ' ')
    .replace(/<div[^>]*>/gi, ' ')
    .replace(/<\/(h[1-6]|li|td|th|blockquote)>/gi, ' ')
    .replace(/<(h[1-6]|li|td|th|blockquote)[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

/**
 * Extract all @username mentions from plain text.
 * @param {string} content - Plain text only!
 * @returns {string[]}
 */
function extractMentionsFromContent(content) {
  if (!content) return [];
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  return [...new Set(mentions)];
}

/**
 * Get meaningful context (sentence, paragraph, or word window) around a mention.
 * Operates on plain text only; supply html-converted version!
 * @param {string} content - Plain text
 * @param {string} username
 * @returns {string}
 */
function getSmartMentionContext(content, username) {
  if (!content || !username) return "";
  const cleanContent = content.replace(/\s+/g, " ").trim();
  if (cleanContent.length <= 100) return cleanContent;

  // Try paragraph-based first
  const paragraphs = cleanContent.split(/\n\s*\n/);
  for (const paragraph of paragraphs) {
    if (paragraph.includes(`@${username}`)) {
      if (paragraph.length <= 300) return paragraph.trim();
      break;
    }
  }
  return extractMentionContext(cleanContent, username);
}

function extractMentionContext(content, username) {
  if (!content || !username) return "";
  const cleanContent = content.replace(/\s+/g, " ").trim();
  const mentionPattern = new RegExp(`@${username}\\b`, "gi");
  const match = mentionPattern.exec(cleanContent);
  if (!match) return `@${username}`;
  const mentionIndex = match.index;

  // Try sentence-based context
  const sentences = cleanContent.split(/[.!?]+/);
  let currentPos = 0;
  for (const sentence of sentences) {
    const sentenceEnd = currentPos + sentence.length;
    if (mentionIndex >= currentPos && mentionIndex <= sentenceEnd) {
      const trimmedSentence = sentence.trim();
      if (trimmedSentence.length > 0) {
        if (trimmedSentence.length > 200)
          return getWordBasedContext(cleanContent, mentionIndex, username);
        return trimmedSentence;
      }
    }
    currentPos = sentenceEnd + 1;
  }
  // Fall back to a window of words
  return getWordBasedContext(cleanContent, mentionIndex, username);
}

function getWordBasedContext(content, mentionIndex, username) {
  const words = content.split(/\s+/);
  let mentionWordIndex = -1;
  let currentPos = 0;
  for (let i = 0; i < words.length; i++) {
    const wordStart = currentPos;
    const wordEnd = currentPos + words[i].length;
    if (mentionIndex >= wordStart && mentionIndex < wordEnd) {
      mentionWordIndex = i;
      break;
    }
    currentPos = wordEnd + 1;
  }
  if (mentionWordIndex === -1) return `@${username}`;
  const contextRadius = 8;
  const startIndex = Math.max(0, mentionWordIndex - contextRadius);
  const endIndex = Math.min(words.length, mentionWordIndex + contextRadius + 1);
  let contextWords = words.slice(startIndex, endIndex);
  let context = contextWords.join(" ");
  if (startIndex > 0) context = "..." + context;
  if (endIndex < words.length) context = context + "...";
  return context.trim();
}

/**
 * Get all existing mentions for content.
 * @param {string} contentType
 * @param {string|number} contentId
 * @returns {Array} mention records with user details
 */
async function getExistingMentions(contentType, contentId) {
  return await prisma.mention.findMany({
    where: { contentType, contentId: contentId.toString() },
    include: {
      mentionedUser: {
        select: {
          id: true, username: true, name: true, imageUrl: true,
        },
      },
    },
  });
}

/**
 * Clean up all mentions for content.
 */
async function cleanupMentions(contentType, contentId) {
  await prisma.mention.deleteMany({
    where: { contentType, contentId: contentId.toString() },
  });
}

/**
 * Clean up mentions for specific usernames.
 */
async function cleanupSpecificMentions(contentType, contentId, usernames) {
  if (usernames.length === 0) return;
  const users = await prisma.user.findMany({
    where: { username: { in: usernames } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);
  await prisma.mention.deleteMany({
    where: {
      contentType,
      contentId: contentId.toString(),
      mentionedId: { in: userIds },
    },
  });
}

/**
 * Send a real-time notification via Pusher.
 */
async function sendPusherNotification(userId, notificationData) {
  try {
    await pusherServer.trigger(`user-${userId}`, "notification", {
      ...notificationData,
      timestamp: new Date().toISOString(),
    });
    console.log(`Sent Pusher notification to user ${userId}`);
  } catch (error) {
    console.error(`Error sending Pusher notification to user ${userId}:`, error);
  }
}

/**
 * Process new mentions (HTML input, but everything after is plain text).
 */
async function processMentionsWithDiff(
  contentType,
  contentId,
  newContent,    // HTML string - description/body ONLY
  authorId,
  authorName,
  contentTitle,
  workspaceSlug
) {
  try {
    console.log(`Processing mentions for ${contentType} ${contentId}`);

    // Convert description HTML to plain text
    const plainText = htmlToText(newContent);

    // Extract mentions from plain text description only
    const newMentions = extractMentionsFromContent(plainText);
    if (newMentions.length === 0) {
      await cleanupMentions(contentType, contentId);
      return {
        success: true, newNotifications: 0, message: "No mentions found",
      };
    }

    // Fetch existing mentions
    const existingMentions = await getExistingMentions(contentType, contentId);
    const existingUsernames = existingMentions.map(m => m.mentionedUser.username);

    // Determine newly mentioned usernames
    const newlyMentioned = newMentions.filter(
      username => !existingUsernames.includes(username)
    );

    if (newlyMentioned.length === 0) {
      return { success: true, newNotifications: 0, message: "No new mentions" };
    }

    // Fetch user info for newly mentioned
    const usersToNotify = await prisma.user.findMany({
      where: { username: { in: newlyMentioned }},
      select: { id: true, username: true, name: true, imageUrl: true },
    });

    // Filter out self-mentions (don't send notifications to yourself)
    const usersToNotifyFiltered = usersToNotify.filter(user => user.id !== authorId);

    // Create mention records and notifications
    const notificationPromises = usersToNotifyFiltered.map(async (user) => {
      try {
        await prisma.mention.create({
          data: {
            mentionedId: user.id,
            contentType,
            contentId: contentId.toString(),
          },
        });

        const mentionContext = getSmartMentionContext(plainText, user.username);

        const notification = await prisma.notification.create({
          data: {
            receiverId: user.id,
            senderId: authorId,
            type: "mention",
            title: "You were mentioned",
            message: "MENTION",
            contentType,
            contentId: contentId.toString(),
            metadata: JSON.stringify({
              authorName,
              contentTitle,             // For display only, NOT in mentionContext
              contentType,
              contentId: contentId.toString(),
              contentContext: mentionContext,
              workspaceSlug: workspaceSlug,
            }),
          }
        });

        await sendPusherNotification(user.id, {
          type: "mention",
          title: "You were mentioned",
          message: `${authorName} mentioned you in ${contentTitle}`,
          notificationId: notification.id,
          contentType,
          contentId: contentId.toString(),
          authorName,
          contentTitle,
          contentContext: mentionContext,
          isRead: false,
        });

        return notification;
      } catch (error) {
        console.error(
          `Error creating notification for user ${user.username}:`, error
        );
        return null;
      }
    });

    const createdNotifications = await Promise.all(notificationPromises);
    const successfulNotifications = createdNotifications.filter(n => n !== null);
    return {
      success: true,
      newNotifications: successfulNotifications.length,
      mentionedUsers: usersToNotifyFiltered.map(u => u.username),
      message: `Created ${successfulNotifications.length} notifications`,
    };
  } catch (error) {
    console.error("Error processing mentions with diff:", error);
    throw error;
  }
}

/**
 * Update mentions for modified content.
 * Cleans up removed mentions, adds new.
 * Only from description/body (HTML input converted to plain text).
 */
async function updateMentionsWithDiff(
  contentType,
  contentId,
  newContent,  // HTML string - description/body ONLY
  authorId,
  authorName,
  contentTitle,
  workspaceSlug
) {
  try {
    console.log(`Updating mentions for ${contentType} ${contentId}`);

    const plainText = htmlToText(newContent);

    const newMentions = extractMentionsFromContent(plainText);
    const existingMentions = await getExistingMentions(contentType, contentId);
    const existingUsernames = existingMentions.map(m => m.mentionedUser.username);

    // Find newly mentioned usernames
    const newlyMentioned = newMentions.filter(
      username => !existingUsernames.includes(username)
    );

    // Find removed mentions no longer present
    const removedMentions = existingUsernames.filter(
      username => !newMentions.includes(username)
    );

    // Remove obsolete mention records
    if (removedMentions.length > 0) {
      await cleanupSpecificMentions(contentType, contentId, removedMentions);
    }

    if (newlyMentioned.length === 0) {
      return {
        success: true,
        newNotifications: 0,
        removedMentions: removedMentions.length,
      };
    }

    // Fetch user info for newly mentioned
    const usersToNotify = await prisma.user.findMany({
      where: { username: { in: newlyMentioned }},
      select: { id: true, username: true, name: true, imageUrl: true }
    });

    // Filter out self-mentions (don't send notifications to yourself)
    const usersToNotifyFiltered = usersToNotify.filter(user => user.id !== authorId);

    // Create new mention records and notifications
    const notificationPromises = usersToNotifyFiltered.map(async (user) => {
      try {
        await prisma.mention.create({
          data: {
            mentionedId: user.id,
            contentType,
            contentId: contentId.toString(),
          },
        });

        const mentionContext = getSmartMentionContext(plainText, user.username);

        const notification = await prisma.notification.create({
          data: {
            receiverId: user.id,
            senderId: authorId,
            type: "mention",
            title: "You were mentioned",
            message: "MENTION",
            contentType,
            contentId: contentId.toString(),
            metadata: JSON.stringify({
              authorName,
              contentTitle,          // Display only
              contentType,
              contentId: contentId.toString(),
              contentContext: mentionContext,
              workspaceSlug: workspaceSlug,
            }),
          }
        });

        await sendPusherNotification(user.id, {
          type: "mention",
          title: "You were mentioned",
          message: `${authorName} mentioned you in ${contentTitle}`,
          notificationId: notification.id,
          contentType,
          contentId: contentId.toString(),
          authorName,
          contentTitle,
          contentContext: mentionContext,
        });

        return notification;
      } catch (error) {
        console.error(
          `Error creating notification for user ${user.username}:`, error
        );
        return null;
      }
    });

    const createdNotifications = await Promise.all(notificationPromises);
    const successfulNotifications = createdNotifications.filter(n => n !== null);

    return {
      success: true,
      newNotifications: successfulNotifications.length,
      removedMentions: removedMentions.length,
      mentionedUsers: usersToNotifyFiltered.map(u => u.username),
      message: `Created ${successfulNotifications.length} notifications, removed ${removedMentions.length} mentions`,
    };
  } catch (error) {
    console.error("Error updating mentions with diff:", error);
    throw error;
  }
}

// Export all utilities
module.exports = {
  processMentionsWithDiff,
  updateMentionsWithDiff,
  extractMentionsFromContent,
  extractMentionContext,
  getSmartMentionContext,
  getWordBasedContext,
  getExistingMentions,
  cleanupMentions,
  cleanupSpecificMentions,
  sendPusherNotification,
  htmlToText
};
