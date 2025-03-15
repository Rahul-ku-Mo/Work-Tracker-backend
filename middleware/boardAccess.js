const { prisma } = require("../db");

exports.checkBoardAccess = async (req, res, next) => {
  const { boardId } = req.params;
  const { userId } = req.user;


  try {
    const boardAccess = await prisma.boardUser.findFirst({
      where: {
        boardId: parseInt(boardId),
        userId: userId,
      },
    });

    console.log("boardAccess", boardAccess);

    if (!boardAccess) {
      return res.status(403).json({
        status: "error",
        message: "You don't have access to this board",
      });
    }

    // Add board access to request for later use
    req.boardAccess = boardAccess;
    next();
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};
