const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const {
  generateCapitalizedSlug,
  generateUniqueSlug,
} = require("../utils/slugUtils");
const { checkUndefined } = require("../utils/checkUtils");

// Get all projects for a team (only accessible projects)
const getProjects = async (req, res) => {
  try {
    const { teamId } = req.query;
    const { userId } = req.user;

    if (!teamId) {
      return res.status(400).json({ error: "Team ID is required" });
    }

    // Check if user is team admin
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: teamId,
        userId: userId,
        role: 'ADMIN'
      }
    });

    const isTeamAdmin = !!teamMember;

    // Base query to get team projects
    let whereClause = {
      teamId: teamId,
    };

    // If not team admin, only show projects where user is lead or member
    if (!isTeamAdmin) {
      whereClause.OR = [
        { leadId: userId },
        { members: { some: { userId: userId } } }
      ];
    }

    const include = {
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
      lead: {
        select: {
          id: true,
          name: true,
          email: true,
          imageUrl: true,
        },
      },
    };

    const projects = await prisma.project.findMany({
      where: whereClause,
      orderBy: [{ createdAt: "desc" }],
      include,
    });

    // Add access information for each project
    const projectsWithAccess = projects.map(project => {
      const isLead = project.leadId === userId;
      const isMember = project.members.some(m => m.userId === userId);
      const hasAccess = isTeamAdmin || isLead || isMember;
      
      return {
        ...project,
        userAccess: {
          hasAccess,
          isLead,
          isMember,
          isTeamAdmin,
          role: isLead ? 'ADMIN' : isMember ? 'MEMBER' : isTeamAdmin ? 'ADMIN' : null
        }
      };
    });

    res.json(projectsWithAccess);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
};

// Get all team projects (including locked ones for visibility)
const getTeamProjects = async (req, res) => {
  try {
    const { teamId } = req.query;
    const { userId } = req.user;

    if (!teamId) {
      return res.status(400).json({ error: "Team ID is required" });
    }

    // Check if user is team member
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: teamId,
        userId: userId,
      }
    });

    if (!teamMember) {
      return res.status(403).json({ error: "You are not a member of this team" });
    }

    const isTeamAdmin = teamMember.role === 'ADMIN';

    const include = {
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
      lead: {
        select: {
          id: true,
          name: true,
          email: true,
          imageUrl: true,
        },
      },
    };

    const projects = await prisma.project.findMany({
      where: { teamId: teamId },
      orderBy: [{ createdAt: "desc" }],
      include,
    });

    // Add access information for each project
    const projectsWithAccess = projects.map(project => {
      const isLead = project.leadId === userId;
      const isMember = project.members.some(m => m.userId === userId);
      const isOwner = project.creatorId === userId;
      const hasAccess = isTeamAdmin || isLead || isMember;
      
      return {
        id: project.id,
        title: project.title,
        slug: project.slug,
        status: project.status,
        priority: project.priority,
        targetDate: project.targetDate,
        leadId: project.leadId,
        createdBy: project.lead?.name || 'Unknown',
        hasAccess,
        isOwner,
        userRole: isLead ? 'ADMIN' : isMember ? 'MEMBER' : isTeamAdmin ? 'ADMIN' : null,
        members: hasAccess ? project.members : [], // Only show members if user has access
        lead: hasAccess ? project.lead : null,
      };
    });

    res.json(projectsWithAccess);
  } catch (error) {
    console.error("Error fetching team projects:", error);
    res.status(500).json({ error: "Failed to fetch team projects" });
  }
};

// Get a specific project
const getProject = async (req, res) => {
  try {
    const { projectSlug } = req.params;

    const project = await prisma.project.findUnique({
      where: { slug: projectSlug },
      include: {
        milestones: true,
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
        workspaces: true,
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ error: "Failed to fetch project" });
  }
};

// Create a new project
const createProject = async (req, res) => {
  try {
    const {
      title,
      description,
      clientName, // New field for client name
      teamId, // Required
      leadId,
      members,
      startDate,
      targetDate,
      priority,
      status,
      summary,
      milestones = [],
    } = req.body;
    const { userId } = req.user;

    // Format milestones for the enhanced milestone system

    console.log("Creating project with teamId:", teamId);
    console.log("Request body:", req.body);

    // Validate required fields
    if (!title || !teamId) {
      return res.status(400).json({ error: "Title and teamId are required" });
    }

    // Check if team exists and user is team admin
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: teamId,
        userId: userId,
        role: 'ADMIN'
      },
      include: {
        team: true
      }
    });

    if (!teamMember) {
      return res.status(403).json({ 
        error: "Only team administrators can create projects. Please contact your team admin." 
      });
    }

    console.log("Team found:", teamMember.team.name);

    // Generate unique slug globally
    const slug = await generateUniqueSlug(title, async (slug) => {
      const existing = await prisma.project.findFirst({
        where: { slug },
      });
      return !!existing;
    });

    // Create project with team association
    const project = await prisma.project.create({
      data: {
        title,
        slug,
        teamId,
        clientName: clientName || undefined,
        description: description || undefined,
        summary: summary || undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        targetDate: targetDate ? new Date(targetDate) : undefined,
        priority: priority || undefined,
        status: status || undefined,
        leadId: req.user.id, // Use current user as lead
      },
    });

    const formattedMilestones = milestones.map((milestone, index) => ({
      title: milestone.title || `Milestone ${index + 1}`,
      description: milestone.description || "",
      status: milestone.status || "INCOMPLETE",
      targetDate: milestone.targetDate ? new Date(milestone.targetDate) : null,
      notes: milestone.notes || "",
      order: milestone.order || index + 1,
      projectId: project.id,
    }));

    // If members are provided, create project members
    if (members && Array.isArray(members)) {
      const memberPromises = members.map((memberId) =>
        prisma.projectMember.create({
          data: {
            projectId: project.id,
            userId: memberId,
            role: memberId === leadId ? "ADMIN" : "MEMBER",
          },
        })
      );

      await Promise.all(memberPromises);
    }

    if (formattedMilestones.length > 0) {
      await prisma.milestone.createMany({
        data: formattedMilestones,
      });
    }

    res.status(201).json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ error: "Failed to create project" });
  }
};

// Update a project
const updateProject = async (req, res) => {
  try {
    const { projectSlug } = req.params;
    const {
      title,
      description,
      leadId,
      members,
      startDate,
      targetDate,
      priority,
      status,
      summary,
      milestones,
    } = req.body;

    // Format milestones if provided
    let formattedMilestones;
    if (milestones !== undefined) {
      formattedMilestones = milestones.map((milestone, index) => ({
        id: milestone.id || `milestone-${Date.now()}-${index}`,
        title: milestone.title || `Milestone ${index + 1}`,
        description: milestone.description || "",
        status: milestone.status || "INCOMPLETE",
        targetDate: milestone.targetDate
          ? new Date(milestone.targetDate)
          : null,
        notes: milestone.notes || "",
        order: milestone.order || index + 1,
      }));
    }

    // Get the current project to get its teamId
    const currentProject = await prisma.project.findUnique({
      where: { slug: projectSlug },
      select: { teamId: true, id: true },
    });

    if (!currentProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Prepare update data
    const updateData = {};

    // Handle title and slug update
    if (title !== undefined) {
      updateData.title = title;
      // Generate new slug if title changed
      updateData.slug = await generateUniqueSlug(title, async (slug) => {
        const existing = await prisma.project.findFirst({
          where: {
            slug,
            id: { not: currentProject.id },
          },
        });
        return !!existing;
      });
    }

    // Handle optional fields
    if (description !== undefined) updateData.description = description;
    if (summary !== undefined) updateData.summary = summary;
    if (startDate !== undefined)
      updateData.startDate = startDate ? new Date(startDate) : null;
    if (targetDate !== undefined)
      updateData.targetDate = targetDate ? new Date(targetDate) : null;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (milestones !== undefined) updateData.milestones = formattedMilestones;
    if (leadId !== undefined) updateData.leadId = leadId;

    // Start a transaction for the update
    const updatedProject = await prisma.$transaction(async (prisma) => {
      // Update project basic info
      const project = await prisma.project.update({
        where: { id: currentProject.id },
        data: updateData,
      });

      // Note: Workspace associations are now handled directly through the workspace.projectId field
      // This section is removed as workspaces now belong directly to projects

      // Handle members update if provided
      if (members && Array.isArray(members)) {
        // Remove existing members
        await prisma.projectMember.deleteMany({
          where: { projectId: currentProject.id },
        });

        // Add new members
        await prisma.projectMember.createMany({
          data: members.map((memberId) => ({
            projectId: currentProject.id,
            userId: memberId,
            role: memberId === leadId ? "ADMIN" : "MEMBER",
          })),
        });
      }

      return project;
    });

    // Fetch updated project with all relations
    const finalProject = await prisma.project.findUnique({
      where: { id: currentProject.id },
      include: {
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
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
          },
        },
        workspaces: true,
      },
    });

    res.json(finalProject);
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ error: "Failed to update project" });
  }
};

// Delete a project
const deleteProject = async (req, res) => {
  try {
    const { projectSlug } = req.params;

    // Delete project (cascade will handle related records)
    await prisma.project.delete({
      where: { slug: projectSlug },
    });

    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ error: "Failed to delete project" });
  }
};

// Reorder projects
const reorderProjects = async (req, res) => {
  try {
    const { projectIds } = req.body;

    if (!Array.isArray(projectIds)) {
      return res.status(400).json({ error: "projectIds must be an array" });
    }

    // Update order for each project
    const updatePromises = projectIds.map((projectId, index) =>
      prisma.project.update({
        where: { id: projectId },
        data: { order: index },
      })
    );

    await Promise.all(updatePromises);

    res.json({ message: "Projects reordered successfully" });
  } catch (error) {
    console.error("Error reordering projects:", error);
    res.status(500).json({ error: "Failed to reorder projects" });
  }
};

// Update project target date
const updateProjectTargetDate = async (req, res) => {
  try {
    const { projectSlug } = req.params;
    const { targetDate } = req.body;

    const project = await prisma.project.findUnique({
      where: { slug: projectSlug },
      select: { id: true, teamId: true },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const updatedProject = await prisma.project.update({
      where: { id: project.id },
      data: {
        targetDate: targetDate ? new Date(targetDate) : null,
      },
      include: {
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
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
          },
        },
        workspaces: true,
      },
    });

    res.json(updatedProject);
  } catch (error) {
    console.error("Error updating project target date:", error);
    res.status(500).json({ error: "Failed to update project target date" });
  }
};

// Update project admin
const updateProjectLead = async (req, res) => {
  try {
    const { projectSlug } = req.params;
    const { leadId } = req.body;

    const project = await prisma.project.findUnique({
      where: { slug: projectSlug },
      select: { id: true, teamId: true },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Verify the lead is a member of the team
    if (leadId) {
      const teamMember = await prisma.team.findFirst({
        where: {
          id: project.teamId,
          members: { some: { id: leadId } },
        },
      });

      if (!teamMember) {
        return res
          .status(400)
          .json({ error: "Lead must be a member of the project team" });
      }
    }

    const updatedProject = await prisma.project.update({
      where: { id: project.id },
      data: {
        leadId: leadId || null,
      },
      include: {
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
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
          },
        },
        workspaces: true,
      },
    });

    res.json(updatedProject);
  } catch (error) {
    console.error("Error updating project admin:", error);
    res.status(500).json({ error: "Failed to update project admin" });
  }
};

// Update project members
const updateProjectMembers = async (req, res) => {
  try {
    const { projectSlug } = req.params;
    const { memberIds } = req.body;

    const project = await prisma.project.findUnique({
      where: { slug: projectSlug },
      select: { id: true, teamId: true, leadId: true },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Verify all members are part of the team
    if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
      const teamMembers = await prisma.team.findFirst({
        where: {
          id: project.teamId,
          members: { some: { id: { in: memberIds } } },
        },
        include: {
          members: {
            where: {
              id: { in: memberIds },
            },
          },
        },
      });

      if (!teamMembers) {
        return res
          .status(400)
          .json({ error: "All members must be part of the project team" });
      }
    }

    const updatedProject = await prisma.$transaction(async (prisma) => {
      // Remove existing members
      await prisma.projectMember.deleteMany({
        where: { projectId: project.id },
      });

      // Add new members
      if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
        await prisma.projectMember.createMany({
          data: memberIds.map((memberId) => ({
            projectId: project.id,
            userId: memberId,
            role: memberId === project.leadId ? "ADMIN" : "MEMBER",
          })),
        });
      }

      return await prisma.project.findUnique({
        where: { id: project.id },
        include: {
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
          lead: {
            select: {
              id: true,
              name: true,
              email: true,
              imageUrl: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              imageUrl: true,
            },
          },
          workspaces: {
            include: {
              workspace: true,
            },
          },
        },
      });
    });

    res.json(updatedProject);
  } catch (error) {
    console.error("Error updating project members:", error);
    res.status(500).json({ error: "Failed to update project members" });
  }
};

// Get project workspaces
const getProjectWorkspaces = async (req, res) => {
  try {
    const { projectSlug } = req.params;

    const project = await prisma.project.findUnique({
      where: { slug: projectSlug },
      include: {
        workspaces: {
          select: {
            id: true,
            title: true,
            slug: true,
            prefix: true,
            colorName: true,
            colorValue: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({
      projectId: project.id,
      projectTitle: project.title,
      workspaces: project.workspaces,
    });
  } catch (error) {
    console.error("Error fetching project workspaces:", error);
    res.status(500).json({ error: "Failed to fetch project workspaces" });
  }
};

// Update project priority
const updateProjectPriority = async (req, res) => {
  try {
    const { projectSlug } = req.params;
    const { priority } = req.body;

    const project = await prisma.project.findUnique({
      where: { slug: projectSlug },
      select: { id: true, teamId: true },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const updatedProject = await prisma.project.update({
      where: { id: project.id },
      data: { priority },
    });

    res.json(updatedProject);
  } catch (error) {
    console.error("Error updating project priority:", error);
    res.status(500).json({ error: "Failed to update project priority" });
  }
};

// Update milestone completion status
const updateMilestoneCompletion = async (req, res) => {
  try {
    const { projectSlug } = req.params;
    const { milestoneId, isCompleted } = req.body;

    const project = await prisma.project.findUnique({
      where: { slug: projectSlug },
      select: { id: true, milestones: true },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Update the specific milestone
    const updatedMilestones = project.milestones.map((milestone) => {
      if (milestone.id === milestoneId) {
        return {
          ...milestone,
          status: isCompleted ? "COMPLETE" : "INCOMPLETE",
          completedAt: isCompleted ? new Date() : null,
        };
      }
      return milestone;
    });

    const updatedProject = await prisma.project.update({
      where: { id: project.id },
      data: { milestones: updatedMilestones },
      include: {
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
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
          },
        },
        workspaces: true,
      },
    });

    res.json(updatedProject);
  } catch (error) {
    console.error("Error updating milestone completion:", error);
    res.status(500).json({ error: "Failed to update milestone completion" });
  }
};

module.exports = {
  getProjects,
  getTeamProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  reorderProjects,
  updateProjectTargetDate,
  updateProjectLead,
  updateProjectMembers,
  getProjectWorkspaces,
  updateProjectPriority,
  updateMilestoneCompletion,
};
