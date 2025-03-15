const { prisma } = require("../db");

exports.getBoards = async (req, res) => {
  const { userId } = req.user;

  try {
    // Find user's team
    const team = await prisma.team.findFirst({
      where: {
        members: {
          some: {
            id: userId
          }
        }
      }
    });
    
    if (!team) {
      return res.status(200).json({
        status: 200,
        message: "No team found",
        data: []
      });
    }
    
    // Get boards for this team that the user has access to
    const boards = await prisma.board.findMany({
      where: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      status: 200,
      message: "Success",
      data: boards,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
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
      where: { id: parseInt(boardId) },
      include: {
        columns: {
          include: {
            cards: {
              include: {
                assignees: {
                  select: {
                    id: true,
                    name: true,
                    imageUrl: true,
                  },
                },
              },
            },
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });
    if (!board) {
      return res.status(404).json({
        status: "error",
        message: "Board not found",
      });
    }
    res.status(200).json({
      status: "success",
      data: board,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch board",
    });
  }
};

exports.createBoard = async (req, res) => {
  try {
    const { title, colorId, colorValue, colorName } = req.body;
    const { userId } = req.user;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // Check if user is an admin
    if (user.role !== "ADMIN") {
      return res.status(403).json({
        status: 403,
        message: "Only administrators can create boards",
      });
    }
    
    // Check if user has a team as captain
    const team = await prisma.team.findFirst({
      where: {
        captainId: userId
      }
    });
    
    if (!team) {
      return res.status(400).json({
        status: 400,
        message: "You need to create a team first",
      });
    }

    const board = await prisma.board.create({
      data: {
        title,
        colorId,
        colorValue,
        colorName,
        userId,
        members: {
          create: {
            userId: userId,
            role: "ADMIN",
          },
        },
      },
      include: {
        members: true,
      },
    });

    return res.status(201).json({
      status: 201,
      message: "Success",
      data: board,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

exports.deleteBoard = async (req, res) => {
  const { boardId } = req.params;
  try {
    await prisma.board.delete({ where: { id: parseInt(boardId) } });
    res.status(204).json({
      status: 204,
      message: "Success",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

exports.updateBoard = async (req, res) => {
  const { boardId } = req.params;
  const { title } = req.body;
  try {
    const board = await prisma.board.update({
      where: { id: parseInt(boardId) },
      data: { title },
    });
    res.status(200).json({
      status: 200,
      message: "Success",
      data: board,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

const createTeam = async (req, res) => {
  const { name } = req.body;
  const { userId } = req.user;
  try {
    const team = await prisma.team.create({
      data: {
        name,
        members: {
          create: {
            userId,
            role: "ADMIN",
          },
        },
      },
    });
    res.status(201).json({
      status: 201,
      message: "Success",
      data: team,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};