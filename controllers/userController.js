const { prisma } = require("../db");

const { redisClient } = require("../db");

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

  redisClient.get(`user:${userId}`, async (err, result) => {
    if (err) {
      console.error('Error getting data from Redis:', err);
      res.status(500).json({ status: 500, message: "Internal server error" });
      return;
    }

    if (result) {
      // If the data is in the cache, return it
      res.status(200).json({
        status: 200,
        message: "Success",
        data: JSON.parse(result),
      });
    } else {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        // Save the fetched data in the cache
        redisClient.setEx(`user:${userId}`, 3600, JSON.stringify(user));

        res.status(200).json({
          status: 200,
          message: "Success",
          data: user,
        });
      } catch (error) {
        console.log(error);
        res.status(500).json({ status: 500, message: "Internal server error" });
      }
    }
  });
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

    // Save the fetched data in the cache
    redisClient.set(`user:${userId}`, 3600, JSON.stringify(user));

    res.status(200).json({
      status: 200,
      message: "Success",
      data: user,
    });
  } catch (error) {
    console.log(error);
  }
};
