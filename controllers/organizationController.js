const { prisma } = require("../db");

exports.createOrganization = async (req, res, next) => {
  const { userId: teamLeadId } = req.user;
  const { name } = req.body;

  // Check if the user exists
  const user = await prisma.user.findUnique({ where: { id: teamLeadId } });
  if (!user) {
    return res.status(400).json({
      status: "error",
      message: "User not found",
    });
  }

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
            role: true,
            company: true,
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
      select: {
        id: true,
        name: true,
        teamLead: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            role: true,
          },
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            role: true,
          },
        },
        createdAt: true,
        updatedAt: true,
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

exports.getOrganization = async (req, res) => {
  const { organizationId } = req.params;

  try {
    const organization = await prisma.organization.findFirst({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        teamLead: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            role: true,
          },
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            role: true,
          },
        },
        boards: true,
        createdAt: true,
        updatedAt: true,
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

exports.getOrganizationsByMember = async (req, res) => {
  const { userId } = req.user;
  try {
    const organizations = await prisma.organization.findMany({
      where: {
        members: {
          some: {
            id: userId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        teamLead: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            role: true,
          },
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            role: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      status: "success",
      data: organizations,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};
exports.getOrganizationsByLead = async (req, res) => {
  const { userId } = req.user;
  try {
    const organizations = await prisma.organization.findMany({
      where: {
        teamLeadId: userId,
      },
      select: {
        id: true,
        name: true,
        teamLead: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            role: true,
          },
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            role: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      status: "success",
      data: organizations,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};
