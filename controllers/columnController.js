const { prisma } = require("../db");

exports.getColumns = async (req, res) => {
  const { boardId } = req.query; // Assuming we're passing the boardId as a query parameter

  try {
    const columns = await prisma.column.findMany({
      where: { boardId: parseInt(boardId) },
      include: {
        cards: {
          include: {
            comments: true,
          },
        },
      },
    });

    res.status(200).json({
      status: 200,
      message: "Success",
      data: columns,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

exports.createColumn = async (req, res) => {
  const { boardId } = req.query;
  try {
    const board = await prisma.board.findUnique({
      where: { id: parseInt(boardId) },
    });

    if (!board) {
      return res.status(404).json({
        status: 404,
        message: "Board not found",
      });
    }

    const { title } = req.body;

    const column = await prisma.column.create({
      data: {
        title,
        board: {
          connect: { id: parseInt(boardId) },
        },
      },
    });

    res.status(201).json({
      status: 201,
      message: "Success",
      data: column,
    });
  } catch (err) {
    console.log(err);
  }
};

exports.getColumn = async (req, res) => {
  const { columnId } = req.params;

  if (!columnId) {
    return res.status(400).json({
      status: 400,
      message: "columnId is required",
    });
  }

  try {
    const column = await prisma.column.findUnique({
      where: { id: parseInt(columnId) },
      include: {
        cards: {
          include: {
            comments: true,
          },
        },
      },
    });

    res.status(201).json({
      status: 201,
      message: "Success",
      data: column,
    });
  } catch (error) {
    console.log(error);
  }
};

exports.updateColumn = async (req, res) => {
  const { columnId } = req.params;
  const { title } = req.body;

  try {
    const column = await prisma.column.update({
      where: { id: parseInt(columnId) },
      data: { title },
      include: {
        cards: {
          include: { comments: true },
        },
      },
    });

    res.status(201).json({
      status: 201,
      message: "Success",
      data: column,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

exports.deleteColumn = async (req, res) => {
  const { columnId } = req.params;
  try {
    await prisma.column.delete({
      where: {
        id: parseInt(columnId),
      },
    });
    res.status(204).json({
      status: 204,
      message: "Success",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
