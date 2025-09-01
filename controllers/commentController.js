const { prisma } = require("../db");

/**
 * Get all comments for a card with nested replies
 */
exports.getComments = async (req, res) => {
  const { cardId } = req.query;
  try {
    // Get only top-level comments (parentCommentId is null) with their replies
    const comments = await prisma.comment.findMany({
      where: {
        cardId: parseInt(cardId),
        parentCommentId: null, // Only top-level comments
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
            username: true,
          },
        },
        resolvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
            username: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                imageUrl: true,
                username: true,
              },
            },
            resolvedBy: {
              select: {
                id: true,
                name: true,
                email: true,
                imageUrl: true,
                username: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
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

/**
 * Create a new comment or reply
 */
exports.createComment = async (req, res) => {
  const { cardId } = req.query;
  const { userId } = req.user;
  const { content, parentCommentId } = req.body;

  try {
    // If parentCommentId is provided, verify it exists and is not already a reply
    if (parentCommentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parseInt(parentCommentId) },
        select: { parentCommentId: true },
      });

      if (!parentComment) {
        return res.status(404).json({ 
          message: "Parent comment not found" 
        });
      }

      // Prevent nesting beyond one level (replies cannot have replies)
      if (parentComment.parentCommentId !== null) {
        return res.status(400).json({ 
          message: "Cannot reply to a reply. Only one level of nesting allowed." 
        });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        cardId: parseInt(cardId),
        userId,
        parentCommentId: parentCommentId ? parseInt(parentCommentId) : null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
            username: true,
          },
        },
        resolvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
            username: true,
          },
        },
      },
    });

    // Send comment notification
    const notificationController = require("./notification.controller");
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

/**
 * Update a comment's content
 */
exports.updateComment = async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;
  const { userId } = req.user;

  try {
    // First check if the comment exists and belongs to the user
    const existingComment = await prisma.comment.findUnique({
      where: { id: parseInt(commentId) },
      select: { userId: true },
    });

    if (!existingComment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (existingComment.userId !== userId) {
      return res.status(403).json({ 
        message: "You can only edit your own comments" 
      });
    }

    const updatedComment = await prisma.comment.update({
      where: { id: parseInt(commentId) },
      data: { content },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
            username: true,
          },
        },
        resolvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
            username: true,
          },
        },
      },
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

/**
 * Delete a comment (and all its replies if it's a parent comment)
 */
exports.deleteComment = async (req, res) => {
  const { commentId } = req.params;
  const { userId } = req.user;

  try {
    // First check if the comment exists and belongs to the user
    const existingComment = await prisma.comment.findUnique({
      where: { id: parseInt(commentId) },
      select: { userId: true },
    });

    if (!existingComment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (existingComment.userId !== userId) {
      return res.status(403).json({ 
        message: "You can only delete your own comments" 
      });
    }

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

/**
 * Resolve a comment (Linear-style)
 */
exports.resolveComment = async (req, res) => {
  const { commentId } = req.params;
  const { userId } = req.user;

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: parseInt(commentId) },
      select: { isResolved: true, parentCommentId: true },
    });

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.isResolved) {
      return res.status(400).json({ 
        message: "Comment is already resolved" 
      });
    }

    const updatedComment = await prisma.comment.update({
      where: { id: parseInt(commentId) },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedById: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
            username: true,
          },
        },
        resolvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
            username: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                imageUrl: true,
                username: true,
              },
            },
            resolvedBy: {
              select: {
                id: true,
                name: true,
                email: true,
                imageUrl: true,
                username: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      status: 200,
      message: "Comment resolved successfully",
      data: updatedComment,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Unresolve a comment
 */
exports.unresolveComment = async (req, res) => {
  const { commentId } = req.params;

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: parseInt(commentId) },
      select: { isResolved: true },
    });

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (!comment.isResolved) {
      return res.status(400).json({ 
        message: "Comment is not resolved" 
      });
    }

    const updatedComment = await prisma.comment.update({
      where: { id: parseInt(commentId) },
      data: {
        isResolved: false,
        resolvedAt: null,
        resolvedById: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
            username: true,
          },
        },
        resolvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
            username: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                imageUrl: true,
                username: true,
              },
            },
            resolvedBy: {
              select: {
                id: true,
                name: true,
                email: true,
                imageUrl: true,
                username: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      status: 200,
      message: "Comment unresolved successfully",
      data: updatedComment,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get a single comment with its replies
 */
exports.getComment = async (req, res) => {
  const { commentId } = req.params;

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: parseInt(commentId) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
            username: true,
          },
        },
        resolvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
            username: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                imageUrl: true,
                username: true,
              },
            },
            resolvedBy: {
              select: {
                id: true,
                name: true,
                email: true,
                imageUrl: true,
                username: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    res.status(200).json({
      status: 200,
      message: "Success",
      data: comment,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};