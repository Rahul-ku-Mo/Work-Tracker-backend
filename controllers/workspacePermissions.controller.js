const { prisma } = require("../db");
const emailService = require("../services/emailService");

// Get team members with workspace access
exports.getTeamMembersWithWorkspaceAccess = async (req, res) => {
  const workspaceId = req.workspaceNumericId; // Set by workspace access middleware
  const { userId } = req.user;

  try {
    // Get the workspace to find the team through project
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        project: {
          include: {
            team: {
              include: {
                teamMembers: {
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
                }
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

    // Get current workspace members
    const workspaceMembers = await prisma.workspaceUser.findMany({
      where: { workspaceId: workspaceId },
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

    // Create a map of current members for quick lookup
    const currentMemberIds = new Set(workspaceMembers.map(member => member.user.id));

    // Collect all members from team and project
    const allMembers = new Map();
    
    // Add team admins
    workspace.project.team.teamMembers?.forEach(tm => {
      allMembers.set(tm.user.id, tm.user);
    });
    
    // Add project members
    workspace.project.members?.forEach(pm => {
      allMembers.set(pm.user.id, pm.user);
    });

    // Get all team/project members and add access status
    const teamMembersWithAccess = Array.from(allMembers.values()).map(member => {
      const workspaceMember = workspaceMembers.find(wm => wm.user.id === member.id);
      return {
        ...member,
        hasAccess: currentMemberIds.has(member.id),
        role: workspaceMember?.role || null,
        workspaceMemberId: workspaceMember?.id || null
      };
    });

    res.status(200).json({
      status: 200,
      message: "Team members with workspace access retrieved successfully",
      data: teamMembersWithAccess
    });
  } catch (error) {
    console.error('Error in getTeamMembersWithWorkspaceAccess:', error);
    res.status(500).json({
      status: 500,
      message: "Internal Server Error"
    });
  }
};

// Grant workspace access to a team member
exports.grantWorkspaceAccess = async (req, res) => {
  const workspaceId = req.workspaceNumericId; // Set by workspace access middleware
  const { memberId, role = "MEMBER" } = req.body;
  const { userId } = req.user;

  try {
    // Verify the workspace exists and user has access
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
            },
            members: {
              where: { userId: memberId },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
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

    // Check if the requesting user is the workspace ADMIN or team ADMIN
    const workspaceUserRole = workspace.members[0]?.role;
    const teamUserRole = workspace.project.team.teamMembers[0]?.role;
    const isWorkspaceAdmin = workspaceUserRole === 'ADMIN';
    const isTeamAdmin = teamUserRole === 'ADMIN';

    if (!isWorkspaceAdmin && !isTeamAdmin) {
      return res.status(403).json({
        status: 403,
        message: "You don't have permission to grant workspace access"
      });
    }

    // Check if the member exists in the project or is a team admin
    const isProjectMember = workspace.project.members.length > 0;
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: workspace.project.teamId,
        userId: memberId
      }
    });
    
    if (!isProjectMember && !teamMember) {
      return res.status(404).json({
        status: 404,
        message: "User is not a member of this project or team"
      });
    }

    // Check if member already has access
    const existingAccess = await prisma.workspaceUser.findFirst({
      where: {
        workspaceId: workspaceId,
        userId: memberId
      }
    });

    if (existingAccess) {
      // Update existing access
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
    } else {
      // Grant new access
      const workspaceAccess =       await prisma.workspaceUser.create({
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

      // Send email notification if email service is configured
      try {
        const granter = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, email: true }
        });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const workspaceUrl = `${frontendUrl}/workspace/${workspaceId}`;
        
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
    }
  } catch (error) {
    console.error('Error in grantWorkspaceAccess:', error);
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