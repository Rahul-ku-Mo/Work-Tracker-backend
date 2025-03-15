const { prisma } = require("../db");

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
  const { email } = req.body;
  const { userId } = req.user;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  try {
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
      }
    });

    if (!team) {
      return res.status(404).json({
        status: 404,
        message: "You don't have a team to invite members to",
      });
    }

    // Find the user to invite
    const userToInvite = await prisma.user.findUnique({
      where: {
        email
      }
    });

    if (!userToInvite) {
      return res.status(404).json({
        status: 404,
        message: "User not found",
      });
    }

    // Check if user is already in the team
    const isAlreadyMember = await prisma.team.findFirst({
      where: {
        id: team.id,
        members: {
          some: {
            id: userToInvite.id
          }
        }
      }
    });

    if (isAlreadyMember) {
      return res.status(400).json({
        status: 400,
        message: "User is already a team member",
      });
    }

    // Add user to team
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
            imageUrl: true
          }
        }
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        senderId: userId,
        receiverId: userToInvite.id,
        message: "JOIN"
      }
    });

    return res.status(200).json({
      status: 200,
      message: "User invited successfully",
      data: updatedTeam
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

// Add this new method for joining teams via code
exports.joinTeam = async (req, res) => {
  try {
    const { code } = req.body;
    const { userId } = req.user;

    // Check if user is already in a team
    const userWithTeam = await prisma.user.findUnique({
      where: { id: userId },
      include: { team: true }
    });

    if (userWithTeam.team) {
      return res.status(400).json({
        status: 400,
        message: "You are already a member of a team",
      });
    }

    // Find team by join code
    const team = await prisma.team.findUnique({
      where: { joinCode: code }
    });

    if (!team) {
      return res.status(404).json({
        status: 404,
        message: "Invalid join code",
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
      message: "Successfully joined team",
      data: updatedTeam
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
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

