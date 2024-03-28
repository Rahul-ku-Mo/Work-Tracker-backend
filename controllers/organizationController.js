const { prisma } = require("../db");

exports.createOrganization = async (req, res, next) => {
  const { userId: teamLeadId } = req.user;

  const { name } = req.body;

  try {
    const organization = await prisma.organization.create({
      data: {
        name: name,
        teamLead: {
          connect: { id: teamLeadId },
        },
      },
      select: {
        name: true,
        teamLead: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdAt: true,
      },
    });

    res.status(201).json({
      status: "success",
      data: organization,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.assignMembersToOrganization = async (req, res) => {
  const { organizationId } = req.params;
  const { memberId } = req.body;

  try {
    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        members: {
          connect: { id: memberId },
        },
      },
    });

    res.status(200).json({
      status: "success",
      data: organization,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};
