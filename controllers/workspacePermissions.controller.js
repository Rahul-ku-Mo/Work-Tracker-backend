const { prisma } = require("../db");
const emailService = require("../services/emailService");

// Get project members with workspace access status
exports.getTeamMembersWithWorkspaceAccess = async (req, res) => {
  const workspaceId = req.workspaceNumericId; // Set by workspace access middleware
  const { userId } = req.user;

  try {
    // Get the workspace with project and team information
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        project: {
          include: {
            team: {
              select: {
                id: true,
                name: true
              }
            },
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    imageUrl: true,
                    role: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!workspace) {
      return res.status(404).json({
        status: 404,
        message: "Workspace not found"
      });
    }

    // Get current workspace members with their access details
    const workspaceMembers = await prisma.workspaceUser.findMany({
      where: { workspaceId: workspaceId },
      select: {
        id: true,
        userId: true,
        role: true,
        createdAt: true
      }
    });

    // Create a map of workspace members for quick lookup
    const workspaceMemberMap = new Map(
      workspaceMembers.map(wm => [wm.userId, {
        workspaceUserId: wm.id,
        role: wm.role,
        grantedAt: wm.createdAt
      }])
    );

    // Map ALL project members to include workspace access status
    const allMembers = workspace.project.members.map(pm => {
      const workspaceAccess = workspaceMemberMap.get(pm.user.id);
      
      return {
        id: pm.id,
        userId: pm.user.id,
        name: pm.user.name,
        email: pm.user.email,
        imageUrl: pm.user.imageUrl,
        appRole: pm.user.role,
        projectRole: pm.role,
        hasWorkspaceAccess: !!workspaceAccess,
        workspaceRole: workspaceAccess?.role || null,
        workspaceUserId: workspaceAccess?.workspaceUserId || null,
        grantedAt: workspaceAccess?.grantedAt || null
      };
    });

    res.status(200).json({
      status: 200,
      message: "All project members with workspace access status retrieved successfully",
      data: {
        members: allMembers,
        workspace: {
          id: workspace.id,
          title: workspace.title,
          slug: workspace.slug
        },
        project: {
          id: workspace.project.id,
          title: workspace.project.title,
          slug: workspace.project.slug
        },
        team: workspace.project.team
      }
    });
  } catch (error) {
    console.error('Error in getTeamMembersWithWorkspaceAccess:', error);
    res.status(500).json({
      status: 500,
      message: "Internal Server Error"
    });
  }
};

// Grant workspace access to a project member
exports.grantWorkspaceAccess = async (req, res) => {
  const workspaceId = req.workspaceNumericId; // Set by workspace access middleware
  const { memberId, role = "MEMBER" } = req.body;
  const { userId } = req.user;

  try {
    // Verify the workspace exists and get project information
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          where: { userId: userId },
          select: { role: true }
        },
        project: {
          include: {
            team: {
              include: {
                teamMembers: {
                  where: { userId: userId },
                  select: { role: true }
                }
              }
            }
          }
        }
      }
    });

    if (!workspace) {
      return res.status(404).json({
        status: 404,
        message: "Workspace not found"
      });
    }

    // Check if the requesting user has permission (workspace ADMIN or team ADMIN)
    const workspaceUserRole = workspace.members[0]?.role;
    const teamUserRole = workspace.project.team.teamMembers[0]?.role;
    const isWorkspaceAdmin = workspaceUserRole === 'ADMIN';
    const isTeamAdmin = teamUserRole === 'ADMIN';

    if (!isWorkspaceAdmin && !isTeamAdmin) {
      return res.status(403).json({
        status: 403,
        message: "Only workspace admins or team admins can manage workspace access"
      });
    }

    // CRITICAL: Verify the user is a PROJECT member (not just team member)
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId: workspace.project.id,
        userId: memberId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true
          }
        }
      }
    });
    
    if (!projectMember) {
      return res.status(403).json({
        status: 403,
        message: "User must be a project member before being granted workspace access. Please add them to the project first."
      });
    }

    const member = projectMember.user;

    // Check if member already has workspace access
    const existingAccess = await prisma.workspaceUser.findFirst({
      where: {
        workspaceId: workspaceId,
        userId: memberId
      }
    });

    if (existingAccess) {
      // Update existing access role
      const updatedAccess = await prisma.workspaceUser.update({
        where: { id: existingAccess.id },
        data: { role },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              imageUrl: true,
            }
          }
        }
      });

      return res.status(200).json({
        status: 200,
        message: `Workspace access updated for ${member.name || member.email}`,
        data: updatedAccess
      });
    }

    // Grant new workspace access
    const workspaceAccess = await prisma.workspaceUser.create({
      data: {
        workspaceId: workspaceId,
        userId: memberId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
          }
        }
      }
    });

    // Send email notification (non-blocking)
    try {
      const granter = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true }
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const workspaceUrl = `${frontendUrl}/workspace/${workspace.slug}`;
      
      await emailService.sendWorkspaceInvitation(
        member.email,
        workspace.title,
        workspace.project.team.name,
        workspaceUrl,
        granter.name || granter.email,
        frontendUrl
      );
    } catch (emailError) {
      console.error('Failed to send workspace invitation email:', emailError);
      // Don't fail the request if email fails
    }

    return res.status(201).json({
      status: 201,
      message: `Workspace access granted to ${member.name || member.email}`,
      data: workspaceAccess
    });
  } catch (error) {
    console.error('Error in grantWorkspaceAccess:', error);
    res.status(500).json({
      status: 500,
      message: "Internal Server Error"
    });
  }
};

// Revoke workspace access from a member
exports.revokeWorkspaceAccess = async (req, res) => {
  const workspaceId = req.workspaceNumericId; // Set by workspace access middleware
  const { memberId } = req.params;
  const { userId } = req.user;

  try {
    // Verify the workspace exists and user has permission
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          where: { userId: userId },
          select: { role: true }
        },
        project: {
          include: {
            team: {
              include: {
                teamMembers: {
                  where: { userId: userId },
                  select: { role: true }
                }
              }
            }
          }
        }
      }
    });

    if (!workspace) {
      return res.status(404).json({
        status: 404,
        message: "Workspace not found"
      });
    }

    // Check if the requesting user has permission (workspace ADMIN or team ADMIN)
    const workspaceUserRole = workspace.members[0]?.role;
    const teamUserRole = workspace.project.team.teamMembers[0]?.role;
    const isWorkspaceAdmin = workspaceUserRole === 'ADMIN';
    const isTeamAdmin = teamUserRole === 'ADMIN';

    if (!isWorkspaceAdmin && !isTeamAdmin) {
      return res.status(403).json({
        status: 403,
        message: "Only workspace admins or team admins can revoke workspace access"
      });
    }

    // Find and delete the workspace access
    const workspaceUser = await prisma.workspaceUser.findFirst({
      where: {
        workspaceId: workspaceId,
        userId: memberId
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!workspaceUser) {
      return res.status(404).json({
        status: 404,
        message: "User does not have access to this workspace"
      });
    }

    // Don't allow removing ADMIN users - they have permanent access
    if (workspaceUser.role === 'ADMIN') {
      return res.status(400).json({
        status: 400,
        message: "Cannot remove workspace ADMIN users. ADMIN users have permanent access to the workspace."
      });
    }

    await prisma.workspaceUser.delete({
      where: { id: workspaceUser.id }
    });

    res.status(200).json({
      status: 200,
      message: `Workspace access revoked from ${workspaceUser.user.name || workspaceUser.user.email}`
    });
  } catch (error) {
    console.error('Error in revokeWorkspaceAccess:', error);
    res.status(500).json({
      status: 500,
      message: "Internal Server Error"
    });
  }
};

// Get user's accessible workspaces
exports.getUserAccessibleWorkspaces = async (req, res) => {
  try {
    const { userId } = req.user;

    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        members: {
          where: { userId: userId },
          select: { role: true }
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

    const workspacesWithRole = workspaces.map(workspace => ({
      ...workspace,
      userRole: workspace.members[0]?.role,
      members: undefined // Remove members array from response
    }));

    res.status(200).json({
      status: 200,
      message: "Success",
      data: workspacesWithRole,
    });
  } catch (error) {
    console.error('Error in getUserAccessibleWorkspaces:', error);
    res.status(500).json({
      status: 500,
      message: "Internal Server Error"
    });
  }
}; 