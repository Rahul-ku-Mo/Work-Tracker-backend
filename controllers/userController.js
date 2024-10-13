const { prisma, client: redisClient } = require("../db");

// Helper function to safely interact with Redis
async function safeRedisOperation(operation) {
  try {
    return await operation();
  } catch (error) {
    console.error("Redis operation failed:", error);
    return null;
  }
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
  const { userId } = req.user;
  try {
    const cacheKey = `USERS::${userId}`;
    const cachedUsers = await safeRedisOperation(() =>
      redisClient.get(cacheKey)
    );

    if (cachedUsers) {
      return res.status(200).json({
        status: 200,
        message: "Success (from cache)",
        data: JSON.parse(cachedUsers),
      });
    }

    const users = await prisma.user.findMany({
      where: {
        id: {
          not: userId,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    await safeRedisOperation(() =>
      redisClient.set(cacheKey, JSON.stringify(users), { EX: 3600 })
    );

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

  if (userId === null || userId === undefined) {
    return res.status(400).json({
      status: 400,
      message: "Invalid user ID",
    });
  }

  const cacheKey = `USER::${userId}`;
  const cachedUser = await safeRedisOperation(() => redisClient.get(cacheKey));

  if (cachedUser) {
    return res.status(200).json({
      status: 200,
      message: "Success (from cache)",
      data: JSON.parse(cachedUser),
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
        state: true,
        phoneNumber: true,
        address: true,
        department: true,
        zipCode: true,
        company: true,
        role: true,
        isPaidUser: true,
        updatedAt: true,
        organizationMember: true,
        organizationLead: {
          select: {
            name: true,
            id: true,
            teamLeadId: true,
            members: true,
          },
        },
      },
    });

    if (user) {
      await safeRedisOperation(() =>
        redisClient.set(cacheKey, JSON.stringify(user), { EX: 3600 })
      );
    }

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

    const cacheKey = `USER::${userId}`;
    await safeRedisOperation(() =>
      redisClient.set(cacheKey, JSON.stringify(user), { EX: 3600 })
    );

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
