const { prisma } = require("../db");
const { pusher } = require("../services/pusherServer");

exports.getNotifications = async (req, res) => {
  const { userId } = req.user;

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        receiverId: userId,
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

  const { receiverId, message } = req.body;

  try {
    const notification = await prisma.notification.create({
      data: {
        message,
        sender: {
          connect: { id: senderId },
        },
        receiver: {
          connect: { id: receiverId },
        },
      },
      select: {
        id: true,
        message: true,
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

    await pusher.trigger(`invite-${receiverId}`, "invite-notification", {
      message: notification,
    });

    res.status(201).json({
      status: 201,
      message: "Success",
      data: notification,
    });

  } catch (error) {
    console.log(error);
  }
};


