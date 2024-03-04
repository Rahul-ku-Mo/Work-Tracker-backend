const { prisma } = require("../db");

exports.getBoards = async (req, res) => {
  const { userId } = req.user;

  try {
    const boards = await prisma.board.findMany({
      where: {
        userId: userId,
      },
      include: {
        columns: true,
      },
    });

    res.status(201).json({
      status: 201,
      message: "Success",
      data: boards,
    });
  } catch (error) {
    console.log(error);
  }
};
exports.getBoard = async (req, res) => {
  const { boardId } = req.params;

  if (!boardId) {
    return res.status(400).json({
      status: 400,
      message: "boardId is required",
    });
  }

  try {
    const board = await prisma.board.findUnique({
      where: { boardId: boardId },
      include: {
        columns: true,
      },
    });

    res.status(201).json({
      status: 201,
      message: "Success",
      data: board,
    });
  } catch (error) {
    console.log(error);
  }
};

exports.createBoard = async (req, res) => {
  try {
    const { title, imageUrl } = req.body;

    const { userId } = req.user;

    const board = await prisma.board.create({
      data: {
        title,
        imageUrl,
        user: {
          connect: { id: userId },
        },
      },
    });

    res.status(201).json({
      status: 201,
      message: "Success",
      data: board,
    });
  } catch (e) {
    console.log(e);
  }
};

exports.deleteBoard = async (req, res) => {
  const { boardId } = req.params;

  try {
    await prisma.board.delete({ where: { id: boardId } });

    res.status(204).json({
      status: 204,
      message: "Success",
    });
  } catch (err) {
    console.log(err);
  }
};
