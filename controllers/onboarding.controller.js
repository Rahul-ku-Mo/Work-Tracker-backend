const { prisma } = require("../db");

exports.checkOnboarding = async (req, res) => {
  const { userId  } = req.user;
  
  try {
    // Check if user is in a team (either as team member or project member)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    // Check if user has team membership
    const teamMembership = await prisma.teamMember.findFirst({
      where: { userId: userId },
      include: {
        team: true
      }
    });

    // Also check if user is a project member
    const projectMembership = await prisma.projectMember.findFirst({
      where: { userId: userId },
      include: {
        project: {
          include: {
            team: true
          }
        }
      }
    });

    const role = user.role;
    
    if (teamMembership || projectMembership) {
      // User is already in a team/project, no onboarding needed
      const team = teamMembership?.team || projectMembership?.project?.team;
      return res.status(200).json({
        status: 200,
        needsOnboarding: false,
        isAdmin: role === "ADMIN",
        team: team
      });
    }
    
    // User needs onboarding
    return res.status(200).json({
      status: 200,
      needsOnboarding: true,
      isAdmin: role === "ADMIN" 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
}; 