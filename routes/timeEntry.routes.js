const express = require("express");
const router = express.Router();
const timeEntryController = require("../controllers/timeEntry.controller");
const { requireFeature } = require("../middleware/featureGating");

// All time tracking features require pro+ subscription
router.use(requireFeature('timeTracking'));

// Start a new time entry
router.post("/start", timeEntryController.startTimeEntry);

// Pause a time entry
router.post("/:timeEntryId/pause", timeEntryController.pauseTimeEntry);

// Resume a time entry
router.post("/:timeEntryId/resume", timeEntryController.resumeTimeEntry);

// Stop a time entry
router.post("/:timeEntryId/stop", timeEntryController.stopTimeEntry);

// Get time entries
router.get("/", timeEntryController.getTimeEntries);

router.get("/current-active", timeEntryController.getCurrentActiveTimeEntry);

module.exports = router; 