const { prisma } = require("../db");

exports.createLabel = async (req, res) => {
  const { cardId } = req.query;
  const { name, color } = req.body;

  try {
    const label = await prisma.label.create({
      data: {
        name: name,
        color: color,
        card: {
          connect: {
            id: parseInt(cardId),
          },
        },
      },
    });

    res.status(201).json({
      status: 201,
      message: "Success",
      data: label,
    });
  } catch (err) {
    res.status(500).json({
      status: 500,
      message: err.message,
    });
  }
};

exports.getLabels = async (req, res) => {
  const { cardId } = req.query;

  try {
    const labels = await prisma.label.findMany({
      where: {
        cardId: parseInt(cardId),
      },
    });

    res.status(200).json({
      status: 200,
      message: "Success",
      data: labels,
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: error.message,
    });
  }
};

exports.deleteLabel = async (req, res) => {
  const { labelId } = req.params;

  try {
    const label = await prisma.label.delete({
      where: {
        id: parseInt(labelId),
      },
    });

    res.status(204).json({
      status: 204,
      message: "Success",
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: error.message,
    });
  }
};
