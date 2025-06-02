const { prisma } = require("../db");

const createCard = async (req, res) => {
  const { columnId } = req.query;

  try {
    const { title, description, labels, attachments, dueDate, assigneeIds } =
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
      dueDate: dueDate ? new Date(dueDate) : currentCard.dueDate,
      order: order ?? currentCard.order,
      priority: priority ?? currentCard.priority,
    };

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



module.exports = {
  getCardDetails,
  createCard,
  updateCard,
  getCards,
  getCard,
  deleteCard,
};
