const { prisma } = require("../db");
const { pusherServer } = require("../services/pusherServer");

exports.getNotifications = async (req, res) => {
  const { userId } = req.user;

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        receiverId: userId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      status: 200,
      message: "Success",
      data: notifications,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch notifications",
    });
  }
};

exports.markNotificationAsRead = async (req, res) => {
  const { notificationId } = req.params;
  const { userId } = req.user;

  try {
    const notification = await prisma.notification.findFirst({
      where: {
        id: parseInt(notificationId),
        receiverId: userId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        status: "error",
        message: "Notification not found",
      });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: parseInt(notificationId) },
      data: { isRead: true },
    });

    res.status(200).json({
      status: "success",
      data: updatedNotification,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Failed to mark notification as read",
    });
  }
};

exports.markAllNotificationsAsRead = async (req, res) => {
  const { userId } = req.user;

  try {
    await prisma.notification.updateMany({
      where: {
        receiverId: userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.status(200).json({
      status: "success",
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Failed to mark notifications as read",
    });
  }
};

// Helper function to create and send card-related notifications
exports.createCardNotification = async (senderId, receiverId, notificationType, cardData, additionalData = {}) => {
  try {
    const metadata = {
      cardId: cardData.id,
      cardTitle: cardData.title,
      workspaceId: cardData.workspaceId || additionalData.workspaceId,
      ...additionalData,
    };

    const notification = await prisma.notification.create({
      data: {
        senderId,
        receiverId,
        message: notificationType,
        metadata: JSON.stringify(metadata),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Send real-time notification via Pusher
    await pusherServer.trigger("notification", `user:${receiverId}`, {
      type: "card_notification",
      notification,
    });

    return notification;
  } catch (error) {
    console.error("Failed to create card notification:", error);
    throw error;
  }
};

// Send notification when card is assigned
exports.notifyCardAssignment = async (cardId, assigneeId, assignerId) => {
  try {
    if (assigneeId === assignerId) return; // Don't notify self-assignment

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        column: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!card) return;

    await exports.createCardNotification(
      assignerId,
      assigneeId,
      "CARD_ASSIGNED",
      card,
      { workspaceId: card.column.workspace.id, workspaceTitle: card.column.workspace.title }
    );
  } catch (error) {
    console.error("Failed to send card assignment notification:", error);
  }
};

// Send notification when card is updated
exports.notifyCardUpdate = async (cardId, updaterId, previousData, newData) => {
  try {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        assignees: true,
        column: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!card) return;

    // Notify all assignees except the updater
    const assigneesToNotify = card.assignees.filter(
      (assignee) => assignee.id !== updaterId
    );

    const changes = [];
    if (previousData.title !== newData.title) changes.push("title");
    if (previousData.description !== newData.description) changes.push("description");
    if (previousData.dueDate !== newData.dueDate) changes.push("due date");
    if (previousData.priority !== newData.priority) changes.push("priority");

    for (const assignee of assigneesToNotify) {
      await exports.createCardNotification(
        updaterId,
        assignee.id,
        "CARD_UPDATED",
        card,
        {
          workspaceId: card.column.workspace.id,
          workspaceTitle: card.column.workspace.title,
          changes: changes.join(", "),
        }
      );
    }
  } catch (error) {
    console.error("Failed to send card update notification:", error);
  }
};

// Send notification when card is completed
exports.notifyCardCompletion = async (cardId, completerId) => {
  try {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        assignees: true,
        column: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!card) return;

    // Notify all assignees except the completer
    const assigneesToNotify = card.assignees.filter(
      (assignee) => assignee.id !== completerId
    );

    for (const assignee of assigneesToNotify) {
      await exports.createCardNotification(
        completerId,
        assignee.id,
        "CARD_COMPLETED",
        card,
        {
          workspaceId: card.column.workspace.id,
          workspaceTitle: card.column.workspace.title,
        }
      );
    }
  } catch (error) {
    console.error("Failed to send card completion notification:", error);
  }
};

// Send notification when card is commented on
exports.notifyCardComment = async (cardId, commenterId, commentContent) => {
  try {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        assignees: true,
        column: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!card) return;

    // Notify all assignees except the commenter
    const assigneesToNotify = card.assignees.filter(
      (assignee) => assignee.id !== commenterId
    );

    for (const assignee of assigneesToNotify) {
      await exports.createCardNotification(
        commenterId,
        assignee.id,
        "CARD_COMMENTED",
        card,
        {
          workspaceId: card.column.workspace.id,
          workspaceTitle: card.column.workspace.title,
          commentPreview: commentContent.substring(0, 100),
        }
      );
    }
  } catch (error) {
    console.error("Failed to send card comment notification:", error);
  }
};

// Check for due cards and send notifications
exports.checkDueCardsAndNotify = async () => {
  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    // Find cards due in the next 24 hours
    const cardsDueSoon = await prisma.card.findMany({
      where: {
        dueDate: {
          gte: now,
          lte: tomorrow,
        },
        completedAt: null, // Only incomplete cards
      },
      include: {
        assignees: true,
        column: {
          include: {
            workspace: true,
          },
        },
      },
    });

    // Find overdue cards
    const overdueCards = await prisma.card.findMany({
      where: {
        dueDate: {
          lt: now,
        },
        completedAt: null, // Only incomplete cards
      },
      include: {
        assignees: true,
        column: {
          include: {
            workspace: true,
          },
        },
      },
    });

    // Send due soon notifications
    for (const card of cardsDueSoon) {
      for (const assignee of card.assignees) {
        await exports.createCardNotification(
          "system", // System generated
          assignee.id,
          "CARD_DUE_SOON",
          card,
          {
            workspaceId: card.column.workspace.id,
            workspaceTitle: card.column.workspace.title,
            dueDate: card.dueDate,
          }
        );
      }
    }

    // Send overdue notifications
    for (const card of overdueCards) {
      for (const assignee of card.assignees) {
        await exports.createCardNotification(
          "system", // System generated
          assignee.id,
          "CARD_OVERDUE",
          card,
          {
            workspaceId: card.column.workspace.id,
            workspaceTitle: card.column.workspace.title,
            dueDate: card.dueDate,
            daysPastDue: Math.floor((now - new Date(card.dueDate)) / (1000 * 60 * 60 * 24)),
          }
        );
      }
    }
  } catch (error) {
    console.error("Failed to check due cards and notify:", error);
  }
};

exports.createInviteNotification = async (req, res) => {
  const { userId: senderId } = req.user;
  const { receiverId, workspaceId } = req.body;

  try {
    // Check if sender has admin access to the workspace
    const senderAccess = await prisma.workspaceUser.findFirst({
      where: {
        workspaceId: parseInt(workspaceId),
        userId: senderId,
        role: "ADMIN",
      },
    });

    if (!senderAccess) {
      return res.status(403).json({
        status: "error",
        message: "Only workspace admins can send invites",
      });
    }

    // Get workspace details for the notification message
    const workspace = await prisma.workspace.findUnique({
      where: { id: parseInt(workspaceId) },
      select: { title: true },
    });

    const notification = await prisma.notification.create({
      data: {
        message: "JOIN",
        sender: {
          connect: { id: senderId },
        },
        receiver: {
          connect: { id: receiverId },
        },
        metadata: JSON.stringify({ workspaceId, workspaceTitle: workspace.title }),
      },
      select: {
        id: true,
        message: true,
        metadata: true,
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    await pusherServer.trigger("notification", `invite:${receiverId}`, {
      notification,
    });

    res.status(201).json({
      status: "success",
      data: notification,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Failed to create notification",
    });
  }
};