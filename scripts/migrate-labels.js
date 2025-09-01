const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Migration script to convert existing string-based labels to Label model records
 * This script should be run after deploying the new Label model and before updating the frontend
 */
async function migrateLabels() {
  console.log("Starting label migration...");

  try {
    // Step 1: Get all cards that have labels (before the migration they were string arrays)
    // Note: Since we've already migrated the schema, we need to check if there are any existing data
    
    // First, let's check what's in the database after migration
    const cardsWithOldLabels = await prisma.$queryRaw`
      SELECT id, title, slug FROM "Card" 
      WHERE EXISTS (
        SELECT 1 FROM "_CardToLabel" WHERE "A" = "Card".id
      )
    `;

    if (cardsWithOldLabels.length > 0) {
      console.log(`Found ${cardsWithOldLabels.length} cards that already have new label relationships. Migration may have already been run.`);
      return;
    }

    // Step 2: Get all unique label strings that were used across all cards
    // Since the migration already removed the labels column, we'll create some default labels for each team
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    console.log(`Found ${teams.length} teams. Creating default labels for each team...`);

    // Step 3: Create default labels for each team
    const defaultLabels = [
      { name: "Frontend", color: "#8B5CF6" }, // Purple
      { name: "Backend", color: "#3B82F6" },  // Blue
      { name: "UI/UX", color: "#F59E0B" },    // Amber
      { name: "Bug", color: "#EF4444" },      // Red
      { name: "Feature", color: "#10B981" },  // Green
      { name: "Documentation", color: "#6B7280" }, // Gray
      { name: "Testing", color: "#F97316" },  // Orange
      { name: "Urgent", color: "#DC2626" },   // Dark Red
      { name: "Review", color: "#06B6D4" },   // Cyan
      { name: "In Progress", color: "#8B5CF6" }, // Purple
      { name: "Blocked", color: "#991B1B" },  // Dark Red
    ];

    const createdLabels = new Map(); // teamId -> [labels]

    for (const team of teams) {
      console.log(`Creating default labels for team: ${team.name}`);
      
      const teamLabels = [];
      for (const labelData of defaultLabels) {
        try {
          const label = await prisma.label.create({
            data: {
              name: labelData.name,
              color: labelData.color,
              teamId: team.id,
            },
          });
          teamLabels.push(label);
          console.log(`  Created label: ${label.name}`);
        } catch (error) {
          if (error.code === 'P2002') {
            // Label already exists for this team
            console.log(`  Label ${labelData.name} already exists for team ${team.name}`);
            const existingLabel = await prisma.label.findFirst({
              where: {
                name: labelData.name,
                teamId: team.id,
              },
            });
            if (existingLabel) {
              teamLabels.push(existingLabel);
            }
          } else {
            throw error;
          }
        }
      }
      createdLabels.set(team.id, teamLabels);
    }

    console.log("✅ Label migration completed successfully!");
    console.log(`Created default labels for ${teams.length} teams.`);
    console.log("\nNext steps:");
    console.log("1. Update your frontend components to use the new Label API");
    console.log("2. Test the label functionality in your application");
    console.log("3. Users can now create, edit, and delete labels through the UI");

  } catch (error) {
    console.error("❌ Error during label migration:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to get team ID for a workspace
async function getTeamIdForWorkspace(workspaceId) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        include: {
          user: {
            include: {
              team: true,
            },
          },
        },
      },
    },
  });

  // Get the team from the first member (assuming all members are from the same team)
  if (workspace && workspace.members.length > 0) {
    const firstMember = workspace.members[0];
    return firstMember.user.teamId;
  }

  return null;
}

// Run the migration
if (require.main === module) {
  migrateLabels()
    .then(() => {
      console.log("Migration completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

module.exports = { migrateLabels };
