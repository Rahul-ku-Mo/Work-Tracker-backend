const express = require("express");
const labelController = require("../controllers/labelController");
const userController = require("../controllers/userController");
const { authenticateToken } = require("../utils/validation");

const router = express.Router();

// Apply the authenticateToken middleware to all routes
router.use(authenticateToken);

//middleware to check the user exist or not!
router.use(userController.checkUserExists);

router
  .route("/")
  .get(labelController.getLabels)
  .post(labelController.createLabel);

router
  .route("/:labelId")
  .delete(labelController.deleteLabel);

module.exports = router;
