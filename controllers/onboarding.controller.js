const { prisma } = require("../db");

exports.checkOnboarding = async (req, res) => {
  const { userId  } = req.user;
  
  try {
    // Check if user is in a team
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { team: true }
    });

    const role = user.role;
    
    if (user.team) {
      // User is already in a team, no onboarding needed
      return res.status(200).json({
        status: 200,
        needsOnboarding: false,
        isAdmin: role === "ADMIN",
        team: user.team
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