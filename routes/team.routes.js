const express = require("express");
const teamController = require("../controllers/team.controller");
const { authenticateToken } = require("../utils/validation");

const router = express.Router();

// Public routes (no authentication required)
router.get("/validate-code/:code", teamController.validateInviteCode);

// Protected routes (authentication required)
router.use(authenticateToken);

router
  .route("/")
  .get(teamController.getTeam)
  .post(teamController.createTeam);

router.post("/invite", teamController.inviteMember);
router.post("/join", teamController.joinTeam);
router.get("/members", teamController.getTeamMembers);

module.exports = router; 