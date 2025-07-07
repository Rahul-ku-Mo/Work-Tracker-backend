const { prisma } = require("../db");
const emailService = require("../services/emailService");

exports.createTeam = async (req, res) => {
  try {
    const { name } = req.body;
    const { userId } = req.user;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // Only Admin users can create teams
    if (user?.role !== "ADMIN") {
      return res.status(403).json({
        status: 403,
        message: "Only administrators can create teams",
      });
    }

    // Check if user already has a team
    const existingTeam = await prisma.team.findFirst({
      where: {
        captainId: userId
      }
    });

    if (existingTeam) {
      return res.status(400).json({
        status: 400,
        message: "You already have a team",
      });
    }

    // Generate a join code for inviting members
    const joinCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    // Create the team with the new schema structure
    const team = await prisma.team.create({
      data: {
        name,
        joinCode,
        captainId: userId,
        members: {
          connect: {
            id: userId
          }
        }
      },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true
          }
        },
        captain: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true
          }
        }
      }
    });

    return res.status(201).json({
      status: 201,
      message: "Team created successfully",
      data: team
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

exports.getTeam = async (req, res) => {
  const { userId } = req.user;

  try {
    // Find team where user is either captain or member
    const team = await prisma.team.findFirst({
      where: {
        OR: [
          { captainId: userId },
          { members: { some: { id: userId } } }
        ]
      },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true
          }
        },
        captain: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true
          }
        }
      }
    });

    if (!team) {
      return res.status(404).json({
        status: 404,
        message: "No team found",
      });
    }

    return res.status(200).json({
      status: 200,
      message: "Team retrieved successfully",
      data: team
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

exports.updateTeam = async (req, res) => {
  try {
    const { name, teamImageUrl } = req.body;
    const { userId } = req.user;

    if (!name || !name.trim() || !teamImageUrl) {
      return res.status(400).json({
        status: 400,
        message: "Team name/ image is required",
      });
    }

    // Find team where user is captain (only captain can update team name)
    const team = await prisma.team.findFirst({
      where: { captainId: userId }
    });

    if (!team) {
      return res.status(404).json({
        status: 404,
        message: "Team not found or you don't have permission to update it",
      });
    }

    // Update team name
    const updatedTeam = await prisma.team.update({
      where: { id: team.id },
      data: { name: name.trim(), teamImageUrl },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true
          }
        },
        captain: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true
          }
        }
      }
    });

    return res.status(200).json({
      status: 200,
      message: "Team updated successfully",
      data: updatedTeam
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

exports.inviteMember = async (req, res) => {
  try {
    const { email } = req.body;
    const { userId } = req.user;

    // Validate email format
    if (!email || !email.trim()) {
      return res.status(400).json({
        status: 400,
        message: "Email is required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        status: 400,
        message: "Please provide a valid email address",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, name: true, email: true },
    });

    // Check if requester is admin and captain of a team
    if (user?.role !== "ADMIN") {
      return res.status(403).json({
        status: 403,
        message: "Only administrators can invite team members",
      });
    }

    // Find the captain's team
    const team = await prisma.team.findFirst({
      where: {
        captainId: userId
      },
      include: {
        captain: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!team) {
      return res.status(404).json({
        status: 404,
        message: "You don't have a team to invite members to",
      });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if user is trying to invite themselves
    if (trimmedEmail === user.email.toLowerCase()) {
      return res.status(400).json({
        status: 400,
        message: "You cannot invite yourself",
      });
    }

    // Find the user to invite
    const userToInvite = await prisma.user.findUnique({
      where: {
        email: trimmedEmail
      }
    });

    if (userToInvite) {
      // User exists - check if already in a team
      const userCurrentTeam = await prisma.user.findUnique({
        where: { id: userToInvite.id },
        include: { team: true }
      });

      if (userCurrentTeam.team) {
        return res.status(400).json({
          status: 400,
          message: "User is already a member of another team",
        });
      }

      // Add existing user to team
      const updatedTeam = await prisma.team.update({
        where: {
          id: team.id
        },
        data: {
          members: {
            connect: {
              id: userToInvite.id
            }
          }
        },
        include: {
          members: {
            select: {
              id: true,
              name: true,
              email: true,
              imageUrl: true,
              role: true
            }
          }
        }
      });

      // Create notification for team captain about new member joining
      await prisma.notification.create({
        data: {
          senderId: userToInvite.id,
          receiverId: userId, // Send to team captain (admin)
          message: "JOIN",
          metadata: JSON.stringify({
            teamName: team.name,
            teamId: team.id
          })
        }
      });

      return res.status(200).json({
        status: 200,
        message: `${userToInvite.name || userToInvite.email} has been successfully added to the team`,
        data: updatedTeam
      });
    } else {
      // User doesn't exist - send email invitation
      try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const inviterName = user.name || user.email;
        
        await emailService.sendTeamInvitation(
          trimmedEmail,
          team.name,
          team.joinCode,
          inviterName,
          frontendUrl
        );

        return res.status(200).json({
          status: 200,
          message: `Invitation email sent to ${trimmedEmail}. They can join the team using the join code: ${team.joinCode}`,
          data: {
            email: trimmedEmail,
            joinCode: team.joinCode,
            teamName: team.name
          }
        });
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        return res.status(500).json({
          status: 500,
          message: `Failed to send invitation email to ${trimmedEmail}. Please check email configuration.`,
        });
      }
    }
  } catch (error) {
    console.error('Error in inviteMember:', error);
    res.status(500).json({ 
      status: 500, 
      message: "Internal Server Error. Please try again later." 
    });
  }
};

// Add this new method for joining teams via code
exports.joinTeam = async (req, res) => {
  try {
    const { code } = req.body;
    const { userId } = req.user;

    // Validate join code
    if (!code || !code.trim()) {
      return res.status(400).json({
        status: 400,
        message: "Join code is required",
      });
    }

    const trimmedCode = code.trim().toUpperCase();

    // Check if user is already in a team
    const userWithTeam = await prisma.user.findUnique({
      where: { id: userId },
      include: { team: true }
    });

    if (userWithTeam.team) {
      return res.status(400).json({
        status: 400,
        message: "You are already a member of a team. Leave your current team first to join another.",
      });
    }

    // Find team by join code
    const team = await prisma.team.findUnique({
      where: { joinCode: trimmedCode },
      include: {
        captain: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!team) {
      return res.status(404).json({
        status: 404,
        message: "Invalid join code. Please check the code and try again.",
      });
    }

    // Check if user is trying to join their own team
    if (team.captainId === userId) {
      return res.status(400).json({
        status: 400,
        message: "You cannot join your own team using a join code",
      });
    }

    // Add user to team
    const updatedTeam = await prisma.team.update({
      where: { id: team.id },
      data: {
        members: {
          connect: { id: userId }
        }
      },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
            role: true
          }
        },
        captain: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true
          }
        }
      }
    });

    // Create notification for team captain
    await prisma.notification.create({
      data: {
        senderId: userId,
        receiverId: team.captainId,
        message: "JOIN",
        metadata: JSON.stringify({
          teamName: team.name,
          teamId: team.id
        })
      }
    });

    return res.status(200).json({
      status: 200,
      message: `Successfully joined ${team.name}`,
      data: updatedTeam
    });
  } catch (error) {
    console.error('Error in joinTeam:', error);
    res.status(500).json({ 
      status: 500, 
      message: "Internal Server Error. Please try again later." 
    });
  }
};


exports.getTeamMembers = async (req, res) => {
  try {
    const { userId } = req.user;

    const team = await prisma.team.findFirst({
      where: {
        OR: [
          { captainId: userId },
          { members: { some: { id: userId } } }
        ]
      },
      include: {
        members: true,
      },
    });

    if (!team) {
      return res.status(404).json({
        status: 404,
        message: "Team not found",
      });
    }

    return res.status(200).json({
      status: 200,
      message: "Team members retrieved successfully",
      data: team.members,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

exports.validateInviteCode = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code || !code.trim()) {
      return res.status(400).json({
        status: 400,
        message: "Invite code is required",
      });
    }

    const team = await prisma.team.findUnique({
      where: {
        joinCode: code.trim().toUpperCase()
      },
      select: {
        id: true,
        name: true,
        joinCode: true,
        captain: {
          select: {
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            members: true
          }
        }
      }
    });

    if (!team) {
      return res.status(404).json({
        status: 404,
        message: "Invalid invite code",
      });
    }

    return res.status(200).json({
      status: 200,
      message: "Valid invite code",
      data: {
        id: team.id,
        name: team.name,
        captain: team.captain.name || team.captain.email,
        memberCount: team._count.members
      }
    });
  } catch (error) {
    console.error('Error in validateInviteCode:', error);
    res.status(500).json({ 
      status: 500, 
      message: "Internal Server Error" 
    });
  }
};

// Get team workspaces - both accessible and locked workspaces for team members
exports.getTeamWorkspaces = async (req, res) => {
  try {
    const userId = req.user?.userId;

    // Find user's team
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        team: {
          include: {
            members: {
              select: {
                id: true
              }
            }
          }
        }
      }
    });

    if (!user || !user.team) {
      return res.status(404).json({
        status: 404,
        message: "No team found for user",
        data: []
      });
    }

    const teamMemberIds = user.team.members.map(member => member.id);

    // Get all workspaces created by team members
    const allTeamWorkspaces = await prisma.workspace.findMany({
      where: {
        userId: {
          in: teamMemberIds
        }
      },
      select: {
        id: true,
        title: true,
        colorName: true,
        colorValue: true,
        userId: true,
        createdAt: true,
        members: {
          where: {
            userId: userId // Only get current user's access
          },
          select: {
            userId: true,
            role: true
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Add access status to each workspace
    const workspacesWithAccess = allTeamWorkspaces.map(workspace => ({
      ...workspace,
      hasAccess: workspace.members.length > 0,
      userRole: workspace.members[0]?.role || null,
      isOwner: workspace.userId === userId,
      createdBy: workspace.user.name || workspace.user.email
    }));

    return res.status(200).json({
      status: 200,
      message: "Team workspaces retrieved successfully",
      data: workspacesWithAccess
    });
  } catch (error) {
    console.error('Error in getTeamWorkspaces:', error);
    res.status(500).json({ 
      status: 500, 
      message: "Internal Server Error" 
    });
  }
};

// Get workspace members
exports.getWorkspaceMembers = async (req, res) => {
  const { workspaceId } = req.params;

  try {
    const members = await prisma.workspaceUser.findMany({
      where: {
        workspaceId: parseInt(workspaceId),
      },
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
    });

    res.status(200).json({
      status: 200,
      message: "Success",
      data: members,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

// Add user to workspace
exports.addUserToWorkspace = async (req, res) => {
  const { workspaceId, userId } = req.params;
  const { role = "MEMBER" } = req.body;

  try {
    // Check if user is already a member
    const existingMember = await prisma.workspaceUser.findFirst({
      where: {
        workspaceId: parseInt(workspaceId),
        userId: userId,
      },
    });

    if (existingMember) {
      return res.status(400).json({
        status: 400,
        message: "User is already a member of this workspace",
      });
    }

    // Add user to workspace
    const workspaceMember = await prisma.workspaceUser.create({
      data: {
        workspaceId: parseInt(workspaceId),
        userId: userId,
        role,
      },
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
    });

    res.status(201).json({
      status: 201,
      message: "User added to workspace successfully",
      data: workspaceMember,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

// Remove user from workspace
exports.removeUserFromWorkspace = async (req, res) => {
  const { workspaceId, userId } = req.params;

  try {
    await prisma.workspaceUser.deleteMany({
      where: {
        workspaceId: parseInt(workspaceId),
        userId: userId,
      },
    });

    res.status(200).json({
      status: 200,
      message: "User removed from workspace successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

// Send workspace invitation
exports.sendWorkspaceInvitation = async (req, res) => {
  const { workspaceId } = req.params;
  const { email, role = "MEMBER" } = req.body;
  const { userId } = req.user;

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        status: 404,
        message: "User not found",
      });
    }

    // Check if user is already a member
    const existingMember = await prisma.workspaceUser.findFirst({
      where: {
        workspaceId: parseInt(workspaceId),
        userId: user.id,
      },
    });

    if (existingMember) {
      return res.status(400).json({
        status: 400,
        message: "User is already a member of this workspace",
      });
    }

    // Add user to workspace
    const workspaceMember = await prisma.workspaceUser.create({
      data: {
        workspaceId: parseInt(workspaceId),
        userId: user.id,
        role,
      },
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
    });

    // Send email notification
    try {
      const workspace = await prisma.workspace.findUnique({
        where: { id: parseInt(workspaceId) },
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      });

      const inviter = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true }
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const workspaceUrl = `${frontendUrl}/workspace/${workspaceId}`;
      
      await emailService.sendWorkspaceInvitation(
        user.email,
        workspace.title,
        workspace.user.name || workspace.user.email,
        workspaceUrl,
        inviter.name || inviter.email,
        frontendUrl
      );
    } catch (emailError) {
      console.error('Failed to send workspace invitation email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      status: 201,
      message: "Workspace invitation sent successfully",
      data: workspaceMember,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

// Get team members with their board access
const getTeamMembers = async (req, res) => {
  const { teamId } = req.params;
  const userId = req.user?.userId; // Use userId from JWT token

  try {
    let team;
    
    if (teamId) {
      // If teamId is provided, use it directly
      team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          members: {
            include: {
              workspaces: {
                include: {
                  workspace: {
                    select: {
                      id: true,
                      title: true,
                      colorName: true,
                      colorValue: true
                    }
                  }
                }
              }
            }
          },
          captain: true
        }
      });
    } else if (userId) {
      // If no teamId provided, find team through user's membership
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          team: {
            include: {
              members: {
                include: {
                  workspaces: {
                    include: {
                      workspace: {
                        select: {
                          id: true,
                          title: true,
                          colorName: true,
                          colorValue: true
                        }
                      }
                    }
                  }
                }
              },
              captain: true
            }
          }
        }
      });
      
      // Get the user's team
      team = user?.team;
    } else {
      return res.status(400).json({
        status: 400,
        message: "Team ID or user authentication required"
      });
    }

    if (!team) {
      return res.status(404).json({
        status: 404,
        message: "Team not found"
      });
    }

    // Handle case where team has no members
    if (!team.members || team.members.length === 0) {
      return res.status(200).json({
        status: 200,
        message: "Success",
        data: {
          team,
          members: []
        }
      });
    }

    // Format response with workspace access info
    const membersWithAccess = team.members.map(member => ({
      ...member,
      boardAccess: member.workspaces?.map(wu => ({
        board: wu.workspace,
        role: wu.role,
        canEdit: wu.role === 'ADMIN'
      })) || []
    }));

    res.status(200).json({
      status: 200,
      message: "Success",
      data: {
        team,
        members: membersWithAccess
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// Add user to workspace (Admin only)
const addUserToWorkspace = async (req, res) => {
  const { workspaceId, userId } = req.params;
  const { role = 'MEMBER' } = req.body;
  const requestorId = req.user?.userId; // Use userId from JWT token

  try {
    // Check if requestor is admin of the workspace
    const requestorAccess = await prisma.workspaceUser.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: parseInt(workspaceId),
          userId: requestorId
        }
      }
    });

    if (!requestorAccess || requestorAccess.role !== 'ADMIN') {
      return res.status(403).json({
        status: 403,
        message: "Only workspace admins can add users"
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        status: 404,
        message: "User not found"
      });
    }

    // Add user to workspace
    const workspaceUser = await prisma.workspaceUser.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: parseInt(workspaceId),
          userId: userId
        }
      },
      update: { role },
      create: {
        workspaceId: parseInt(workspaceId),
        userId: userId,
        role
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            imageUrl: true,
            department: true
          }
        }
      }
    });

    res.status(200).json({
      status: 200,
      message: "User added to workspace successfully",
      data: workspaceUser
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// Remove user from workspace (Admin only)
const removeUserFromWorkspace = async (req, res) => {
  const { workspaceId, userId } = req.params;
  const requestorId = req.user?.userId;

  try {
    // Check if requestor is admin of the workspace
    const requestorAccess = await prisma.workspaceUser.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: parseInt(workspaceId),
          userId: requestorId
        }
      }
    });

    if (!requestorAccess || requestorAccess.role !== 'ADMIN') {
      return res.status(403).json({
        status: 403,
        message: "Only workspace admins can remove users"
      });
    }

    // Remove user from workspace
    await prisma.workspaceUser.delete({
      where: {
        workspaceId_userId: {
          workspaceId: parseInt(workspaceId),
          userId: userId
        }
      }
    });

    res.status(200).json({
      status: 200,
      message: "User removed from workspace successfully"
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// Update user permissions on workspace (Admin only)
const updateUserPermissions = async (req, res) => {
  const { workspaceId, userId } = req.params;
  const { role } = req.body;
  const requestorId = req.user?.userId;

  try {
    // Check if requestor is admin of the workspace
    const requestorAccess = await prisma.workspaceUser.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: parseInt(workspaceId),
          userId: requestorId
        }
      }
    });

    if (!requestorAccess || requestorAccess.role !== 'ADMIN') {
      return res.status(403).json({
        status: 403,
        message: "Only workspace admins can update permissions"
      });
    }

    // Update user role
    const updatedWorkspaceUser = await prisma.workspaceUser.update({
      where: {
        workspaceId_userId: {
          workspaceId: parseInt(workspaceId),
          userId: userId
        }
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            imageUrl: true
          }
        }
      }
    });

    res.status(200).json({
      status: 200,
      message: "User permissions updated successfully",
      data: updatedWorkspaceUser
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// Toggle user status (enable/disable) - Team captain only
const toggleUserStatus = async (req, res) => {
  const { userId } = req.params;
  const { isActive } = req.body;
  const requestorId = req.user?.userId;

  try {
    // Check if requestor is team captain or has admin role
    const requestor = await prisma.user.findUnique({
      where: { id: requestorId },
      include: {
        captainOf: true
      }
    });

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { team: true }
    });

    if (!targetUser) {
      return res.status(404).json({
        status: 404,
        message: "User not found"
      });
    }

    // Check permissions
    const canModify = requestor.role === 'ADMIN' || 
                     (requestor.captainOf && requestor.captainOf.id === targetUser.teamId);

    if (!canModify) {
      return res.status(403).json({
        status: 403,
        message: "Only team captains or admins can modify user status"
      });
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        isActive: true,
        department: true,
        efficiency: true
      }
    });

    res.status(200).json({
      status: 200,
      message: `User ${isActive ? 'enabled' : 'disabled'} successfully`,
      data: updatedUser
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// Send workspace invitation
const sendWorkspaceInvitation = async (req, res) => {
  const { workspaceId } = req.params;
  const { email, role = 'MEMBER' } = req.body;
  const requestorId = req.user?.userId;

  try {
    // Check if requestor is admin of the workspace
    const requestorAccess = await prisma.workspaceUser.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: parseInt(workspaceId),
          userId: requestorId
        }
      }
    });

    if (!requestorAccess || requestorAccess.role !== 'ADMIN') {
      return res.status(403).json({
        status: 403,
        message: "Only workspace admins can send invitations"
      });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: parseInt(workspaceId) }
    });

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      // Check if already a workspace member
      const existingMembership = await prisma.workspaceUser.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: parseInt(workspaceId),
            userId: existingUser.id
          }
        }
      });

      if (existingMembership) {
        return res.status(400).json({
          status: 400,
          message: "User is already a member of this workspace"
        });
      }

      // Add existing user to workspace
      const workspaceUser = await prisma.workspaceUser.create({
        data: {
          workspaceId: parseInt(workspaceId),
          userId: existingUser.id,
          role
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
              imageUrl: true
            }
          }
        }
      });

      return res.status(200).json({
        status: 200,
        message: "Existing user added to workspace successfully",
        data: workspaceUser
      });
    }

    // Create invitation for new user
    const invitation = await prisma.workspaceInvitation.create({
      data: {
        email,
        workspaceId: parseInt(workspaceId),
        role,
        invitedBy: requestorId,
        token: generateInvitationToken(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    // Send email invitation
    try {
      const inviter = await prisma.user.findUnique({
        where: { id: requestorId },
        select: { name: true, email: true },
        include: {
          team: {
            select: { name: true }
          }
        }
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const workspaceUrl = `${frontendUrl}/workspaces/${workspaceId}`;
      
      await emailService.sendWorkspaceInvitation(
        email,
        workspace.title,
        inviter.team?.name || 'Your Team',
        workspaceUrl,
        inviter.name || inviter.email,
        frontendUrl
      );
      
      console.log(`✅ Workspace invitation email sent to ${email} for workspace ${workspace.title}`);
    } catch (emailError) {
      console.error('❌ Failed to send workspace invitation email:', emailError);
      // Don't fail the request if email fails, but log the error
    }

    res.status(200).json({
      status: 200,
      message: "Invitation sent successfully",
      data: invitation
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// Get workspace members with permissions
const getWorkspaceMembers = async (req, res) => {
  const { workspaceId } = req.params;

  try {
    const workspaceUsers = await prisma.workspaceUser.findMany({
      where: { workspaceId: parseInt(workspaceId) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            imageUrl: true,
            department: true,
            efficiency: true,
            isActive: true
          }
        }
      },
      orderBy: [
        { role: 'desc' }, // Admins first
        { user: { name: 'asc' } }
      ]
    });

    res.status(200).json({
      status: 200,
      message: "Success",
      data: workspaceUsers
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// Helper function to generate invitation token
const generateInvitationToken = () => {
  return require('crypto').randomBytes(32).toString('hex');
};

module.exports = {
  createTeam: exports.createTeam,
  getTeam: exports.getTeam,
  getTeams: exports.getTeam, // Alias for getTeam
  updateTeam: exports.updateTeam,
  inviteMember: exports.inviteMember,
  joinTeam: exports.joinTeam,
  getTeamMembers,
  addUserToWorkspace,
  removeUserFromWorkspace,
  updateUserPermissions,
  toggleUserStatus,
  sendWorkspaceInvitation,
  getWorkspaceMembers,
  validateInviteCode: exports.validateInviteCode,
  getTeamWorkspaces: exports.getTeamWorkspaces
};

