const express = require("express");
const columnController = require("../controllers/columnController");
const userController = require("../controllers/userController");
const { authenticateToken } = require("../utils/validation");

const router = express.Router();

// Apply the authenticateToken middleware to all routes
router.use(authenticateToken);

//middleware to check the user exist or not!
router.use(userController.checkUserExists);

router
  .route("/")
  .get(columnController.getColumns)
  .post(columnController.createColumn);

router
  .route("/:columnId")
  .get(columnController.getColumn)
  .delete(columnController.deleteColumn)
  .patch(columnController.updateColumn);

module.exports = router;
