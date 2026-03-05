const { prisma } = require("../db");

// Get all team members with their project access status
exports.getTeamMembersWithProjectAccess = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Get the project with team info
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { teamId: true },
    });

    if (!project) {
      return res.status(404).json({
        status: 404,
        message: "Project not found",
      });
    }

    // Get all team members
    const teamMembers = await prisma.teamMember.findMany({
      where: { teamId: project.teamId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
            role: true,
          },
        },
      },
    });

    // Get project members for this project
    const projectMembers = await prisma.projectMember.findMany({
      where: { projectId },
    });

    // Map ALL team members with their project access status
    const allMembers = teamMembers.map((teamMember) => {
      const projectMember = projectMembers.find(
        (pm) => pm.userId === teamMember.userId && pm.role !== "ADMIN"
      );

      return {
        id: teamMember.id,
        userId: teamMember.user.id,
        name: teamMember.user.name,
        email: teamMember.user.email,
        imageUrl: teamMember.user.imageUrl,
        teamRole: teamMember.role,
        appRole: teamMember.user.role,
        hasProjectAccess: !!projectMember,
        projectRole: projectMember?.role || null,
        projectMemberId: projectMember?.id || null,
      };
    });

    return res.status(200).json({
      status: 200,
      message: "All team members with project access status retrieved successfully",
      data: allMembers,
    });
  } catch (error) {
    console.error("Error in getTeamMembersWithProjectAccess:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
};

// Grant project access to a user
exports.grantProjectAccess = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, role = "MEMBER" } = req.body;
    const requesterId = req.user?.userId;

    // Verify requester has permission (must be project ADMIN or team ADMIN)
    const requesterProjectMember = await prisma.projectMember.findFirst({
      where: { projectId, userId: requesterId },
    });

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        team: {
          include: {
            teamMembers: {
              where: { userId: requesterId },
            },
          },
        },
      },
    });

    const isTeamAdmin = project?.team?.teamMembers[0]?.role === "ADMIN";
    const isProjectAdmin = requesterProjectMember?.role === "ADMIN";

    if (!isTeamAdmin && !isProjectAdmin) {
      return res.status(403).json({
        status: 403,
        message: "Only project admins or team admins can grant project access",
      });
    }

    // Check if user already has access
    const existingMember = await prisma.projectMember.findFirst({
      where: { projectId, userId },
    });

    if (existingMember) {
      return res.status(400).json({
        status: 400,
        message: "User already has access to this project",
      });
    }

    // Grant access
    const projectMember = await prisma.projectMember.create({
      data: {
        projectId,
        userId,
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

    return res.status(200).json({
      status: 200,
      message: "Project access granted successfully",
      data: projectMember,
    });
  } catch (error) {
    console.error("Error in grantProjectAccess:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
};

// Revoke project access from a user
exports.revokeProjectAccess = async (req, res) => {
  try {
    const { projectId, memberId } = req.params;
    const requesterId = req.user?.userId;

    // Get the project member to be removed
    const projectMember = await prisma.projectMember.findUnique({
      where: { id: memberId },
    });

    if (!projectMember) {
      return res.status(404).json({
        status: 404,
        message: "Project member not found",
      });
    }

    // Verify requester has permission (must be project ADMIN or team ADMIN)
    const requesterProjectMember = await prisma.projectMember.findFirst({
      where: { projectId, userId: requesterId },
    });

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        team: {
          include: {
            teamMembers: {
              where: { userId: requesterId },
            },
          },
        },
      },
    });

    const isTeamAdmin = project?.team?.teamMembers[0]?.role === "ADMIN";
    const isProjectAdmin = requesterProjectMember?.role === "ADMIN";

    if (!isTeamAdmin && !isProjectAdmin) {
      return res.status(403).json({
        status: 403,
        message: "Only project admins or team admins can revoke project access",
      });
    }

    // Don't allow removing any ADMIN user - they are permanent members
    if (projectMember.role === "ADMIN") {
      return res.status(400).json({
        status: 400,
        message: "Cannot remove project ADMIN users. ADMIN users have permanent access to the project.",
      });
    }

    // Revoke access
    await prisma.projectMember.delete({
      where: { id: memberId },
    });

    // Also remove user from all workspaces in this project
    const workspaces = await prisma.workspace.findMany({
      where: { projectId },
      select: { id: true },
    });

    const workspaceIds = workspaces.map((w) => w.id);

    await prisma.workspaceUser.deleteMany({
      where: {
        workspaceId: { in: workspaceIds },
        userId: projectMember.userId,
      },
    });

    return res.status(200).json({
      status: 200,
      message: "Project access revoked successfully",
    });
  } catch (error) {
    console.error("Error in revokeProjectAccess:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
};

// Update user's project role
exports.updateProjectRole = async (req, res) => {
  try {
    const { projectId, memberId } = req.params;
    const { role } = req.body;
    const requesterId = req.user?.userId;

    if (![ "MEMBER", "OBSERVER"].includes(role)) {
      return res.status(400).json({
        status: 400,
        message: "Invalid role. Must be MEMBER, or OBSERVER",
      });
    }

    // Verify requester has permission
    const requesterProjectMember = await prisma.projectMember.findFirst({
      where: { projectId, userId: requesterId },
    });

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        team: {
          include: {
            teamMembers: {
              where: { userId: requesterId },
            },
          },
        },
      },
    });

    const isTeamAdmin = project?.team?.teamMembers[0]?.role === "ADMIN";
    const isProjectAdmin = requesterProjectMember?.role === "ADMIN";

    if (!isTeamAdmin && !isProjectAdmin) {
      return res.status(403).json({
        status: 403,
        message: "Only project admins or team admins can update project roles",
      });
    }

    // Check if the member being updated is an ADMIN
    const memberToUpdate = await prisma.projectMember.findUnique({
      where: { id: memberId },
      select: { role: true }
    });

    if (memberToUpdate?.role === "ADMIN") {
      return res.status(400).json({
        status: 400,
        message: "Cannot change role of ADMIN users. ADMIN role is permanent.",
      });
    }

    // Update role
    const updatedMember = await prisma.projectMember.update({
      where: { id: memberId },
      data: { role },
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

    return res.status(200).json({
      status: 200,
      message: "Project role updated successfully",
      data: updatedMember,
    });
  } catch (error) {
    console.error("Error in updateProjectRole:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
};

// Get user's accessible projects
exports.getUserAccessibleProjects = async (req, res) => {
  try {
    const userId = req.user?.userId;

    const projectMembers = await prisma.projectMember.findMany({
      where: { userId },
      include: {
        project: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
              },
            },
            lead: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            workspaces: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    const projects = projectMembers.map((pm) => ({
      ...pm.project,
      userRole: pm.role,
    }));

    return res.status(200).json({
      status: 200,
      message: "Accessible projects retrieved successfully",
      data: projects,
    });
  } catch (error) {
    console.error("Error in getUserAccessibleProjects:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
};

