const express = require("express");
const router = express.Router();
const {
  getWorkspaceLabels,
  createLabel,
  updateLabel,
  deleteLabel,
} = require("../controllers/label.controller");
const { authenticateToken } = require("../utils/validation");

// Workspace label routes
router.get("/workspace/:workspaceId", authenticateToken, getWorkspaceLabels);
router.post("/workspace/:workspaceId", authenticateToken, createLabel);
router.put("/:labelId", authenticateToken, updateLabel);
router.delete("/:labelId", authenticateToken, deleteLabel);

module.exports = router;
