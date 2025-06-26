const { prisma } = require("../db");

const createCard = async (req, res) => {
  const { columnId } = req.query;

  try {
    const { title, description, labels, attachments, dueDate, assigneeIds, priority, storyPoints } =
      req.body;

    const lastCard = await prisma.card.findFirst({
      where: { columnId: parseInt(columnId) },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    // If a column was found, increment its order value for the new column.
    // If no column was found, start the ordering at 1.
    const newOrder = lastCard ? lastCard.order + 1 : 1;

    const card = await prisma.card.create({
      data: {
        title: title,
        description: description,
        labels: labels,
        attachments: attachments,
        dueDate: dueDate,
        priority: priority,
        storyPoints: storyPoints !== undefined ? parseInt(storyPoints) : 0,
        order: newOrder,
        column: {
          connect: {
            id: parseInt(columnId),
          },
        },
        assignees: assigneeIds
          ? {
              connect: assigneeIds.map((id) => ({ id })),
            }
          : undefined,
      },
      include: {
        assignees: true,
        comments: true,
      },
    });

    res.status(201).json({
      status: 201,
      message: "Success",
      data: card,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
};

const updateCard = async (req, res) => {
  const { cardId } = req.params;
  const { userId } = req.user;
  const {
    title,
    description,
    columnId,
    label: newLabel,
    attachments,
    dueDate,
    order,
    priority,
    assigneeId,
    storyPoints,
  } = req.body;

  try {
    // First, get the current card data
    const currentCard = await prisma.card.findUnique({
      where: { id: parseInt(cardId) },
      include: {
        assignees: true,
      },
    });

    if (!currentCard) {
      return res.status(404).json({
        status: 404,
        message: "Card not found",
      });
    }

    // Store previous data for notification comparison
    const previousData = {
      title: currentCard.title,
      description: currentCard.description,
      dueDate: currentCard.dueDate,
      priority: currentCard.priority,
    };

    let updatedLabels;
    if (newLabel && currentCard.labels.includes(newLabel)) {
      updatedLabels = currentCard.labels.filter((label) => label !== newLabel);
    } else if (newLabel) {
      updatedLabels = [...currentCard.labels, newLabel];
    } else {
      updatedLabels = currentCard.labels;
    }

    // Prepare update data
    const updateData = {
      title: title ?? currentCard.title,
      description: description ?? currentCard.description,
      columnId: columnId ? parseInt(columnId) : currentCard.columnId,
      labels: updatedLabels,
      attachments: attachments ?? currentCard.attachments,
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : currentCard.dueDate,
      order: order ?? currentCard.order,
      priority: priority ?? currentCard.priority,
      storyPoints: storyPoints !== undefined ? parseInt(storyPoints) : currentCard.storyPoints,
    };

    let wasAssigned = false;
    // Handle assignee assignment/unassignment
    if (assigneeId !== undefined) {
      if (assigneeId === null || assigneeId === "") {
        // Unassign all assignees
        updateData.assignees = {
          set: [], // This removes all assignees
        };
      } else {
        // Check if user is already assigned
        const isAlreadyAssigned = currentCard.assignees.some(
          (assignee) => assignee.id === assigneeId
        );

        if (!isAlreadyAssigned) {
          // Add the new assignee (for now, we'll replace all assignees with this one)
          // In the future, this can be modified to support multiple assignees
          updateData.assignees = {
            set: [{ id: assigneeId }], // Replace all assignees with this one
          };
          wasAssigned = true;
        }
      }
    }

    // Update the card
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
      },
    });

    // Send notifications
    const notificationController = require("./notificationController");
    
    // Send assignment notification if a new assignee was added
    if (wasAssigned && assigneeId) {
      await notificationController.notifyCardAssignment(
        parseInt(cardId),
        assigneeId,
        userId
      );
    }

    // Send update notification if any significant fields changed
    const newData = {
      title: updateData.title,
      description: updateData.description,
      dueDate: updateData.dueDate,
      priority: updateData.priority,
    };

    const hasChanges = 
      previousData.title !== newData.title ||
      previousData.description !== newData.description ||
      (previousData.dueDate?.getTime() !== newData.dueDate?.getTime()) ||
      previousData.priority !== newData.priority;

    if (hasChanges) {
      await notificationController.notifyCardUpdate(
        parseInt(cardId),
        userId,
        previousData,
        newData
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
    await prisma.card.delete({
      where: {
        id: parseInt(cardId),
      },
    });

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
      include: { column: true }
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
        column: true,
      },
    });

    // Send completion notification
    const notificationController = require("./notificationController");
    await notificationController.notifyCardCompletion(
      parseInt(cardId),
      userId
    );

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
      where: { id: parseInt(cardId) }
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
        column: true,
      },
    });

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
        boardId: parseInt(boardId)
      };
    }

    const cards = await prisma.card.findMany({
      where: whereClause,
      include: {
        comments: true,
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
    const cardsWithStatus = cards.map(card => {
      const isCompleted = !!card.completedAt;
      const isOverdue = !isCompleted && card.dueDate && new Date(card.dueDate) < now;
      
      return {
        ...card,
        status: {
          isCompleted,
          isOverdue,
          isOnTime: card.isOnTime,
          daysOverdue: isOverdue 
            ? Math.ceil((now.getTime() - new Date(card.dueDate).getTime()) / (1000 * 60 * 60 * 24))
            : 0
        }
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
