const { prisma, client } = require("../db");

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
  const { userId } = req.user;

  if (userId === null || userId === undefined) {
    return res.status(400).json({
      status: 400,
      message: "Invalid user ID",
    });
  }

  const value = await client.get(`userId:${userId}`);

  if (value) {
    return res.status(200).json({
      status: 200,
      message: "Success",
      data: JSON.parse(value),
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
        boards: true,
        comments: true,
        imageUrl: true,
        createdAt: true,
        phoneNumber: true,
        state: true,
        address: true,
        zipCode: true,
        company: true,
        role: true,
        updatedAt: true,
        password: false, // Exclude password
      },
    });

    if (user) {
      await client.set(`userId:${userId}`, JSON.stringify(user));
    }

    res.status(200).json({
      status: 200,
      message: "Success",
      data: user,
    });
  } catch (error) {
    console.log(error);
  }
};

exports.updateUser = async (req, res) => {
  const { userId } = req.user;

  const {
    name,
    phoneNumber,
    state,
    company,
    role,
    address,
    zipCode,
    imageUrl,
  } = req.body;

  const data = {};

  data.updatedAt = new Date(Date.now());

  if (name !== undefined) data.name = name;
  if (phoneNumber !== undefined) data.phoneNumber = phoneNumber;
  if (state !== undefined) data.state = state;
  if (address !== undefined) data.address = address;
  if (zipCode !== undefined) data.zipCode = zipCode;
  if (imageUrl !== undefined) data.imageUrl = imageUrl;
  if (company !== undefined) data.company = company;
  if (role !== undefined) data.role = role;

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        state: true,
        address: true,
        zipCode: true,
        imageUrl: true,
        company: true,
        role: true,
      },
    });

    await client.set(`userId:${userId}`, JSON.stringify(user));

    res.status(200).json({
      status: 200,
      message: "Success",
      data: user,
    });
  } catch (error) {
    console.log(error);
  }
};
