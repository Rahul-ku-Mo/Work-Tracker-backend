const { prisma } = require("../db");

const checkWorkspaceAccess = async (req, res, next) => {
  const { workspaceId } = req.params;
  const { userId } = req.user;

  if (!workspaceId) {
    return res.status(400).json({
      status: 400,
      message: "Workspace ID is required",
    });
  }

  try {
    // Check if user has access to the workspace
    const workspaceUser = await prisma.workspaceUser.findFirst({
      where: {
        workspaceId: parseInt(workspaceId),
        userId: userId,
      },
    });

    if (!workspaceUser) {
      return res.status(403).json({
        status: 403,
        message: "You don't have access to this workspace",
      });
    }

    // Add workspace user info to request for use in controllers
    req.workspaceUser = workspaceUser;
    next();
  } catch (error) {
    console.error("Error checking workspace access:", error);
    res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
};

module.exports = { checkWorkspaceAccess }; 