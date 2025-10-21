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

    // Check if user already has a team as admin
    const existingTeamMember = await prisma.teamMember.findFirst({
      where: {
        userId: userId,
        role: "ADMIN"
      },
      include: {
        team: true
      }
    });

    if (existingTeamMember) {
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
        teamMembers: {
          create: {
            userId: userId,
            role: "ADMIN"
          }
        }
      },
      include: {
        teamMembers: {
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
    // Find team where user is a team member (admin/owner)
    const team = await prisma.team.findFirst({
      where: {
        teamMembers: { some: { userId: userId } }
      },
      include: {
        teamMembers: {
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

    // Find team where user is ADMIN (only admins can update team)
    const teamMember = await prisma.teamMember.findFirst({
      where: { 
        userId: userId,
        role: "ADMIN"
      },
      include: {
        team: true
      }
    });

    if (!teamMember) {
      return res.status(404).json({
        status: 404,
        message: "Team not found or you don't have permission to update it",
      });
    }

    // Update team name
    const updatedTeam = await prisma.team.update({
      where: { id: teamMember.team.id },
      data: { name: name.trim(), teamImageUrl },
      include: {
        teamMembers: {
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

    // Check if requester is admin and has a team with ADMIN role
    if (user?.role !== "ADMIN") {
      return res.status(403).json({
        status: 403,
        message: "Only administrators can invite team members",
      });
    }

    // Find the user's team (must be ADMIN)
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: userId,
        role: "ADMIN"
      },
      include: {
        team: true
      }
    });

    if (!teamMember) {
      return res.status(404).json({
        status: 404,
        message: "You don't have a team to invite members to",
      });
    }

    const team = teamMember.team;

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
        include: { 
          teamMemberships: {
            select: { teamId: true }
          }
        }
      });

      if (userCurrentTeam.teamMemberships && userCurrentTeam.teamMemberships.length > 0) {
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
          teamMembers: {
            create: {
              userId: userToInvite.id,
              role: "MEMBER"
            }
          }
        },
        include: {
          teamMembers: {
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
          }
        }
      });

      // Create notification for team admin about new member joining
      await prisma.notification.create({
        data: {
          senderId: userToInvite.id,
          receiverId: userId, // Send to team admin
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
      include: { 
        teamMemberships: {
          select: { teamId: true }
        }
      }
    });

    if (userWithTeam.teamMemberships && userWithTeam.teamMemberships.length > 0) {
      return res.status(400).json({
        status: 400,
        message: "You are already a member of a team. Leave your current team first to join another.",
      });
    }

    // Find team by join code
    const team = await prisma.team.findUnique({
      where: { joinCode: trimmedCode },
      include: {
        teamMembers: {
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
    });

    if (!team) {
      return res.status(404).json({
        status: 404,
        message: "Invalid join code. Please check the code and try again.",
      });
    }

    // Add user to team
    const updatedTeam = await prisma.team.update({
      where: { id: team.id },
      data: {
        teamMembers: {
          create: {
            userId: userId,
            role: "MEMBER"
          }
        }
      },
      include: {
        teamMembers: {
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
        }
      }
    });

    // Create notification for team admin
    const teamAdmin = team.teamMembers.find(tm => tm.role === 'ADMIN');
    if (teamAdmin) {
      await prisma.notification.create({
        data: {
          senderId: userId,
          receiverId: teamAdmin.userId,
          message: "JOIN",
          metadata: JSON.stringify({
            teamName: team.name,
            teamId: team.id
          })
        }
      });
    }

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

// Get members by project ID (since members are now associated with projects)
exports.getTeamMembers = async (req, res) => {
  try {
    const { userId } = req.user;
    const { projectId } = req.query;

    // If projectId is provided, get project members
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  imageUrl: true,
                  username: true,
                  department: true,
                  isActive: true
                }
              }
            }
          }
        }
      });

      if (!project) {
        return res.status(404).json({
          status: 404,
          message: "Project not found",
        });
      }

      const members = project.members.map(member => ({
        ...member.user,
        role: member.role,
        joinedAt: member.joinedAt
      }));

      return res.status(200).json({
        status: 200,
        message: "Project members retrieved successfully",
        data: members,
      });
    }

    // If no projectId, get all team members (admins/owners) and all project members
    const team = await prisma.team.findFirst({
      where: {
        teamMembers: { some: { userId: userId } }
      },
      include: {
        teamMembers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                imageUrl: true,
                username: true,
                department: true,
                isActive: true
              }
            }
          }
        },
        projects: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    imageUrl: true,
                    username: true,
                    department: true,
                    isActive: true
                  }
                }
              }
            }
          }
        }
      },
    });

    if (!team) {
      return res.status(404).json({
        status: 404,
        message: "Team not found",
      });
    }

    // Combine team admins and project members (deduplicated)
    const allMembers = new Map();
    
    // Add team admins
    team.teamMembers.forEach(tm => {
      allMembers.set(tm.user.id, {
        ...tm.user,
        role: 'TEAM_ADMIN',
        joinedAt: tm.joinedAt
      });
    });

    // Add project members
    team.projects.forEach(project => {
      project.members.forEach(member => {
        if (!allMembers.has(member.user.id)) {
          allMembers.set(member.user.id, {
            ...member.user,
            role: member.role,
            joinedAt: member.joinedAt,
            projectId: project.id,
            projectTitle: project.title
          });
        }
      });
    });

    return res.status(200).json({
      status: 200,
      message: "Team members retrieved successfully",
      data: Array.from(allMembers.values()),
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
        teamMembers: {
          where: {
            role: 'ADMIN'
          },
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            teamMembers: true
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

    const admin = team.teamMembers[0]?.user;

    return res.status(200).json({
      status: 200,
      message: "Valid invite code",
      data: {
        id: team.id,
        name: team.name,
        admin: admin?.name || admin?.email || 'Team Admin',
        memberCount: team._count.teamMembers
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

    // Find user's team through teamMemberships
    const userWithTeam = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        teamMemberships: {
          include: {
            team: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!userWithTeam || !userWithTeam.teamMemberships || userWithTeam.teamMemberships.length === 0) {
      return res.status(404).json({
        status: 404,
        message: "No team found for user",
        data: []
      });
    }

    // Get the first team (users should only have one team membership)
    const teamId = userWithTeam.teamMemberships[0].team.id;

    // Get all workspaces for the team through projects
    const allTeamWorkspaces = await prisma.workspace.findMany({
      where: {
        project: {
          teamId: teamId
        }
      },
      select: {
        id: true,
        title: true,
        slug: true,
        colorName: true,
        colorValue: true,
        createdAt: true,
        members: {
          select: {
            userId: true,
            role: true,
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
            teamId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Add access status to each workspace
    const workspacesWithAccess = allTeamWorkspaces.map(workspace => {
      const currentUserMember = workspace.members.find(m => m.userId === userId);
      const creatorMember = workspace.members.find(m => m.role === 'ADMIN');
      
      return {
        ...workspace,
        hasAccess: !!currentUserMember,
        userRole: currentUserMember?.role || null,
        isOwner: currentUserMember?.role === 'ADMIN',
        createdBy: creatorMember?.user?.name || creatorMember?.user?.email || 'Unknown',
        teamId: teamId
      };
    });

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
          teamMembers: {
            include: {
              user: {
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
              }
            }
          },
          projects: {
            include: {
              members: {
                include: {
                  user: {
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
                  }
                }
              }
            }
          }
        }
      });
    } else if (userId) {
      // If no teamId provided, find team through user's team membership
      const teamMembership = await prisma.teamMember.findFirst({
        where: { userId: userId },
        include: {
          team: {
            include: {
              teamMembers: {
                include: {
                  user: {
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
                  }
                }
              },
              projects: {
                include: {
                  members: {
                    include: {
                      user: {
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
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
      
      // Get the user's team
      team = teamMembership?.team;
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

    // Collect all members from team and projects
    const allMembers = new Map();

    // Add team members (admins)
    team.teamMembers?.forEach(tm => {
      const user = tm.user;
      allMembers.set(user.id, {
        ...user,
        role: 'TEAM_ADMIN',
        boardAccess: user.workspaces?.map(wu => ({
          board: wu.workspace,
          role: wu.role,
          canEdit: wu.role === 'ADMIN'
        })) || []
      });
    });

    // Add project members
    team.projects?.forEach(project => {
      project.members?.forEach(member => {
        const user = member.user;
        if (!allMembers.has(user.id)) {
          allMembers.set(user.id, {
            ...user,
            role: member.role,
            projectId: project.id,
            projectTitle: project.title,
            boardAccess: user.workspaces?.map(wu => ({
              board: wu.workspace,
              role: wu.role,
              canEdit: wu.role === 'ADMIN'
            })) || []
          });
        }
      });
    });

    res.status(200).json({
      status: 200,
      message: "Success",
      data: {
        team,
        members: Array.from(allMembers.values())
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
    // Check if requestor is team admin or has admin role
    const requestor = await prisma.user.findUnique({
      where: { id: requestorId },
      include: {
        teamMemberships: {
          include: {
            team: true
          }
        }
      }
    });

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        teamMemberships: {
          include: {
            team: true
          }
        }
      }
    });

    if (!targetUser) {
      return res.status(404).json({
        status: 404,
        message: "User not found"
      });
    }

    // Check permissions - requestor must be app ADMIN or team ADMIN of the same team
    const requestorTeamMembership = requestor.teamMemberships?.[0];
    const targetTeamMembership = targetUser.teamMemberships?.[0];
    
    const canModify = requestor.role === 'ADMIN' || 
                     (requestorTeamMembership && 
                      targetTeamMembership &&
                      requestorTeamMembership.teamId === targetTeamMembership.teamId && 
                      requestorTeamMembership.role === 'ADMIN');

    if (!canModify) {
      return res.status(403).json({
        status: 403,
        message: "Only team admins or app admins can modify user status"
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
        select: { 
          name: true, 
          email: true,
          teamMemberships: {
            include: {
              team: {
                select: { name: true }
              }
            }
          }
        }
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const projectUrl = `${frontendUrl}/projects`;
      
      await emailService.sendWorkspaceInvitation(
        email,
        workspace.title,
        inviter.teamMemberships?.[0]?.team?.name || 'Your Team',
        projectUrl,
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

