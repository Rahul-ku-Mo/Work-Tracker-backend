const { prisma } = require("../db");

/**
 * Permission utility functions for checking user access across the application
 */

/**
 * Check if user is a team admin
 */
async function isTeamAdmin(userId, teamId) {
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      userId,
      teamId,
      role: 'ADMIN'
    }
  });
  return !!teamMember;
}

/**
 * Check if user has access to a project
 */
async function hasProjectAccess(userId, projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { 
      leadId: true,
      teamId: true 
    }
  });

  if (!project) return false;

  // Check if user is project admin
  if (project.leadId === userId) return true;

  // Check if user is a project member
  const projectMember = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId
    }
  });

  if (projectMember) return true;

  // Check if user is team admin
  return await isTeamAdmin(userId, project.teamId);
}

/**
 * Check if user can modify a project
 */
async function canModifyProject(userId, projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { 
      leadId: true,
      teamId: true 
    }
  });

  if (!project) return false;

  // Project admin can modify
  if (project.leadId === userId) return true;

  // Team admin can modify
  return await isTeamAdmin(userId, project.teamId);
}

/**
 * Check if user has access to a workspace
 */
async function hasWorkspaceAccess(userId, workspaceId) {
  const workspaceUser = await prisma.workspaceUser.findFirst({
    where: {
      workspaceId,
      userId
    }
  });

  return !!workspaceUser;
}

/**
 * Check if user can modify a workspace
 */
async function canModifyWorkspace(userId, workspaceId) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        where: { userId },
        select: { role: true }
      },
      project: {
        select: { 
          teamId: true,
          leadId: true 
        }
      }
    }
  });

  if (!workspace) return false;

  // Workspace admin can modify
  const workspaceRole = workspace.members[0]?.role;
  if (workspaceRole === 'ADMIN') return true;

  // Project admin can modify
  if (workspace.project.leadId === userId) return true;

  // Team admin can modify
  return await isTeamAdmin(userId, workspace.project.teamId);
}

/**
 * Get user's role in a project
 */
async function getUserProjectRole(userId, projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { 
      leadId: true,
      teamId: true 
    }
  });

  if (!project) return null;

  // Check if team admin
  if (await isTeamAdmin(userId, project.teamId)) {
    return 'ADMIN';
  }

  // Check if project admin
  if (project.leadId === userId) {
    return 'ADMIN';
  }

  // Check if project member
  const projectMember = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId
    },
    select: { role: true }
  });

  return projectMember?.role || null;
}

/**
 * Get user's role in a workspace
 */
async function getUserWorkspaceRole(userId, workspaceId) {
  const workspaceUser = await prisma.workspaceUser.findFirst({
    where: {
      workspaceId,
      userId
    },
    select: { role: true }
  });

  return workspaceUser?.role || null;
}

/**
 * Filter projects that user has access to
 */
async function filterAccessibleProjects(userId, projects) {
  const accessibleProjects = [];

  for (const project of projects) {
    if (await hasProjectAccess(userId, project.id)) {
      accessibleProjects.push(project);
    }
  }

  return accessibleProjects;
}

module.exports = {
  isTeamAdmin,
  hasProjectAccess,
  canModifyProject,
  hasWorkspaceAccess,
  canModifyWorkspace,
  getUserProjectRole,
  getUserWorkspaceRole,
  filterAccessibleProjects
};

