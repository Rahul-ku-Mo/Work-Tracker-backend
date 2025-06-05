const { prisma } = require("../db");

exports.getComments = async (req, res) => {
  const { cardId } = req.query;
  try {
    const comments = await prisma.comment.findMany({
      where: {
        cardId: parseInt(cardId),
      },
    });
    res.status(200).json({
      status: 200,
      message: "Success",
      data: comments,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

exports.createComment = async (req, res) => {
  const { cardId } = req.query;

  const { userId } = req.user;

  const { content } = req.body;

  try {
    const comment = await prisma.comment.create({
      data: {
        content,
        card: {
          connect: { id: parseInt(cardId) },
        },
        user: {
          connect: { id: userId },
        },
      },
    });

    // Send comment notification
    const notificationController = require("./notificationController");
    await notificationController.notifyCardComment(
      parseInt(cardId),
      userId,
      content
    );

    res.status(201).json({
      status: 201,
      message: "Success",
      data: comment,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

exports.deleteComment = async (req, res) => {
  const { commentId } = req.params;
  try {
    await prisma.comment.delete({
      where: {
        id: parseInt(commentId),
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

exports.updateComment = async (req, res) => {
  const { commentId } = req.params;
  const { comment } = req.body;

  try {
    const updatedComment = await prisma.comment.update({
      where: { id: parseInt(commentId) },
      data: { comment },
    });

    res.status(200).json({
      status: 200,
      message: "Comment updated successfully",
      data: updatedComment,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
