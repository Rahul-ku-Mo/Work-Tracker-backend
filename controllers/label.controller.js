const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get all labels for a team
const getTeamLabels = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { userId } = req.user;

    // Verify user is a member of the team
    const teamMember = await prisma.user.findFirst({
      where: {
        id: userId,
        teamId: teamId,
      },
    });

    if (!teamMember) {
      return res.status(403).json({
        status: 403,
        message: "Access denied. You are not a member of this team.",
      });
    }

    const labels = await prisma.label.findMany({
      where: {
        teamId: teamId,
      },
      orderBy: {
        name: "asc",
      },
    });

    res.status(200).json({
      status: 200,
      message: "Team labels retrieved successfully",
      data: labels,
    });
  } catch (error) {
    console.error("Error fetching team labels:", error);
    res.status(500).json({
      status: 500,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Create a new label for a team
const createLabel = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { name, color } = req.body;
    const { userId } = req.user;

    if (!name || !name.trim()) {
      return res.status(400).json({
        status: 400,
        message: "Label name is required",
      });
    }

    // Verify user is a member of the team
    const teamMember = await prisma.user.findFirst({
      where: {
        id: userId,
        teamId: teamId,
      },
    });

    if (!teamMember) {
      return res.status(403).json({
        status: 403,
        message: "Access denied. You are not a member of this team.",
      });
    }

    // Check if label already exists for this team
    const existingLabel = await prisma.label.findFirst({
      where: {
        name: name.trim(),
        teamId: teamId,
      },
    });

    if (existingLabel) {
      return res.status(400).json({
        status: 400,
        message: "A label with this name already exists for this team",
      });
    }

    const label = await prisma.label.create({
      data: {
        name: name.trim(),
        color: color || null,
        teamId: teamId,
      },
    });

    res.status(201).json({
      status: 201,
      message: "Label created successfully",
      data: label,
    });
  } catch (error) {
    console.error("Error creating label:", error);
    res.status(500).json({
      status: 500,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update a label
const updateLabel = async (req, res) => {
  try {
    const { labelId } = req.params;
    const { name, color } = req.body;
    const { userId } = req.user;

    // Find the label and verify team membership
    const label = await prisma.label.findUnique({
      where: { id: labelId },
      include: { team: true },
    });

    if (!label) {
      return res.status(404).json({
        status: 404,
        message: "Label not found",
      });
    }

    // Verify user is a member of the team
    const teamMember = await prisma.user.findFirst({
      where: {
        id: userId,
        teamId: label.teamId,
      },
    });

    if (!teamMember) {
      return res.status(403).json({
        status: 403,
        message: "Access denied. You are not a member of this team.",
      });
    }

    // If name is being updated, check for uniqueness
    if (name && name.trim() !== label.name) {
      const existingLabel = await prisma.label.findFirst({
        where: {
          name: name.trim(),
          teamId: label.teamId,
          id: { not: labelId },
        },
      });

      if (existingLabel) {
        return res.status(400).json({
          status: 400,
          message: "A label with this name already exists for this team",
        });
      }
    }

    const updatedLabel = await prisma.label.update({
      where: { id: labelId },
      data: {
        name: name ? name.trim() : label.name,
        color: color !== undefined ? color : label.color,
      },
    });

    res.status(200).json({
      status: 200,
      message: "Label updated successfully",
      data: updatedLabel,
    });
  } catch (error) {
    console.error("Error updating label:", error);
    res.status(500).json({
      status: 500,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Delete a label
const deleteLabel = async (req, res) => {
  try {
    const { labelId } = req.params;
    const { userId } = req.user;

    // Find the label and verify team membership
    const label = await prisma.label.findUnique({
      where: { id: labelId },
      include: { 
        team: true,
        _count: {
          select: { cards: true }
        }
      },
    });

    if (!label) {
      return res.status(404).json({
        status: 404,
        message: "Label not found",
      });
    }

    // Verify user is a member of the team
    const teamMember = await prisma.user.findFirst({
      where: {
        id: userId,
        teamId: label.teamId,
      },
    });

    if (!teamMember) {
      return res.status(403).json({
        status: 403,
        message: "Access denied. You are not a member of this team.",
      });
    }

    // Check if label is being used by any cards
    if (label._count.cards > 0) {
      return res.status(400).json({
        status: 400,
        message: `Cannot delete label. It is currently used by ${label._count.cards} card(s). Please remove the label from all cards first.`,
      });
    }

    await prisma.label.delete({
      where: { id: labelId },
    });

    res.status(200).json({
      status: 200,
      message: "Label deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting label:", error);
    res.status(500).json({
      status: 500,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get labels for cards in a workspace (for filtering/display purposes)
const getWorkspaceLabels = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { userId } = req.user;

    // Verify user has access to the workspace
    const workspaceAccess = await prisma.workspaceUser.findFirst({
      where: {
        workspaceId: parseInt(workspaceId),
        userId: userId,
      },
      include: {
        workspace: true,
      },
    });

    if (!workspaceAccess) {
      return res.status(403).json({
        status: 403,
        message: "Access denied. You are not a member of this workspace.",
      });
    }

    // Get all unique labels used in cards within this workspace
    const cards = await prisma.card.findMany({
      where: {
        column: {
          workspaceId: parseInt(workspaceId),
        },
      },
      include: {
        labels: true,
      },
    });

    // Extract unique labels
    const labelsMap = new Map();
    cards.forEach(card => {
      card.labels.forEach(label => {
        labelsMap.set(label.id, label);
      });
    });

    const labels = Array.from(labelsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({
      status: 200,
      message: "Workspace labels retrieved successfully",
      data: labels,
    });
  } catch (error) {
    console.error("Error fetching workspace labels:", error);
    res.status(500).json({
      status: 500,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  getTeamLabels,
  createLabel,
  updateLabel,
  deleteLabel,
  getWorkspaceLabels,
};
