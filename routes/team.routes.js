const express = require("express");
const router = express.Router();
const teamController = require("../controllers/team.controller");

// Create a new team (admin only)
router.post("/", teamController.createTeam);

// Get current user's team
router.get("/", teamController.getTeam);

// Invite a member to team (admin only)
router.post("/invite", teamController.inviteMember);

// Join a team using a join code
router.post("/join", teamController.joinTeam);

// Get all team members
router.get("/member", teamController.getTeamMembers);

module.exports = router; 