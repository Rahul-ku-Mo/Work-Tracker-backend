const { prisma } = require("../db");

exports.createCard = async (req, res) => {
  const { columnId } = req.query;

  try {
    const { title } = req.body;

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
        order: newOrder,
        column: {
          connect: {
            id: parseInt(columnId),
          },
        },
      },
    });

    res.status(201).json({
      status: 201,
      message: "Success",
      data: card,
    });
  } catch (err) {
    console.log(err);
  }
};

exports.updateCard = async (req, res) => {
  const { cardId } = req.params;
  const { title, description, columnId, labels, attachments, dueDate, order } =
    req.body;

  try {
    const data = {};
    if (title !== undefined) data.title = title;
    if (order !== undefined) data.order = order;
    if (description !== undefined) data.description = description;
    if (columnId !== undefined) data.columnId = parseInt(columnId);
    if (labels !== undefined) data.labels = labels;
    if (attachments !== undefined) data.attachments = attachments;
    if (dueDate !== undefined) data.dueDate = new Date(dueDate);

    const card = await prisma.card.update({
      where: { id: parseInt(cardId) },
      data,
      include: {
        comments: true,
      },
    });

    res.status(201).json({
      status: 201,
      message: "Success",
      data: card,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

exports.getCards = async (req, res) => {
  const { columnId } = req.query;

  try {
    const cards = await prisma.card.findMany({
      where: {
        columnId: parseInt(columnId),
      },
      include: {
        comments: true,
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

exports.getCard = async (req, res) => {
  const { cardId } = req.params;

  try {
    const cards = await prisma.card.findUnique({
      where: {
        id: parseInt(cardId),
      },
      include: {
        comments: true,
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

exports.deleteCard = async (req, res) => {
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
