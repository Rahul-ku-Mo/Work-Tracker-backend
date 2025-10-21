const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
// Slug generation is now handled automatically via workspace prefix + number
const {
  processMentionsWithDiff,
  updateMentionsWithDiff,
} = require("../utils/enhancedMentionUtils");
const notificationController = require("./notification.controller");
const { pusherServer } = require("../services/pusherServer");

const createCard = async (req, res) => {
  const { columnId } = req.query;

  if (!columnId) {
    return res.status(400).json({
      status: 400,
      message: "Column ID is required",
    });
  }

  const parsedColumnId = parseInt(columnId);

  const {
    title,
    description,
    labelIds,
    attachments,
    dueDate,
    priority,
    storyPoints,
    order,
    assigneeIds,
  } = req.body;

  try {
    // Use transaction to ensure atomic card creation with workspace numbering
    const card = await prisma.$transaction(async (tx) => {
      // Get workspace through column relationship
      const column = await tx.column.findUnique({
        where: { id: parsedColumnId },
        include: { workspace: true },
      });

      if (!column) {
        throw new Error("Column not found");
      }

      // Get max order for this column
      const maxOrder = await tx.card.aggregate({
        where: { columnId: parsedColumnId },
        _max: { order: true },
      });

      const newOrder = (maxOrder._max.order || 0) + 1;

      // Increment workspace counter and get the new number
      const updatedWorkspace = await tx.workspace.update({
        where: { id: column.workspace.id },
        data: { nextCardNum: { increment: 1 } },
        select: { prefix: true, nextCardNum: true },
      });

      // Create card with workspace-scoped number
      const workspaceNumber = updatedWorkspace.nextCardNum;
      const slug = `${updatedWorkspace.prefix}-${workspaceNumber}`;

      return await tx.card.create({
        data: {
          title: title,
          slug: slug,
          workspaceNumber: workspaceNumber,
          description: description,
          attachments: attachments,
          dueDate: dueDate,
          priority: priority,
          storyPoints: storyPoints !== undefined ? parseInt(storyPoints) : 0,
          order: newOrder,
          column: {
            connect: {
              id: parsedColumnId,
            },
          },
          labels:
            labelIds && labelIds.length > 0
              ? {
                  connect: labelIds.map((id) => ({ id })),
                }
              : undefined,
          assignees: assigneeIds
            ? {
                connect: assigneeIds.map((id) => ({ id })),
              }
            : undefined,
        },
        include: {
          assignees: true,
          comments: true,
          labels: true,
          column: {
            include: {
              workspace: true,
            },
          },
        },
      });
    });

    // Process mentions in **description only**
    if (description) {
      try {
        const author = await prisma.user.findUnique({
          where: { id: req.user.userId },
          select: { name: true, username: true },
        });

        await processMentionsWithDiff(
          "task",
          card.slug,
          description, // ONLY description here
          req.user.userId,
          author?.name || author?.username || "Unknown User",
          title || "Untitled Card", // title only for display
          card.column.workspace.slug
        );
      } catch (mentionError) {
        console.error("Error processing mentions:", mentionError);
      }
    }

    // Send workspace update via Pusher
    try {
      if (card.column.workspace) {
        await pusherServer.trigger(
          `workspace-${card.column.workspace.slug}`,
          "card-created",
          {
            cardId: card.id,
            action: "create",
            timestamp: new Date().toISOString(),
          }
        );
      }
    } catch (pusherError) {
      console.error(
        "Error sending Pusher notification for card creation:",
        pusherError
      );
    }

    res.status(201).json({
      status: 201,
      message: "Success",
      data: card,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: 500,
      message: err.message || "Failed to create card",
    });
  }
};

const updateCard = async (req, res) => {
  const { cardId } = req.params;
  const { userId } = req.user;

  const {
    title,
    description,
    columnId,
    labelId: newLabelId,
    attachments,
    dueDate,
    order,
    priority,
    assigneeId,
    storyPoints,
  } = req.body;

  try {
    const currentCard = await prisma.card.findUnique({
      where: { id: parseInt(cardId) },
      include: {
        assignees: true,
        labels: true,
        column: {
          include: {
            workspace: {
              include: {
                members: {
                  include: { user: true },
                },
              },
            },
          },
        },
      },
    });

    if (!currentCard) {
      return res.status(404).json({
        status: 404,
        message: "Card not found",
      });
    }

    // Handle label updates
    let labelOperation = {};
    if (newLabelId) {
      const isCurrentlyAttached = currentCard.labels.some(
        (label) => label.id === newLabelId
      );
      if (isCurrentlyAttached) {
        // Remove the label
        labelOperation = {
          labels: {
            disconnect: { id: newLabelId },
          },
        };
      } else {
        // Add the label
        labelOperation = {
          labels: {
            connect: { id: newLabelId },
          },
        };
      }
    }

    const updateData = {
      title: title ?? currentCard.title,
      description: description ?? currentCard.description,
      columnId: columnId ? parseInt(columnId) : currentCard.columnId,
      attachments: attachments ?? currentCard.attachments,
      dueDate:
        dueDate !== undefined
          ? dueDate
            ? new Date(dueDate)
            : null
          : currentCard.dueDate,
      order: order ?? currentCard.order,
      priority: priority ?? currentCard.priority,
      storyPoints:
        storyPoints !== undefined
          ? parseInt(storyPoints)
          : currentCard.storyPoints,
      ...labelOperation,
    };

    // Note: We don't update the slug when title changes since it's tied to workspace numbering
    // The slug follows the format "PREFIX-NUMBER" and should remain constant

    let wasAssigned = false;
    if (assigneeId !== undefined) {
      if (assigneeId === null || assigneeId === "") {
        updateData.assignees = { set: [] };
      } else {
        const isAlreadyAssigned = currentCard.assignees.some(
          (a) => a.id === assigneeId
        );
        if (!isAlreadyAssigned) {
          updateData.assignees = { set: [{ id: assigneeId }] };
          wasAssigned = true;
        }
      }
    }

    const updatedCard = await prisma.card.update({
      where: { id: parseInt(cardId) },
      data: updateData,
      include: {
        assignees: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            imageUrl: true,
          },
        },
        labels: true,
        column: {
          include: {
            workspace: {
              include: {
                members: {
                  include: { user: true },
                },
              },
            },
          },
        },
      },
    });

    if (wasAssigned && assigneeId) {
      await notificationController.notifyCardAssignment(
        parseInt(cardId),
        assigneeId,
        userId
      );
    }

    // Process mentions in **description only**
    if (description !== undefined) {
      try {
        const author = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, username: true },
        });

        await updateMentionsWithDiff(
          "task",
          updatedCard.slug,
          description, // ONLY description
          userId,
          author?.name || author?.username || "Unknown User",
          title || updatedCard.title || "Untitled Card", // title only for notification display
          updatedCard.column.workspace.slug
        );
      } catch (mentionError) {
        console.error("Error processing mentions:", mentionError);
      }
    }

    try {
      await pusherServer.trigger(
        `workspace-${updatedCard.column.workspace.slug}`,
        "card-updated",
        {
          cardId: updatedCard.id,
          action: "update",
          timestamp: new Date().toISOString(),
        }
      );
    } catch (pusherError) {
      console.error(
        "Error sending Pusher notification for card update:",
        pusherError
      );
    }

    res.status(200).json({
      status: 200,
      message: "Success",
      data: updatedCard,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

const getCards = async (req, res) => {
  const { columnId } = req.query;

  try {
    const cards = await prisma.card.findMany({
      where: {
        columnId: parseInt(columnId),
      },
      include: {
        comments: true,
        labels: true,
        assignees: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            imageUrl: true,
          },
        },
      },
    });

    res.status(200).json({
      status: 200,
      message: "Success",
      data: cards,
    });
  } catch (error) {
    console.log(error);
  }
};

const getCard = async (req, res) => {
  const { cardId } = req.params;

  try {
    const cards = await prisma.card.findUnique({
      where: {
        id: parseInt(cardId),
      },
      include: {
        comments: true,
        labels: true,
        assignees: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            imageUrl: true,
          },
        },
      },
    });

    res.status(200).json({
      status: 200,
      message: "Success",
      data: cards,
    });
  } catch (error) {
    console.log(error);
  }
};

const deleteCard = async (req, res) => {
  const { cardId } = req.params;

  try {
    const card = await prisma.card.delete({
      where: {
        id: parseInt(cardId),
      },
      include: {
        column: {
          include: {
            workspace: true,
          },
        },
      },
    });

    // Send workspace update via Pusher
    try {
      if (card.column.workspace) {
        await pusherServer.trigger(
          `workspace-${card.column.workspace.slug}`,
          "card-deleted",
          {
            cardId: card.id,
            action: "deleted",
            timestamp: new Date().toISOString(),
          }
        );
      }
    } catch (pusherError) {
      console.error(
        "Error sending Pusher notification for card creation:",
        pusherError
      );
    }

    res.status(204).json({
      status: 204,
      message: "success",
    });
  } catch (error) {
    console.log(error);
  }
};

const getCardDetails = async (req, res) => {
  const { cardId } = req.params;

  try {
    const card = await prisma.card.findUnique({
      where: {
        id: parseInt(cardId),
      },
    });

    if (!card) {
      return res.status(404).json({
        status: 404,
        message: "Card not found",
      });
    }

    return res.status(200).json({
      status: 200,
      message: "success",
      data: card,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const upsertCardTimeEntry = async (req, res) => {
  const { cardId } = req.params;

  try {
    const filters = {};

    if (startDate && endDate) {
      filters.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (cardId) {
      filters.cardId = parseInt(cardId);
    }

    if (userId) {
      filters.userId = userId;
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where: filters,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
          },
        },
        card: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return res.status(200).json({
      status: 200,
      message: "success!! Time entries fetched successfully",
      data: timeEntries,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error!! Failed to fetch time entries",
      error: error.message,
    });
  }
};

const updateCardAnalytics = async (req, res) => {
  try {
    const { cardId } = req.params;
    const requestObject = req.body;

    //for updating estimated hours
    if (Object.hasOwn(requestObject, "estimatedHours")) {
      const { estimatedHours } = requestObject;

      const card = await prisma.card.update({
        where: { id: parseInt(cardId) },
        data: { estimatedHours },
      });
    }
  } catch (error) {
    console.log(error);
  }
};

// Mark card as completed
const markCardComplete = async (req, res) => {
  const { cardId } = req.params;
  const { userId } = req.user;

  try {
    const card = await prisma.card.findUnique({
      where: { id: parseInt(cardId) },
      include: { column: true },
    });

    if (!card) {
      return res.status(404).json({
        status: 404,
        message: "Card not found",
      });
    }

    const now = new Date();
    const isOnTime = card.dueDate ? now <= new Date(card.dueDate) : true;

    const updatedCard = await prisma.card.update({
      where: { id: parseInt(cardId) },
      data: {
        completedAt: now,
        isOnTime: isOnTime,
      },
      include: {
        assignees: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            imageUrl: true,
          },
        },
        column: {
          include: {
            workspace: true,
          },
        },
      },
    });

    // Send completion notification
    await notificationController.notifyCardCompletion(parseInt(cardId), userId);

    try {
      await pusherServer.trigger(
        `workspace-${updatedCard.column.workspace.slug}`,
        "card-updated",
        {
          cardId: updatedCard.id,
          action: "update",
          timestamp: new Date().toISOString(),
        }
      );
    } catch (pusherError) {
      console.error(
        "Error sending Pusher notification for card update:",
        pusherError
      );
    }

    res.status(200).json({
      status: 200,
      message: "Card marked as complete",
      data: updatedCard,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// Mark card as incomplete
const markCardIncomplete = async (req, res) => {
  const { cardId } = req.params;

  try {
    const card = await prisma.card.findUnique({
      where: { id: parseInt(cardId) },
    });

    if (!card) {
      return res.status(404).json({
        status: 404,
        message: "Card not found",
      });
    }

    const updatedCard = await prisma.card.update({
      where: { id: parseInt(cardId) },
      data: {
        completedAt: null,
        isOnTime: null,
      },
      include: {
        assignees: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            imageUrl: true,
          },
        },
        labels: true,
        column: {
          include: {
            workspace: true,
          },
        },
      },
    });

    try {
      await pusherServer.trigger(
        `workspace-${updatedCard.column.workspace.slug}`,
        "card-updated",
        {
          cardId: updatedCard.id,
          action: "update",
          timestamp: new Date().toISOString(),
        }
      );
    } catch (pusherError) {
      console.error(
        "Error sending Pusher notification for card update:",
        pusherError
      );
    }

    res.status(200).json({
      status: 200,
      message: "Card marked as incomplete",
      data: updatedCard,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// Get cards with completion and overdue status
const getCardsWithStatus = async (req, res) => {
  const { columnId, boardId } = req.query;

  try {
    const whereClause = {};

    if (columnId) {
      whereClause.columnId = parseInt(columnId);
    } else if (boardId) {
      whereClause.column = {
        boardId: parseInt(boardId),
      };
    }

    const cards = await prisma.card.findMany({
      where: whereClause,
      include: {
        comments: true,
        labels: true,
        assignees: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            imageUrl: true,
          },
        },
        column: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Add computed status fields
    const now = new Date();
    const cardsWithStatus = cards.map((card) => {
      const isCompleted = !!card.completedAt;
      const isOverdue =
        !isCompleted && card.dueDate && new Date(card.dueDate) < now;

      return {
        ...card,
        status: {
          isCompleted,
          isOverdue,
          isOnTime: card.isOnTime,
          daysOverdue: isOverdue
            ? Math.ceil(
                (now.getTime() - new Date(card.dueDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : 0,
        },
      };
    });

    res.status(200).json({
      status: 200,
      message: "Success",
      data: cardsWithStatus,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCardDetails,
  createCard,
  updateCard,
  getCards,
  getCard,
  deleteCard,
  upsertCardTimeEntry,
  updateCardAnalytics,
  markCardComplete,
  markCardIncomplete,
  getCardsWithStatus,
};
