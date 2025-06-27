const { prisma } = require("../db");

exports.getBoards = async (req, res) => {
  const { userId } = req.user;

  try {
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    // Only admin users can see their own boards
    if (user?.role !== "ADMIN") {
      return res.status(200).json({
        status: 200,
        message: "Non-admin users cannot access personal boards",
        data: []
      });
    }

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
    
    // Get boards owned by this user (admin)
    const boards = await prisma.board.findMany({
      where: {
        userId: userId, // Only boards created by this admin user
        members: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        members: {
          where: { userId: userId },
          select: { role: true, isFavorite: true }
        },
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      },
    });

    const boardsWithRole = boards.map(board => ({
      ...board,
      userRole: board.members[0]?.role,
      isFavorite: board.members[0]?.isFavorite,
      members: undefined // Remove members array from response
    }));

    res.status(200).json({
      status: 200,
      message: "Success",
      data: boardsWithRole,
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

// Get favorite boards for a user
exports.getFavoriteBoards = async (req, res) => {
  const { userId } = req.user;

  try {
    const favoriteBoards = await prisma.board.findMany({
      where: {
        members: {
          some: {
            userId: userId,
            isFavorite: true,
          },
        },
      },
      include: {
        members: {
          where: { userId: userId },
          select: { role: true, isFavorite: true }
        },
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    const boardsWithRole = favoriteBoards.map(board => ({
      ...board,
      userRole: board.members[0]?.role,
      isFavorite: board.members[0]?.isFavorite,
      members: undefined // Remove members array from response
    }));

    res.status(200).json({
      status: 200,
      message: "Success",
      data: boardsWithRole,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

// Toggle favorite status for a board
exports.toggleBoardFavorite = async (req, res) => {
  const { boardId } = req.params;
  const { userId } = req.user;

  try {
    // Check if user has access to the board
    const boardUser = await prisma.boardUser.findFirst({
      where: {
        boardId: parseInt(boardId),
        userId: userId,
      },
    });

    if (!boardUser) {
      return res.status(403).json({
        status: 403,
        message: "You don't have access to this board",
      });
    }

    // Toggle favorite status
    const updatedBoardUser = await prisma.boardUser.update({
      where: {
        id: boardUser.id,
      },
      data: {
        isFavorite: !boardUser.isFavorite,
      },
      include: {
        board: {
          select: {
            id: true,
            title: true,
            colorValue: true,
            colorName: true,
          }
        }
      }
    });

    res.status(200).json({
      status: 200,
      message: updatedBoardUser.isFavorite ? "Board added to favorites" : "Board removed from favorites",
      data: {
        boardId: parseInt(boardId),
        isFavorite: updatedBoardUser.isFavorite,
        board: updatedBoardUser.board
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};