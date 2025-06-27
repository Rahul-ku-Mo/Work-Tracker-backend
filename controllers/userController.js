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
  const { userId } = req.user;
  const { boardId } = req.query; // Optional: to filter out users already in a board

  try {
    let users;
    if (boardId) {
      // If boardId is provided, exclude users already in the board
      users = await prisma.user.findMany({
        where: {
          id: { not: userId },
          AND: {
            NOT: {
              boards: {
                some: {
                  boardId: parseInt(boardId),
                },
              },
            },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          imageUrl: true,
        },
      });
    } else {
      // Regular user list
      users = await prisma.user.findMany({
        where: {
          id: { not: userId },
        },
        select: {
          id: true,
          name: true,
          email: true,
          imageUrl: true,
        },
      });
    }

    res.status(200).json({
      status: 200,
      message: "Success",
      data: users,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

exports.getUser = async (req, res) => {
  const { userId } = req.user;

  if (!userId) {
    return res.status(400).json({
      status: 400,
      message: "Invalid user ID",
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        imageUrl: true,
        createdAt: true,
        state: true,
        phoneNumber: true,
        address: true,
        department: true,
        zipCode: true,
        company: true,
        role: true,
        isPaidUser: true,
        updatedAt: true,
        boards: {
          include: {
            board: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      status: 200,
      message: "Success",
      data: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

exports.updateUser = async (req, res) => {
  const { userId } = req.user;

  const {
    name,
    phoneNumber,
    company,
    role,
    state,
    department,
    address,
    zipCode,
    imageUrl,
    isPaidUser,
  } = req.body;

  const data = {
    updatedAt: new Date(Date.now()),
  };

  // Only add fields to the data object if they are provided and not null/undefined
  if (name != null) data.name = name;
  if (phoneNumber != null) data.phoneNumber = phoneNumber;
  if (company != null) data.company = company;
  if (role != null) data.role = role;
  if (state != null) data.state = state;
  if (department != null) data.department = department;
  if (address != null) data.address = address;
  if (zipCode != null) data.zipCode = zipCode;
  if (imageUrl != null) data.imageUrl = imageUrl;
  if (isPaidUser != null) data.isPaidUser = isPaidUser;

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        username: true,
        address: true,
        state: true,
        department: true,
        zipCode: true,
        imageUrl: true,
        company: true,
        role: true,
        isPaidUser: true,
      },
    });

    res.status(200).json({
      status: 200,
      message: "Success",
      data: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};
