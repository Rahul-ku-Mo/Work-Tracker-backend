const { prisma } = require("../db");


exports.checkUserExistsInRedis = async (req, res, next) =>{
  
}
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

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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

exports.updateUser = async (req, res) => {
  const { userId } = req.user;

  const {
    name,
    phoneNumber,
    state,
    company,
    Role,
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
  if (Role !== undefined) data.Role = Role;
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
        Role: true,
      },
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
