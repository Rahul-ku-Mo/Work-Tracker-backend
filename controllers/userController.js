const { prisma } = require("../db");

exports.checkUserExists = async (req, res, next) => {
  const { userId } = req.user;

  const isUserExist = await prisma.user.findUnique({ where: { id: userId } });

  if (!isUserExist) {
    return res.status(400).json({
      status: 400,
      message: "User does not exist",
    });
  }

  next();
};

exports.getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        boards: {
          include: {
            columns: {
              include: {
                cards: {
                  include: {
                    comments: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      status: 200,
      message: "Success",
      data: users,
    });
  } catch (error) {
    console.log(error);
  }
};

exports.getUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
    });

    res.status(200).json({
      status: 200,
      message: "Success",
      data: user,
    });
  } catch (error) {
    console.log(error);
  }
};
