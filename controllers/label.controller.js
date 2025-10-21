const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get all labels for a workspace
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
    });

    if (!workspaceAccess) {
      return res.status(403).json({
        status: 403,
        message: "Access denied. You are not a member of this workspace.",
      });
    }

    const labels = await prisma.label.findMany({
      where: {
        workspaceId: parseInt(workspaceId),
      },
      orderBy: {
        name: "asc",
      },
    });

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

// Create a new label for a workspace
const createLabel = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, color } = req.body;
    const { userId } = req.user;

    if (!name || !name.trim()) {
      return res.status(400).json({
        status: 400,
        message: "Label name is required",
      });
    }

    // Verify user has access to the workspace
    const workspaceAccess = await prisma.workspaceUser.findFirst({
      where: {
        workspaceId: parseInt(workspaceId),
        userId: userId,
      },
    });

    if (!workspaceAccess) {
      return res.status(403).json({
        status: 403,
        message: "Access denied. You are not a member of this workspace.",
      });
    }

    // Check if label already exists for this workspace
    const existingLabel = await prisma.label.findFirst({
      where: {
        name: name.trim(),
        workspaceId: parseInt(workspaceId),
      },
    });

    if (existingLabel) {
      return res.status(400).json({
        status: 400,
        message: "A label with this name already exists for this workspace",
      });
    }

    const label = await prisma.label.create({
      data: {
        name: name.trim(),
        color: color || null,
        workspaceId: parseInt(workspaceId),
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

    // Find the label and verify workspace access
    const label = await prisma.label.findUnique({
      where: { id: labelId },
      include: { workspace: true },
    });

    if (!label) {
      return res.status(404).json({
        status: 404,
        message: "Label not found",
      });
    }

    // Verify user has access to the workspace
    const workspaceAccess = await prisma.workspaceUser.findFirst({
      where: {
        workspaceId: label.workspaceId,
        userId: userId,
      },
    });

    if (!workspaceAccess) {
      return res.status(403).json({
        status: 403,
        message: "Access denied. You are not a member of this workspace.",
      });
    }

    // If name is being updated, check for uniqueness
    if (name && name.trim() !== label.name) {
      const existingLabel = await prisma.label.findFirst({
        where: {
          name: name.trim(),
          workspaceId: label.workspaceId,
          id: { not: labelId },
        },
      });

      if (existingLabel) {
        return res.status(400).json({
          status: 400,
          message: "A label with this name already exists for this workspace",
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

    // Find the label and verify workspace access
    const label = await prisma.label.findUnique({
      where: { id: labelId },
      include: { 
        workspace: true,
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

    // Verify user has access to the workspace
    const workspaceAccess = await prisma.workspaceUser.findFirst({
      where: {
        workspaceId: label.workspaceId,
        userId: userId,
      },
    });

    if (!workspaceAccess) {
      return res.status(403).json({
        status: 403,
        message: "Access denied. You are not a member of this workspace.",
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

module.exports = {
  getWorkspaceLabels,
  createLabel,
  updateLabel,
  deleteLabel,
};
