const express = require("express");
const commentController = require("../controllers/commentController");

const router = express.Router();

// Get all comments for a card (with nested replies)
router.get("/", commentController.getComments);

// Create a new comment or reply
router.post("/", commentController.createComment);

// Get a single comment with its replies
router.get("/:commentId", commentController.getComment);

// Update a comment's content
router.patch("/:commentId", commentController.updateComment);

// Delete a comment (and all its replies if it's a parent)
router.delete("/:commentId", commentController.deleteComment);

// Resolve a comment (Linear-style)
router.patch("/:commentId/resolve", commentController.resolveComment);

// Unresolve a comment
router.patch("/:commentId/unresolve", commentController.unresolveComment);

module.exports = router;