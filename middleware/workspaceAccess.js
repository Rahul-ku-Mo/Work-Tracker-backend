const { prisma } = require("../db");

const checkWorkspaceAccess = async (req, res, next) => {
  const { workspaceId, teamId, slug } = req.params;
  const { userId } = req.user;

  // Support both old ID-based lookup and new teamId + slug lookup
  if (!workspaceId && (!teamId || !slug)) {
    return res.status(400).json({
      status: 400,
      message: "Either workspace ID or both team ID and slug are required",
    });
  }

  try {
    let workspace;
    
    if (workspaceId) {
      // Legacy lookup by ID or slug
      const isNumeric = /^\d+$/.test(workspaceId);
      
      if (isNumeric) {
        workspace = await prisma.workspace.findUnique({
          where: { id: parseInt(workspaceId) },
          select: { id: true }
        });
      } else {
        workspace = await prisma.workspace.findUnique({
          where: { slug: workspaceId },
          select: { id: true }
        });
      }
    } else {
      // New lookup by teamId + slug
      workspace = await prisma.workspace.findFirst({
        where: { 
          slug: slug,
          user: {
            teamId: teamId
          }
        },
        select: { id: true }
      });
    }

    if (!workspace) {
      return res.status(404).json({
        status: 404,
        message: "Workspace not found",
      });
    }

    // Check if user has access to the workspace using numeric ID
    const workspaceUser = await prisma.workspaceUser.findFirst({
      where: {
        workspaceId: workspace.id,
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
    // Also add the numeric workspace ID for convenience
    req.workspaceNumericId = workspace.id;
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