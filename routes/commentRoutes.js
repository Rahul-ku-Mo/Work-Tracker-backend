const express = require("express");
const commentController = require("../controllers/commentController");

const router = express.Router();

router
  .route("/")
  .get(commentController.getComments)
  .post(commentController.createComment);

router
  .route("/:commentId")
  .patch(commentController.updateComment)
  .delete(commentController.deleteComment);

module.exports = router;
