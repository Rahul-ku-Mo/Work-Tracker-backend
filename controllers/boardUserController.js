const { prisma } = require("../db");

exports.inviteUserToBoard = async (req, res) => {
  const { boardId } = req.params;
  const { email } = req.body;
  const { userId: currentUserId } = req.user;

  try {
    // Check if the current user is an admin of the board
    const currentUserBoardAccess = await prisma.boardUser.findFirst({
      where: {
        boardId: parseInt(boardId),
        userId: currentUserId,
        role: "ADMIN",
      },
    });

    if (!currentUserBoardAccess) {
      return res.status(403).json({
        status: "error",
        message: "Only board admins can invite users",
      });
    }

    const invitedUser = await prisma.user.findFirst({
      where: {
        email: email,
      },
    });

    if (!invitedUser) {
      return res.status(404).json({
        status: "error",
        message: "Invited user not found",
      });
    }

    // Create the board membership
    const boardUser = await prisma.boardUser.create({
      data: {
        boardId: parseInt(boardId),
        userId: invitedUser.id,
        role: "MEMBER",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      status: "success",
      data: boardUser,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.getBoardMembers = async (req, res) => {
  const { boardId } = req.params;

  try {
    const members = await prisma.boardUser.findMany({
      where: {
        boardId: parseInt(boardId),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            imageUrl: true,
          },
        },
      },
    });

    res.status(200).json({
      status: "success",
      data: members.map((member) => member.user),
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};
