const { prisma } = require("../db");

// Helper function to resolve workspace identifier to workspace ID
const resolveWorkspaceId = async (workspaceIdentifier) => {
  const isNumeric = /^\d+$/.test(workspaceIdentifier);
  
  if (isNumeric) {
    return parseInt(workspaceIdentifier);
  }
  
  // If it's a slug, find the workspace by slug and return its ID
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceIdentifier },
    select: { id: true }
  });
  
  if (!workspace) {
    throw new Error("Workspace not found");
  }
  
  return workspace.id;
};

exports.getColumns = async (req, res) => {
  const { workspaceId } = req.query;
  const { teamId, slug } = req.params;

  // Support both new teamId + slug pattern and legacy workspaceId query parameter
  let resolvedWorkspaceId;
  
  if (teamId && slug) {
    // New pattern: teamId + slug from URL params
    try {
      const workspace = await prisma.workspace.findFirst({
        where: { 
          slug: slug,
          user: {
            teamId: teamId
          }
        },
        select: { id: true }
      });
      
      if (!workspace) {
        return res.status(404).json({
          status: 404,
          message: "Workspace not found",
        });
      }
      
      resolvedWorkspaceId = workspace.id;
    } catch (error) {
      console.log(error);
      return res.status(500).json({ 
        status: 500, 
        message: "Internal Server Error" 
      });
    }
  } else if (workspaceId) {
    // Legacy pattern: workspaceId from query parameter
    try {
      resolvedWorkspaceId = await resolveWorkspaceId(workspaceId);
    } catch (error) {
      console.log(error);
      if (error.message === "Workspace not found") {
        return res.status(404).json({ 
          status: 404, 
          message: "Workspace not found" 
        });
      } else {
        return res.status(500).json({ 
          status: 500, 
          message: error.message 
        });
      }
    }
  } else {
    return res.status(400).json({
      status: 400,
      message: "Either workspaceId query parameter or teamId and slug path parameters are required",
    });
  }

  try {
    const columns = await prisma.column.findMany({
      where: { workspaceId: resolvedWorkspaceId },
      include: {
        cards: {
          include: {
            assignees: true,
          }
        }
      },
    });

    res.status(200).json({
      status: 200,
      message: "Success",
      data: columns,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ 
      status: 500, 
      message: "Internal Server Error" 
    });
  }
};

exports.createColumn = async (req, res) => {
  const { workspaceId } = req.query;
  const { teamId, slug } = req.params;
  
  // Support both new teamId + slug pattern and legacy workspaceId query parameter
  let resolvedWorkspaceId;
  
  if (teamId && slug) {
    // New pattern: teamId + slug from URL params
    try {
      const workspace = await prisma.workspace.findFirst({
        where: { 
          slug: slug,
          user: {
            teamId: teamId
          }
        },
        select: { id: true }
      });
      
      if (!workspace) {
        return res.status(404).json({
          status: 404,
          message: "Workspace not found",
        });
      }
      
      resolvedWorkspaceId = workspace.id;
    } catch (error) {
      console.log(error);
      return res.status(500).json({ 
        status: 500, 
        message: "Internal Server Error" 
      });
    }
  } else if (workspaceId) {
    // Legacy pattern: workspaceId from query parameter
    try {
      resolvedWorkspaceId = await resolveWorkspaceId(workspaceId);
    } catch (error) {
      console.log(error);
      if (error.message === "Workspace not found") {
        return res.status(404).json({ 
          status: 404, 
          message: "Workspace not found" 
        });
      } else {
        return res.status(500).json({ 
          status: 500, 
          message: error.message 
        });
      }
    }
  } else {
    return res.status(400).json({
      status: 400,
      message: "Either workspaceId query parameter or teamId and slug path parameters are required",
    });
  }

  try {
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        status: 400,
        message: "Column title is required",
      });
    }

    const lastColumn = await prisma.column.findFirst({
      where: { workspaceId: resolvedWorkspaceId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    // If a column was found, increment its order value for the new column.
    // If no column was found, start the ordering at 1.
    const newOrder = lastColumn ? lastColumn.order + 1 : 1;

    const column = await prisma.column.create({
      data: {
        title,
        order: newOrder,
        workspace: {
          connect: { id: resolvedWorkspaceId },
        },
      },
    });

    res.status(201).json({
      status: 201,
      message: "Success",
      data: column,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ 
      status: 500,
      message: err.message || "Failed to create column" 
    });
  }
};

exports.getColumn = async (req, res) => {
  const { columnId } = req.params;

  if (!columnId) {
    return res.status(400).json({
      status: 400,
      message: "columnId is required",
    });
  }

  try {
    const column = await prisma.column.findUnique({
      where: { id: parseInt(columnId) },
      include: {
        cards: {
          include: {
            assignees: true,
          }
        }
      },
    });

    res.status(200).json({
      status: 200,
      message: "Success",
      data: column,
    });
  } catch (error) {
    console.log(error);
  }
};

exports.updateColumn = async (req, res) => {
  const { columnId } = req.params;
  const { title, newOrder } = req.body;

  try {
    const updatedData = {};

    if (title !== undefined) updatedData.title = title;
    if (newOrder !== undefined) updatedData.order = newOrder;

    const column = await prisma.column.update({
      where: { id: parseInt(columnId) },
      data: updatedData,
      include: {
        cards: true,
      },
    });

    res.status(201).json({
      status: 201,
      message: "Success",
      data: column,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

exports.deleteColumn = async (req, res) => {
  const { columnId } = req.params;
  try {
    await prisma.column.delete({
      where: {
        id: parseInt(columnId),
      },
    });
    res.status(204).json({
      status: 204,
      message: "Success",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

exports.updateColumnsOrder = async (req, res) => {
  const { columns } = req.body;

  const transaction = prisma.$transaction(
    columns.map((column) => {
      return prisma.column.update({
        where: { id: column.id },
        data: {
          order: column.order,
        },
      });
    })
  );

  try {
    await transaction;
    res.status(200).json({ message: "Columns order updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update columns order" });
  }
};
