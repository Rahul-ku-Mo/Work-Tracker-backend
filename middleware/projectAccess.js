const { prisma } = require("../db");

/**
 * Middleware to check if user has access to a project
 * Checks project membership before allowing access
 */
exports.checkProjectAccess = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const { projectSlug } = req.params;

    if (!userId) {
      return res.status(401).json({
        status: 401,
        message: "Unauthorized - User not authenticated",
      });
    }

    if (!projectSlug) {
      return res.status(400).json({
        status: 400,
        message: "Project Slug is required",
      });
    }

    // Check if user is a member of the project
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        userId: userId,
        project: {
          slug: projectSlug
        }
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            slug: true,
            teamId: true,
          },
        },
      },
    });

    // If not a project member, check if team admin
    if (!projectMember) {
      const project = await prisma.project.findUnique({
        where: { slug: projectSlug },
        select: { teamId: true },
      });

      if (project) {
        const teamMember = await prisma.teamMember.findFirst({
          where: {
            teamId: project.teamId,
            userId: userId,
            role: "ADMIN",
          },
        });

        // Team admins have access to all projects
        if (teamMember) {
          req.projectAccess = {
            hasAccess: true,
            role: "ADMIN",
            isTeamAdmin: true,
          };
          return next();
        }
      }

      return res.status(403).json({
        status: 403,
        message: "You don't have access to this project",
      });
    }

    // User has project access
    req.projectAccess = {
      hasAccess: true,
      role: projectMember.role,
      isTeamAdmin: false,
      projectMemberId: projectMember.id,
    };

    next();
  } catch (error) {
    console.error("Error in checkProjectAccess middleware:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
};

/**
 * Middleware to check if user has permission to modify a project
 * Must be used after checkProjectAccess
 * Requires user to be project ADMIN or team ADMIN
 */
exports.checkProjectModifyPermission = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const { projectSlug } = req.params;

    if (!userId) {
      return res.status(401).json({
        status: 401,
        message: "Unauthorized - User not authenticated",
      });
    }

    // Get project
    const project = await prisma.project.findUnique({
      where: { slug: projectSlug },
      select: {
        id: true,
        teamId: true,
        leadId: true,
      },
    });

    if (!project) {
      return res.status(404).json({
        status: 404,
        message: "Project not found",
      });
    }

    // Check if user is team admin
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: project.teamId,
        userId: userId,
        role: "ADMIN",
      },
    });

    // Check if user is project admin
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId: project.id,
        userId: userId,
        role: "ADMIN",
      },
    });

    // Team admins or project admins can modify
    if (teamMember || projectMember) {
      req.canModifyProject = true;
      return next();
    }

    return res.status(403).json({
      status: 403,
      message: "You don't have permission to modify this project. Only project admins or team admins can make changes.",
    });
  } catch (error) {
    console.error("Error in checkProjectModifyPermission middleware:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
};

/**
 * Middleware to check if user has access to a project via workspace
 * Extracts projectId from workspace and checks project membership
 */
exports.checkProjectAccessViaWorkspace = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const { teamId, slug } = req.params;

    if (!userId) {
      return res.status(401).json({
        status: 401,
        message: "Unauthorized - User not authenticated",
      });
    }

    // Get workspace to find its project
    const workspace = await prisma.workspace.findUnique({
      where: { slug },
      include: {
        project: {
          select: {
            id: true,
            teamId: true,
          },
        },
      },
    });

    if (!workspace) {
      return res.status(404).json({
        status: 404,
        message: "Workspace not found",
      });
    }

    // Verify workspace belongs to the team
    if (workspace.project.teamId !== teamId) {
      return res.status(403).json({
        status: 403,
        message: "Workspace does not belong to this team",
      });
    }

    // Check if user is a member of the project
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId: workspace.project.id,
        userId: userId,
      },
    });

    // If not a project member, check if team admin
    if (!projectMember) {
      const teamMember = await prisma.teamMember.findFirst({
        where: {
          teamId: workspace.project.teamId,
          userId: userId,
          role: "ADMIN",
        },
      });

      // Team admins have access to all projects/workspaces
      if (teamMember) {
        req.projectAccess = {
          hasAccess: true,
          role: "ADMIN",
          isTeamAdmin: true,
          projectId: workspace.project.id,
        };
        return next();
      }

      return res.status(403).json({
        status: 403,
        message: "You don't have access to this project. Contact your project admin for access.",
      });
    }

    // User has project access
    req.projectAccess = {
      hasAccess: true,
      role: projectMember.role,
      isTeamAdmin: false,
      projectMemberId: projectMember.id,
      projectId: workspace.project.id,
    };

    next();
  } catch (error) {
    console.error("Error in checkProjectAccessViaWorkspace middleware:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
};
