const { prisma } = require("../db");
const { generateCapitalizedSlug, generateUniqueWorkspaceSlug, generateUniquePrefix } = require('../utils/slugUtils');

exports.getWorkspaces = async (req, res) => {
  const { userId } = req.user;

  try {
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    // Only admin users can see their own workspaces
    if (user?.role !== "ADMIN") {
      return res.status(200).json({
        status: 200,
        message: "Non-admin users cannot access personal workspaces",
        data: []
      });
    }

    // Find user's team
    const team = await prisma.team.findFirst({
      where: {
        members: {
          some: {
            id: userId
          }
        }
      }
    });
    
    if (!team) {
      return res.status(200).json({
        status: 200,
        message: "No team found",
        data: []
      });
    }
    
    // Get workspaces owned by this user (admin)
    const workspaces = await prisma.workspace.findMany({
      where: {
        userId: userId, // Only workspaces created by this admin user
        members: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        members: {
          where: { userId: userId },
          select: { role: true, isFavorite: true }
        },
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      },
    });

    const workspacesWithRole = workspaces.map(workspace => ({
      ...workspace,
      userRole: workspace.members[0]?.role,
      isFavorite: workspace.members[0]?.isFavorite,
      members: undefined // Remove members array from response
    }));

    res.status(200).json({
      status: 200,
      message: "Success",
      data: workspacesWithRole,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

exports.getWorkspace = async (req, res) => {
  const { teamId, slug } = req.params;
  
  if (!teamId || !slug) {
    return res.status(400).json({
      status: 400,
      message: "Both teamId and slug are required",
    });
  }
  
  try {
    const workspace = await prisma.workspace.findFirst({
      where: { 
        slug: slug,
        user: {
          teamId: teamId
        }
      },
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
        user: {
          select: {
            team: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      },
    });
    
    if (!workspace) {
      return res.status(404).json({
        status: "error",
        message: "Workspace not found",
      });
    }
    
    res.status(200).json({
      status: "success",
      data: workspace,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch workspace",
    });
  }
};

exports.createWorkspace = async (req, res) => {
  try {
    const { title, colorId, colorValue, colorName } = req.body;
    const { userId } = req.user;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, teamId: true },
    });

    // Check if user is an admin
    if (user.role !== "ADMIN") {
      return res.status(403).json({
        status: 403,
        message: "Only administrators can create workspaces",
      });
    }
    
    // Check if user has a team as captain
    const team = await prisma.team.findFirst({
      where: {
        captainId: userId
      }
    });
    
    if (!team) {
      return res.status(400).json({
        status: 400,
        message: "You need to create a team first",
      });
    }

    // Generate unique slug for the workspace within the team
    const slug = await generateUniqueWorkspaceSlug(title, async (slug) => {
      const existing = await prisma.workspace.findFirst({
        where: { 
          slug,
          user: {
            teamId: team.id
          }
        }
      });
      return !!existing;
    });

    // Generate unique prefix for the workspace
    const prefix = await generateUniquePrefix(title, async (prefix) => {
      const existing = await prisma.workspace.findUnique({
        where: { prefix }
      });
      return !!existing;
    });

    const workspace = await prisma.workspace.create({
      data: {
        title,
        slug,
        prefix,
        nextCardNum: 1,
        colorId,
        colorValue,
        colorName,
        userId,
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

    return res.status(201).json({
      status: 201,
      message: "Success",
      data: workspace,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

exports.deleteWorkspace = async (req, res) => {
  const { teamId, slug } = req.params;
  const { userId } = req.user;

  if (!teamId || !slug) {
    return res.status(400).json({
      status: 400,
      message: "Both teamId and slug are required",
    });
  }

  try {
    // Check if workspace exists and user is the owner
    const workspace = await prisma.workspace.findFirst({
      where: { 
        slug: slug,
        user: {
          teamId: teamId
        }
      },
      include: {
        members: {
          where: { userId: userId },
          select: { role: true }
        }
      }
    });

    if (!workspace) {
      return res.status(404).json({
        status: 404,
        message: "Workspace not found",
      });
    }

    // Check if user is admin
    const userMember = workspace.members.find(member => true);
    if (!userMember || userMember.role !== 'ADMIN') {
      return res.status(403).json({
        status: 403,
        message: "Only workspace admins can delete the workspace",
      });
    }

    await prisma.workspace.delete({
      where: { id: workspace.id },
    });

    res.status(204).json({
      status: 204,
      message: "Workspace deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

exports.updateWorkspace = async (req, res) => {
  const { teamId, slug } = req.params;
  const { title, colorId, colorValue, colorName } = req.body;

  if (!teamId || !slug) {
    return res.status(400).json({
      status: 400,
      message: "Both teamId and slug are required",
    });
  }

  try {
    // First find the workspace to get its ID
    const existingWorkspace = await prisma.workspace.findFirst({
      where: { 
        slug: slug,
        user: {
          teamId: teamId
        }
      },
      select: { id: true, title: true, user: { select: { teamId: true } } }
    });

    if (!existingWorkspace) {
      return res.status(404).json({
        status: 404,
        message: "Workspace not found",
      });
    }

    // If title is being updated, generate a new slug
    let updateData = { colorId, colorValue, colorName };
    
    if (title && title !== existingWorkspace.title) {
      const newSlug = await generateUniqueWorkspaceSlug(title, async (slug) => {
        const existing = await prisma.workspace.findFirst({
          where: { 
            slug,
            user: {
              teamId: existingWorkspace.user.teamId
            },
            id: { not: existingWorkspace.id } // Exclude current workspace
          }
        });
        return !!existing;
      });
      
      updateData.title = title;
      updateData.slug = newSlug;
    }

    const workspace = await prisma.workspace.update({
      where: { id: existingWorkspace.id },
      data: updateData,
    });

    res.status(200).json({
      status: 200,
      message: "Success",
      data: workspace,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

// Get favorite workspaces for a user
exports.getFavoriteWorkspaces = async (req, res) => {
  const { userId } = req.user;

  try {
    const favoriteWorkspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId: userId,
            isFavorite: true,
          },
        },
      },
      include: {
        members: {
          where: { userId: userId },
          select: { role: true, isFavorite: true }
        },
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    const workspacesWithRole = favoriteWorkspaces.map(workspace => ({
      ...workspace,
      userRole: workspace.members[0]?.role,
      isFavorite: workspace.members[0]?.isFavorite,
      members: undefined // Remove members array from response
    }));

    res.status(200).json({
      status: 200,
      message: "Success",
      data: workspacesWithRole,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

// Toggle favorite status for a workspace
exports.toggleWorkspaceFavorite = async (req, res) => {
  const { teamId, slug } = req.params;
  const { userId } = req.user;

  if (!teamId || !slug) {
    return res.status(400).json({
      status: 400,
      message: "Both teamId and slug are required",
    });
  }

  try {
    const workspace = await prisma.workspace.findFirst({
      where: { 
        slug: slug,
        user: {
          teamId: teamId
        }
      },
      select: { id: true, title: true, colorValue: true, colorName: true }
    });

    if (!workspace) {
      return res.status(404).json({
        status: 404,
        message: "Workspace not found",
      });
    }

    // Check if user has access to the workspace
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

    // Toggle favorite status
    const updatedWorkspaceUser = await prisma.workspaceUser.update({
      where: {
        id: workspaceUser.id,
      },
      data: {
        isFavorite: !workspaceUser.isFavorite,
      },
      include: {
        workspace: {
          select: {
            id: true,
            title: true,
            colorValue: true,
            colorName: true,
          }
        }
      }
    });

    res.status(200).json({
      status: 200,
      message: updatedWorkspaceUser.isFavorite ? "Workspace added to favorites" : "Workspace removed from favorites",
      data: {
        workspaceId: workspace.id,
        isFavorite: updatedWorkspaceUser.isFavorite,
        workspace: updatedWorkspaceUser.workspace
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
}; 