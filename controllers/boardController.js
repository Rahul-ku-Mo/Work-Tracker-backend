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

exports.getBoards = async (req, res) => {
  const { userId } = req.user;
  const cacheKey = `BOARDS::${userId}`;

  try {
    const cachedBoards = await safeRedisOperation(() =>
      redisClient.get(cacheKey)
    );
    if (cachedBoards) {
      return res.status(200).json({
        status: 200,
        message: "Success (from cache)",
        data: JSON.parse(cachedBoards),
      });
    }

    const boards = await prisma.board.findMany({
      where: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    await safeRedisOperation(() =>
      redisClient.set(cacheKey, JSON.stringify(boards), { EX: 3600 })
    );

    res.status(200).json({
      status: 200,
      message: "Success",
      data: boards,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

exports.getBoard = async (req, res) => {
  const { boardId } = req.params;
  const cacheKey = `BOARD::${boardId}`;

  if (!boardId) {
    return res.status(400).json({
      status: 400,
      message: "boardId is required",
    });
  }

  try {
    const cachedBoard = await safeRedisOperation(() =>
      redisClient.get(cacheKey)
    );
    if (cachedBoard) {
      return res.status(200).json({
        status: 200,
        message: "Success (from cache)",
        data: JSON.parse(cachedBoard),
      });
    }

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

    await safeRedisOperation(() =>
      redisClient.set(cacheKey, JSON.stringify(board), { EX: 3600 })
    );

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
    const {
      title,
      imageId,
      imageThumbUrl,
      imageFullUrl,
      imageLinkHTML,
      imageUserName,
    } = req.body;

    const { userId } = req.user;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    const role = user.role;

    // Check if user is an admin
    if (role !== "ADMIN") {
      return res.status(403).json({
        status: "error",
        message: "Only administrators can create boards",
      });
    }

    // Create board and make creator an admin
    const board = await prisma.board.create({
      data: {
        title,
        imageId,
        imageThumbUrl,
        imageFullUrl,
        imageLinkHTML,
        imageUserName,
        user: {
          connect: { id: userId },
        },
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

    await safeRedisOperation(() => redisClient.del(`BOARDS::${userId}`));

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
  const { userId } = req.user;

  try {
    await prisma.board.delete({ where: { id: parseInt(boardId) } });

    // Invalidate caches
    await Promise.all([
      safeRedisOperation(() => redisClient.del(`BOARD::${boardId}`)),
      safeRedisOperation(() => redisClient.del(`BOARDS::${userId}`)),
    ]);

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
  const { userId } = req.user;

  try {
    const board = await prisma.board.update({
      where: { id: parseInt(boardId) },
      data: { title },
    });

    // Invalidate caches
    await Promise.all([
      safeRedisOperation(() => redisClient.del(`BOARD::${boardId}`)),
      safeRedisOperation(() => redisClient.del(`BOARDS::${userId}`)),
    ]);

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
