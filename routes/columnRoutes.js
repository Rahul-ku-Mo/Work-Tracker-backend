const express = require("express");
const columnController = require("../controllers/columnController");

const router = express.Router();

router
  .route("/")
  .get(columnController.getColumns)
  .post(columnController.createColumn);

router.route("/ordering").patch(columnController.updateColumnsOrder);

router
  .route("/:columnId")
  .get(columnController.getColumn)
  .delete(columnController.deleteColumn)
  .patch(columnController.updateColumn);

module.exports = router;
