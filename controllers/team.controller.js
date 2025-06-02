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

      // Create notification for existing user
      await prisma.notification.create({
        data: {
          senderId: userId,
          receiverId: userToInvite.id,
          message: "JOIN"
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
        message: "JOIN"
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

