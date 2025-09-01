const express = require("express");
const columnController = require("../controllers/column.controller");

const router = express.Router();

router
  .route("/:teamId/:workspaceSlug")
  .get(columnController.getColumns)
  .post(columnController.createColumn);

router.route("/ordering").patch(columnController.updateColumnsOrder);

router
  .route("/:columnId")
  .get(columnController.getColumn)
  .delete(columnController.deleteColumn)
  .patch(columnController.updateColumn);

module.exports = router;
