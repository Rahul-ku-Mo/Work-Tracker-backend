const { prisma } = require("../db");
const { generateCapitalizedSlug, generateUniqueWorkspaceSlug, generateUniquePrefix } = require('../utils/slugUtils');

exports.getWorkspaces = async (req, res) => {
  const { userId } = req.user;
  const { teamId } = req.query;

  try {
    // Get workspaces for the team through project
    const workspaces = await prisma.workspace.findMany({
      where: {
        project: {
          teamId: teamId
        },
        members: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        members: {
          select: { 
            userId: true,
            role: true, 
            isFavorite: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        project: {
          select: {
            id: true,
            title: true,
            slug: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const workspacesWithRole = workspaces.map(workspace => {
      const currentUserMember = workspace.members.find(m => m.userId === userId);
      const creatorMember = workspace.members.find(m => m.role === 'ADMIN');
      
      return {
        ...workspace,
        userRole: currentUserMember?.role,
        isFavorite: currentUserMember?.isFavorite,
        creator: creatorMember?.user || null,
        members: undefined // Remove members array from response
      };
    });

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
        project: {
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
        project: {
          select: {
            id: true,
            title: true,
            slug: true,
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

    // Find creator from members with ADMIN role
    const creatorMember = workspace.members.find(m => m.role === 'ADMIN');

    // Transform the response
    const transformedWorkspace = {
      ...workspace,
      creator: creatorMember?.user || null
    };
    
    res.status(200).json({
      status: "success",
      data: transformedWorkspace,
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
    const { title, colorId, colorValue, colorName, projectId } = req.body;
    const {teamId} = req.params;

    const { userId } = req.user;
    
    if (!teamId) {
      return res.status(400).json({
        status: 400,
        message: "teamId is required",
      });
    }

    if (!projectId) {
      return res.status(400).json({
        status: 400,
        message: "projectId is required",
      });
    }

    // Verify user has access to the specified project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        teamId: teamId,
        OR: [
          { leadId: userId },
          { members: { some: { userId: userId } } }
        ]
      },
      include: {
        team: true
      }
    });

    if (!project) {
      return res.status(403).json({
        status: 403,
        message: "Project not found or you don't have access to it",
      });
    }

    // Generate unique slug for the workspace
    const slug = await generateUniqueWorkspaceSlug(title, async (slug) => {
      const existing = await prisma.workspace.findUnique({
        where: { slug }
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
        projectId: projectId,
        members: {
          create: {
            userId: userId,
            role: "ADMIN",  
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
                email: true
              }
            }
          }
        },
        project: {
          select: {
            id: true,
            title: true,
            slug: true
          }
        }
      },
    });

    // Find creator from members with ADMIN role
    const creatorMember = workspace.members.find(m => m.role === 'ADMIN');

    // Transform response
    const transformedWorkspace = {
      ...workspace,
      creator: creatorMember?.user || null,
      members: workspace.members
    };

    return res.status(201).json({
      status: 201,
      message: "Success",
      data: transformedWorkspace,
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
    // Check if workspace exists and user has admin access
    const workspace = await prisma.workspace.findFirst({
      where: { 
        slug: slug,
        project: {
          teamId: teamId
        }
      },
      include: {
        members: {
          where: { userId: userId },
          select: { role: true }
        },
        project: {
          select: { id: true, leadId: true }
        }
      }
    });

    if (!workspace) {
      return res.status(404).json({
        status: 404,
        message: "Workspace not found",
      });
    }

    // Check if user is admin of workspace or project
    const userMember = workspace.members.find(member => true);
    const isProjectLead = workspace.project.leadId === userId;
    
    if ((!userMember || userMember.role !== 'ADMIN') && !isProjectLead) {
      return res.status(403).json({
        status: 403,
        message: "Only workspace admins or project lead can delete the workspace",
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
  const { title, colorId, colorValue, colorName, projectId } = req.body;

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
        project: {
          teamId: teamId
        }
      },
      select: { id: true, title: true, slug: true, projectId: true }
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
            id: { not: existingWorkspace.id } // Exclude current workspace
          }
        });
        return !!existing;
      });
      
      updateData.title = title;
      updateData.slug = newSlug;
    }

    // Handle project change if provided
    if (projectId && projectId !== existingWorkspace.projectId) {
      const { userId } = req.user;
      
      // Verify user has access to the new project
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          teamId: teamId,
          OR: [
            { leadId: userId },
            { members: { some: { userId: userId } } }
          ]
        }
      });

      if (!project) {
        return res.status(403).json({
          status: 403,
          message: "Project not found or you don't have access to it",
        });
      }

      updateData.projectId = projectId;
    }

    const workspace = await prisma.workspace.update({
      where: { id: existingWorkspace.id },
      data: updateData,
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        project: {
          select: {
            id: true,
            title: true,
            slug: true
          }
        }
      }
    });

    // Find creator from members with ADMIN role
    const creatorMember = workspace.members.find(m => m.role === 'ADMIN');

    // Transform response
    const transformedWorkspace = {
      ...workspace,
      creator: creatorMember?.user || null,
      members: workspace.members
    };

    res.status(200).json({
      status: 200,
      message: "Success",
      data: transformedWorkspace,
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
        project: {
          select: {
            id: true,
            title: true,
            slug: true
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
  const { workspaceId } = req.params;
  const { userId } = req.user;

  if (!workspaceId) {
    return res.status(400).json({
      status: 400,
      message: "workspaceId is required",
    });
  }

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { 
        id: parseInt(workspaceId)
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
        workspaceId: parseInt(workspaceId),
        isFavorite: updatedWorkspaceUser.isFavorite,
        workspace: updatedWorkspaceUser.workspace
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};
