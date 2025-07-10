const { prisma } = require("../db");
const emailService = require("../services/emailService");

// Get workspace members
exports.getWorkspaceMembers = async (req, res) => {
  const { workspaceSlug, teamId } = req.params;

  try {
    const members = await prisma.workspaceUser.findMany({
      where: {
        workspace: {
          slug: workspaceSlug,
          user: {
            teamId: teamId
          }
        }
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

// Invite user to workspace
exports.inviteUserToWorkspace = async (req, res) => {
  const { workspaceId }   = req.params;
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
        select: { name: true, email: true, team: true }
      });

      const teamName = inviter.team.name;
      const workspaceSlug = workspace.slug;

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const workspaceUrl = `${frontendUrl}/workspace/${teamName}/${workspaceSlug}`;
      
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
      message: "User invited to workspace successfully",
      data: workspaceMember,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
}; 