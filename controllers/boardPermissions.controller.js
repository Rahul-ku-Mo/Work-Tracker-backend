const { prisma } = require("../db");
const emailService = require("../services/emailService");

// Get all team members and their board permissions
exports.getTeamMembersWithBoardAccess = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { userId } = req.user;

    // Check if user is admin of the board
    const userBoardAccess = await prisma.boardUser.findFirst({
      where: {
        boardId: parseInt(boardId),
        userId: userId,
        role: "ADMIN",
      },
    });

    if (!userBoardAccess) {
      return res.status(403).json({
        status: 403,
        message: "Only board admins can view member permissions",
      });
    }

    // Get the board and team info
    const board = await prisma.board.findUnique({
      where: { id: parseInt(boardId) },
      include: {
        user: {
          include: {
            team: {
              include: {
                members: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    imageUrl: true,
                    role: true,
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!board) {
      return res.status(404).json({
        status: 404,
        message: "Board not found",
      });
    }

    // Get current board members
    const boardMembers = await prisma.boardUser.findMany({
      where: { boardId: parseInt(boardId) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
            role: true,
          }
        }
      }
    });

    // Combine team members with their board access status
    const teamMembers = board.user.team?.members || [];
    const membersWithAccess = teamMembers.map(member => {
      const boardAccess = boardMembers.find(bm => bm.userId === member.id);
      return {
        ...member,
        boardAccess: boardAccess ? {
          role: boardAccess.role,
          grantedAt: boardAccess.createdAt
        } : null
      };
    });

    res.status(200).json({
      status: 200,
      message: "Success",
      data: {
        board: {
          id: board.id,
          title: board.title
        },
        team: {
          id: board.user.team?.id,
          name: board.user.team?.name
        },
        members: membersWithAccess
      }
    });
  } catch (error) {
    console.error('Error in getTeamMembersWithBoardAccess:', error);
    res.status(500).json({
      status: 500,
      message: "Internal Server Error"
    });
  }
};

// Grant board access to a team member
exports.grantBoardAccess = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { memberId, role = "MEMBER" } = req.body;
    const { userId } = req.user;

    // Validate role
    if (!["ADMIN", "MEMBER"].includes(role)) {
      return res.status(400).json({
        status: 400,
        message: "Invalid role. Must be ADMIN or MEMBER",
      });
    }

    // Check if user is admin of the board
    const userBoardAccess = await prisma.boardUser.findFirst({
      where: {
        boardId: parseInt(boardId),
        userId: userId,
        role: "ADMIN",
      },
    });

    if (!userBoardAccess) {
      return res.status(403).json({
        status: 403,
        message: "Only board admins can grant access",
      });
    }

    // Check if member exists and is in the same team
    const member = await prisma.user.findUnique({
      where: { id: memberId },
      include: { team: true }
    });

    if (!member) {
      return res.status(404).json({
        status: 404,
        message: "Member not found",
      });
    }

    // Get board creator's team
    const board = await prisma.board.findUnique({
      where: { id: parseInt(boardId) },
      include: {
        user: {
          include: { team: true }
        }
      }
    });

    if (!board) {
      return res.status(404).json({
        status: 404,
        message: "Board not found",
      });
    }

    // Check if member is in the same team as board creator
    if (!member.team || member.team.id !== board.user.team?.id) {
      return res.status(400).json({
        status: 400,
        message: "Member must be in the same team to access this board",
      });
    }

    // Check if member already has access
    const existingAccess = await prisma.boardUser.findFirst({
      where: {
        boardId: parseInt(boardId),
        userId: memberId,
      },
    });

    if (existingAccess) {
      // Update existing access
      const updatedAccess = await prisma.boardUser.update({
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
        message: `Board access updated for ${member.name || member.email}`,
        data: updatedAccess
      });
    } else {
      // Grant new access
      const boardAccess = await prisma.boardUser.create({
        data: {
          boardId: parseInt(boardId),
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
        const boardUrl = `${frontendUrl}/workspace/board/${boardId}`;
        
        await emailService.sendBoardInvitation(
          member.email,
          board.title,
          board.user.team.name,
          boardUrl,
          granter.name || granter.email,
          frontendUrl
        );
      } catch (emailError) {
        console.error('Failed to send board invitation email:', emailError);
        // Don't fail the request if email fails
      }

      return res.status(201).json({
        status: 201,
        message: `Board access granted to ${member.name || member.email}`,
        data: boardAccess
      });
    }
  } catch (error) {
    console.error('Error in grantBoardAccess:', error);
    res.status(500).json({
      status: 500,
      message: "Internal Server Error"
    });
  }
};

// Revoke board access from a team member
exports.revokeBoardAccess = async (req, res) => {
  try {
    const { boardId, memberId } = req.params;
    const { userId } = req.user;

    // Check if user is admin of the board
    const userBoardAccess = await prisma.boardUser.findFirst({
      where: {
        boardId: parseInt(boardId),
        userId: userId,
        role: "ADMIN",
      },
    });

    if (!userBoardAccess) {
      return res.status(403).json({
        status: 403,
        message: "Only board admins can revoke access",
      });
    }

    // Prevent admin from removing themselves
    if (memberId === userId) {
      return res.status(400).json({
        status: 400,
        message: "You cannot remove your own access",
      });
    }

    // Find and remove the board access
    const boardAccess = await prisma.boardUser.findFirst({
      where: {
        boardId: parseInt(boardId),
        userId: memberId,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    });

    if (!boardAccess) {
      return res.status(404).json({
        status: 404,
        message: "Member does not have access to this board",
      });
    }

    await prisma.boardUser.delete({
      where: { id: boardAccess.id }
    });

    res.status(200).json({
      status: 200,
      message: `Board access revoked from ${boardAccess.user.name || boardAccess.user.email}`,
    });
  } catch (error) {
    console.error('Error in revokeBoardAccess:', error);
    res.status(500).json({
      status: 500,
      message: "Internal Server Error"
    });
  }
};

// Get user's accessible boards
exports.getUserAccessibleBoards = async (req, res) => {
  try {
    const { userId } = req.user;

    const boards = await prisma.board.findMany({
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
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      },
    });

    const boardsWithRole = boards.map(board => ({
      ...board,
      userRole: board.members[0]?.role,
      members: undefined // Remove members array from response
    }));

    res.status(200).json({
      status: 200,
      message: "Success",
      data: boardsWithRole,
    });
  } catch (error) {
    console.error('Error in getUserAccessibleBoards:', error);
    res.status(500).json({
      status: 500,
      message: "Internal Server Error"
    });
  }
}; 