const express = require("express");
const router = express.Router();
const {
  getTeamLabels,
  createLabel,
  updateLabel,
  deleteLabel,
  getWorkspaceLabels,
} = require("../controllers/label.controller");
const { authenticateToken } = require("../utils/validation");

// Team label routes
router.get("/team/:teamId", authenticateToken, getTeamLabels);
router.post("/team/:teamId", authenticateToken, createLabel);
router.put("/:labelId", authenticateToken, updateLabel);
router.delete("/:labelId", authenticateToken, deleteLabel);

// Workspace label routes
router.get("/workspace/:workspaceId", authenticateToken, getWorkspaceLabels);

module.exports = router;
