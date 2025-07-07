const { prisma } = require("../db");

exports.getColumns = async (req, res) => {
  const { workspaceId } = req.query; // Assuming we're passing the workspaceId as a query parameter

  try {
    const columns = await prisma.column.findMany({
      where: { workspaceId: parseInt(workspaceId) },
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
    res.status(500).json({ message: error.message });
  }
};

exports.createColumn = async (req, res) => {
  const { workspaceId } = req.query;
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: parseInt(workspaceId) },
    });

    if (!workspace) {
      return res.status(404).json({
        status: 404,
        message: "Workspace not found",
      });
    }

    const { title } = req.body;

    const lastColumn = await prisma.column.findFirst({
      where: { workspaceId: parseInt(workspaceId) },
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
          connect: { id: parseInt(workspaceId) },
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
      updatedData,
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
