const express = require("express");
const commentController = require("../controllers/commentController");
const userController = require("../controllers/userController");
const { authenticateToken } = require("../utils/validation");

const router = express.Router();

// Apply the authenticateToken middleware to all routes
router.use(authenticateToken);

//middleware to check the user exist or not!
router.use(userController.checkUserExists);

router
  .route("/")
  .get(commentController.getComments)
  .post(commentController.createComment);

router
  .route("/:commentId")
  .patch(commentController.updateComment)
  .delete(commentController.deleteComment);

module.exports = router;
