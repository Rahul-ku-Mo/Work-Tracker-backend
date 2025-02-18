const { prisma } = require("../db");
const { pusherServer } = require("../services/pusherServer");

exports.getNotifications = async (req, res) => {
  const { userId } = req.user;

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        receiverId: userId,
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
  }
};

exports.createInviteNotification = async (req, res) => {
  const { userId: senderId } = req.user;
  const { receiverId, boardId } = req.body;

  try {
    // Check if sender has admin access to the board
    const senderAccess = await prisma.boardUser.findFirst({
      where: {
        boardId: parseInt(boardId),
        userId: senderId,
        role: "ADMIN",
      },
    });

    if (!senderAccess) {
      return res.status(403).json({
        status: "error",
        message: "Only board admins can send invites",
      });
    }

    // Get board details for the notification message
    const board = await prisma.board.findUnique({
      where: { id: parseInt(boardId) },
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
        metadata: JSON.stringify({ boardId, boardTitle: board.title }),
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
