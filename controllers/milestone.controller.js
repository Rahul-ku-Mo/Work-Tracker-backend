const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all milestones for a project
const getProjectMilestones = async (req, res) => {
  try {
    const { projectSlug } = req.params;

    const project = await prisma.project.findUnique({
      where: { slug: projectSlug },
      select: { 
        id: true, 
        title: true, 
        milestones: true 
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Return milestones in their current format (enhanced milestone system)
    const formattedMilestones = project.milestones.map((milestone, index) => ({
      id: milestone.id || `milestone-${Date.now()}-${index}`,
      title: milestone.title || `Milestone ${index + 1}`,
      description: milestone.description || '',
      status: milestone.status || 'INCOMPLETE',
      targetDate: milestone.targetDate ? new Date(milestone.targetDate) : null,
      completedAt: milestone.completedAt ? new Date(milestone.completedAt) : null,
      notes: milestone.notes || '',
      order: milestone.order || index + 1,
    }));

    res.json({
      projectId: project.id,
      projectTitle: project.title,
      milestones: formattedMilestones
    });
  } catch (error) {
    console.error('Error fetching project milestones:', error);
    res.status(500).json({ error: 'Failed to fetch milestones' });
  }
};

// Create a new milestone for a project
const createMilestone = async (req, res) => {
  try {
    const { projectSlug } = req.params;
    const { 
      title, 
      description, 
      targetDate, 
      notes, 
      order 
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Milestone title is required' });
    }

    const project = await prisma.project.findUnique({
      where: { slug: projectSlug },
      select: { id: true, milestones: true }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const newMilestone = {
      id: `milestone-${Date.now()}`,
      title: title.trim(),
      description: description || '',
      status: 'INCOMPLETE',
      targetDate: targetDate ? new Date(targetDate) : null,
      completedAt: null,
      notes: notes || '',
      order: order || project.milestones.length + 1,
    };

    const updatedMilestones = [...project.milestones, newMilestone];

    await prisma.project.update({
      where: { id: project.id },
      data: { milestones: updatedMilestones }
    });

    res.status(201).json(newMilestone);
  } catch (error) {
    console.error('Error creating milestone:', error);
    res.status(500).json({ error: 'Failed to create milestone' });
  }
};

// Update a milestone
const updateMilestone = async (req, res) => {
  try {
    const { projectSlug, milestoneId } = req.params;
    const { 
      title, 
      description, 
      status, 
      targetDate, 
      completedAt, 
      notes, 
      order 
    } = req.body;

    const project = await prisma.project.findUnique({
      where: { slug: projectSlug },
      select: { id: true, milestones: true }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const milestoneIndex = project.milestones.findIndex(m => m.id === milestoneId);
    if (milestoneIndex === -1) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    const currentMilestone = project.milestones[milestoneIndex];
    
    // Update milestone with new format
    const updatedMilestone = {
      ...currentMilestone,
      title: title !== undefined ? title.trim() : currentMilestone.title,
      description: description !== undefined ? description : currentMilestone.description,
      status: status !== undefined ? status : currentMilestone.status,
      targetDate: targetDate !== undefined ? (targetDate ? new Date(targetDate) : null) : currentMilestone.targetDate,
      completedAt: completedAt !== undefined ? (completedAt ? new Date(completedAt) : null) : currentMilestone.completedAt,
      notes: notes !== undefined ? notes : currentMilestone.notes,
      order: order !== undefined ? order : currentMilestone.order,
    };

    const updatedMilestones = [...project.milestones];
    updatedMilestones[milestoneIndex] = updatedMilestone;

    await prisma.project.update({
      where: { id: project.id },
      data: { milestones: updatedMilestones }
    });

    res.json(updatedMilestone);
  } catch (error) {
    console.error('Error updating milestone:', error);
    res.status(500).json({ error: 'Failed to update milestone' });
  }
};

// Delete a milestone
const deleteMilestone = async (req, res) => {
  try {
    const { projectSlug, milestoneId } = req.params;

    const project = await prisma.project.findUnique({
      where: { slug: projectSlug },
      select: { id: true, milestones: true }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const milestoneIndex = project.milestones.findIndex(m => m.id === milestoneId);
    if (milestoneIndex === -1) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    const updatedMilestones = project.milestones.filter(m => m.id !== milestoneId);

    await prisma.project.update({
      where: { id: project.id },
      data: { milestones: updatedMilestones }
    });

    res.json({ message: 'Milestone deleted successfully' });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    res.status(500).json({ error: 'Failed to delete milestone' });
  }
};

// Update milestone completion status
const updateMilestoneCompletion = async (req, res) => {
  try {
    const { projectSlug, milestoneId } = req.params;
    const { isCompleted } = req.body;

    const project = await prisma.project.findUnique({
      where: { slug: projectSlug },
      select: { id: true, milestones: true }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const milestoneIndex = project.milestones.findIndex(m => m.id === milestoneId);
    if (milestoneIndex === -1) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    const currentMilestone = project.milestones[milestoneIndex];
    const updatedMilestone = {
      ...currentMilestone,
      status: isCompleted ? 'COMPLETE' : 'INCOMPLETE',
      completedAt: isCompleted ? new Date() : null,
    };

    const updatedMilestones = [...project.milestones];
    updatedMilestones[milestoneIndex] = updatedMilestone;

    await prisma.project.update({
      where: { id: project.id },
      data: { milestones: updatedMilestones }
    });

    res.json(updatedMilestone);
  } catch (error) {
    console.error('Error updating milestone completion:', error);
    res.status(500).json({ error: 'Failed to update milestone completion' });
  }
};

// Reorder milestones
const reorderMilestones = async (req, res) => {
  try {
    const { projectSlug } = req.params;
    const { milestoneIds } = req.body; // Array of milestone IDs in new order

    if (!Array.isArray(milestoneIds)) {
      return res.status(400).json({ error: 'milestoneIds must be an array' });
    }

    const project = await prisma.project.findUnique({
      where: { slug: projectSlug },
      select: { id: true, milestones: true }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Reorder milestones based on the provided order
    const reorderedMilestones = milestoneIds.map((milestoneId, index) => {
      const milestone = project.milestones.find(m => m.id === milestoneId);
      if (!milestone) {
        throw new Error(`Milestone with ID ${milestoneId} not found`);
      }
      return {
        ...milestone,
        order: index + 1,
      };
    });

    await prisma.project.update({
      where: { id: project.id },
      data: { milestones: reorderedMilestones }
    });

    res.json({ message: 'Milestones reordered successfully', milestones: reorderedMilestones });
  } catch (error) {
    console.error('Error reordering milestones:', error);
    res.status(500).json({ error: 'Failed to reorder milestones' });
  }
};

// Bulk update milestones (for batch operations)
const bulkUpdateMilestones = async (req, res) => {
  try {
    const { projectSlug } = req.params;
    const { milestones } = req.body; // Array of milestone objects

    if (!Array.isArray(milestones)) {
      return res.status(400).json({ error: 'milestones must be an array' });
    }

    const project = await prisma.project.findUnique({
      where: { slug: projectSlug },
      select: { id: true, milestones: true }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Validate and format milestones
    const formattedMilestones = milestones.map((milestone, index) => ({
      id: milestone.id || `milestone-${Date.now()}-${index}`,
      title: milestone.title || `Milestone ${index + 1}`,
      description: milestone.description || '',
      status: milestone.status || 'INCOMPLETE',
      targetDate: milestone.targetDate ? new Date(milestone.targetDate) : null,
      completedAt: milestone.completedAt ? new Date(milestone.completedAt) : null,
      notes: milestone.notes || '',
      order: milestone.order || index + 1,
    }));

    await prisma.project.update({
      where: { id: project.id },
      data: { milestones: formattedMilestones }
    });

    res.json({ message: 'Milestones updated successfully', milestones: formattedMilestones });
  } catch (error) {
    console.error('Error bulk updating milestones:', error);
    res.status(500).json({ error: 'Failed to update milestones' });
  }
};

module.exports = {
  getProjectMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  updateMilestoneCompletion,
  reorderMilestones,
  bulkUpdateMilestones,
};
