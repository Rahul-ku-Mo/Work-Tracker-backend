const { prisma } = require("../db");

// Rate limiting for pause/resume actions
const RATE_LIMIT = {
  MAX_STATE_CHANGES: 10, // Maximum state changes per hour
  WINDOW_MS: 60 * 60 * 1000, // 1 hour window
};

// Helper function to check rate limits
const checkRateLimit = async (userId, action) => {
  const oneHourAgo = new Date(Date.now() - RATE_LIMIT.WINDOW_MS);
  
  const recentActions = await prisma.timeEntry.count({
    where: {
      userId,
      updatedAt: {
        gte: oneHourAgo,
      },
      // Count pause/resume actions (not start/stop)
      OR: [
        { isPaused: true },
        { isPaused: false, endTime: null },
      ],
    },
  });

  if (recentActions >= RATE_LIMIT.MAX_STATE_CHANGES) {
    throw new Error(`Rate limit exceeded. Maximum ${RATE_LIMIT.MAX_STATE_CHANGES} pause/resume actions per hour.`);
  }
};

// Start a new time entry
const startTimeEntry = async (req, res) => {
  const { cardId } = req.body;
  const { userId } = req.user;
  
  try {
    // Check if there's already an active time entry for this user
    const activeEntry = await prisma.timeEntry.findFirst({
      where: {
        userId,
        endTime: null,
      },
    });

    if (activeEntry) {
      return res.status(400).json({
        status: 400,
        message: "You already have an active time entry. Please stop or pause it first.",
      });
    }

    // Create new time entry - simplified without segments
    const timeEntry = await prisma.timeEntry.create({
      data: {
        userId,
        cardId,
        startTime: new Date(),
        lastResumeTime: new Date(), // Track when current session started
        isPaused: false,
        totalDuration: 0,
      },
    });

    return res.status(201).json({
      status: 201,
      message: "Time entry started successfully",
      data: timeEntry,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 500,
      message: "Failed to start time entry",
      error: error.message,
    });
  }
};

// Pause current time entry
const pauseTimeEntry = async (req, res) => {
  const { timeEntryId } = req.params;
  const { userId } = req.user;

  try {
    // Check rate limit for pause actions
    await checkRateLimit(userId, 'pause');

    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
    });

    if (!timeEntry) {
      return res.status(404).json({
        status: 404,
        message: "Time entry not found",
      });
    }

    if (timeEntry.userId !== userId) {
      return res.status(403).json({
        status: 403,
        message: "Not authorized to modify this time entry",
      });
    }

    if (timeEntry.isPaused) {
      return res.status(400).json({
        status: 400,
        message: "Time entry is already paused",
      });
    }

    // Calculate elapsed time since last resume
    const now = new Date();
    const elapsedSeconds = Math.floor((now - new Date(timeEntry.lastResumeTime)) / 1000);

    // Update time entry with accumulated time
    const updatedEntry = await prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: {
        isPaused: true,
        totalDuration: timeEntry.totalDuration + elapsedSeconds,
        lastResumeTime: null, // Clear resume time when paused
      },
    });

    return res.status(200).json({
      status: 200,
      message: "Time entry paused successfully",
      data: updatedEntry,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 500,
      message: error.message.includes('Rate limit') ? error.message : "Failed to pause time entry",
      error: error.message,
    });
  }
};

// Resume a paused time entry
const resumeTimeEntry = async (req, res) => {
  const { timeEntryId } = req.params;
  const { userId } = req.user;

  try {
    // Check rate limit for resume actions
    await checkRateLimit(userId, 'resume');

    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
    });

    if (!timeEntry) {
      return res.status(404).json({
        status: 404,
        message: "Time entry not found",
      });
    }

    if (timeEntry.userId !== userId) {
      return res.status(403).json({
        status: 403,
        message: "Not authorized to modify this time entry",
      });
    }

    if (!timeEntry.isPaused) {
      return res.status(400).json({
        status: 400,
        message: "Time entry is not paused",
      });
    }

    // Simply update resume time and unpause - no new records created
    const updatedEntry = await prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: {
        isPaused: false,
        lastResumeTime: new Date(), // Track when this session started
      },
    });

    return res.status(200).json({
      status: 200,
      message: "Time entry resumed successfully",
      data: updatedEntry,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 500,
      message: error.message.includes('Rate limit') ? error.message : "Failed to resume time entry",
      error: error.message,
    });
  }
};

// Stop time entry
const stopTimeEntry = async (req, res) => {
  const { timeEntryId } = req.params;
  const { userId } = req.user;

  try {
    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
    });

    if (!timeEntry) {
      return res.status(404).json({
        status: 404,
        message: "Time entry not found",
      });
    }

    if (timeEntry.userId !== userId) {
      return res.status(403).json({
        status: 403,
        message: "Not authorized to modify this time entry",
      });
    }

    if (timeEntry.endTime) {
      return res.status(400).json({
        status: 400,
        message: "Time entry is already stopped",
      });
    }

    const now = new Date();
    let finalDuration = timeEntry.totalDuration;

    // If not paused, add elapsed time from current session
    if (!timeEntry.isPaused && timeEntry.lastResumeTime) {
      const elapsedSeconds = Math.floor((now - new Date(timeEntry.lastResumeTime)) / 1000);
      finalDuration += elapsedSeconds;
    }

    // Enforce minimum 2-minute duration (120 seconds)
    const MINIMUM_DURATION = 120; // 2 minutes in seconds
    if (finalDuration < MINIMUM_DURATION) {
      const remainingSeconds = MINIMUM_DURATION - finalDuration;
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      
      return res.status(400).json({
        status: 400,
        message: `Minimum tracking time is 2 minutes. Please track for ${remainingMinutes} more minute${remainingMinutes > 1 ? 's' : ''} before stopping.`,
        data: {
          currentDuration: finalDuration,
          minimumRequired: MINIMUM_DURATION,
          remainingSeconds: remainingSeconds
        }
      });
    }

    // Update time entry with final values
    const updatedEntry = await prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: {
        endTime: now,
        totalDuration: finalDuration,
        lastResumeTime: null, // Clear resume time when stopped
      },
    });

    return res.status(200).json({
      status: 200,
      message: "Time entry stopped successfully",
      data: updatedEntry,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 500,
      message: "Failed to stop time entry",
      error: error.message,
    });
  }
};

// Get time entry for user
const getTimeEntries = async (req, res) => {
  const { userId } = req.user;
  const { cardId } = req.query;
  
  try {
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        userId,
        cardId: Number(cardId),
      },
      include: {
        card: {
          select: {
            title: true,
            description: true,
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    return res.status(200).json({
      status: 200,
      message: "Time entries retrieved successfully",
      data: timeEntries,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 500,
      message: "Failed to get time entries",
      error: error.message,
    });
  }
};

// Get current active time entry for user
const getCurrentActiveTimeEntry = async (req, res) => {
  const { userId } = req.user;
  
  try {
    const activeEntry = await prisma.timeEntry.findFirst({
      where: {
        userId,
        endTime: null,
      },
      include: {
        card: {
          select: {
            title: true,
            description: true,
          },
        },
      },
    });

    return res.status(200).json({
      status: 200,
      message: activeEntry ? "Active time entry found" : "No active time entry",
      data: activeEntry,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 500,
      message: "Failed to get active time entry",
      error: error.message,
    });
  }
};

module.exports = {
  startTimeEntry,
  pauseTimeEntry,
  resumeTimeEntry,
  stopTimeEntry,
  getTimeEntries,
  getCurrentActiveTimeEntry,
}; 