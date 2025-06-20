const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Default categories to be created for new users
const DEFAULT_CATEGORIES = [
  { name: "Plan", slug: "plan", hoverColor: "hover:text-blue-600", isDefault: true },
  { name: "Schedule", slug: "schedule", hoverColor: "hover:text-emerald-600", isDefault: true },
  { name: "Meeting", slug: "meeting", hoverColor: "hover:text-yellow-600", isDefault: true },
  { name: "Documents", slug: "documents", hoverColor: "hover:text-red-600", isDefault: true },
];

// ========== CATEGORY CONTROLLERS ==========

// Get all categories for a user
const getCategories = async (req, res) => {
  try {
    console.log("User from request:", req.user);
    const userId = req.user?.userId || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    let categories = await prisma.noteCategory.findMany({
      where: { userId },
      include: {
        notes: {
          select: {
            id: true,
            title: true,
            content: true,
            icon: true,
            iconColor: true,
            isCompleted: true,
            isPublic: true,
            priority: true,
            emoji: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [
        { isDefault: 'desc' }, // Default categories first
        { createdAt: 'asc' },
      ],
    });

    // If user has no categories, create default ones
    if (categories.length === 0) {
      const createdCategories = await Promise.all(
        DEFAULT_CATEGORIES.map(category =>
          prisma.noteCategory.create({
            data: {
              ...category,
              userId,
            },
            include: {
              notes: true,
            },
          })
        )
      );
      categories = createdCategories;
    }

    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
};

// Create a new category
const createCategory = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { name, hoverColor = "hover:text-purple-600" } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Check if category with this slug already exists for this user
    const existingCategory = await prisma.noteCategory.findFirst({
      where: {
        userId,
        slug,
      },
    });

    if (existingCategory) {
      return res.status(400).json({ error: "A category with this name already exists" });
    }

    const category = await prisma.noteCategory.create({
      data: {
        name: name.trim(),
        slug,
        hoverColor,
        userId,
      },
      include: {
        notes: true,
      },
    });

    res.status(201).json(category);
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ error: "Failed to create category" });
  }
};

// Update a category
const updateCategory = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;
    const { name, hoverColor } = req.body;

    // Check if category exists and belongs to user
    const existingCategory = await prisma.noteCategory.findFirst({
      where: { id, userId },
    });

    if (!existingCategory) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Allow updating all categories including default ones

    const updateData = {};
    if (name && name.trim()) {
      updateData.name = name.trim();
      updateData.slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
    if (hoverColor) {
      updateData.hoverColor = hoverColor;
    }

    const category = await prisma.noteCategory.update({
      where: { id },
      data: updateData,
      include: {
        notes: true,
      },
    });

    res.json(category);
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ error: "Failed to update category" });
  }
};

// Delete a category
const deleteCategory = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;

    // Check if category exists and belongs to user
    const existingCategory = await prisma.noteCategory.findFirst({
      where: { id, userId },
      include: { notes: true },
    });

    if (!existingCategory) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Allow deleting all categories including default ones

    // Delete the category (notes will be cascade deleted)
    await prisma.noteCategory.delete({
      where: { id },
    });

    res.json({ 
      message: "Category deleted successfully",
      deletedNotesCount: existingCategory.notes.length,
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: "Failed to delete category" });
  }
};

// ========== NOTES CONTROLLERS ==========

// Get notes by category
const getNotesByCategory = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { slug } = req.params;

    const category = await prisma.noteCategory.findFirst({
      where: {
        userId,
        slug: slug,
      },
      include: {
        notes: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json(category.notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
};

// Create a new note
const createNote = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { categoryId, title, content, icon = "FileText", iconColor, priority, isPublic = false, emoji } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Note title is required" });
    }

    // Verify category belongs to user
    const category = await prisma.noteCategory.findFirst({
      where: { id: categoryId, userId },
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    const note = await prisma.note.create({
      data: {
        title: title.trim(),
        content: content || "",
        categoryId,
        userId,
        icon,
        iconColor: iconColor || `rgb(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)})`,
        priority,
        isPublic,
        emoji,
      },
    });

    res.status(201).json(note);
  } catch (error) {
    console.error("Error creating note:", error);
    res.status(500).json({ error: "Failed to create note" });
  }
};

// Update a note
const updateNote = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;
    const { title, content, icon, iconColor, isCompleted, isPublic, priority, tags, emoji } = req.body;

    // Check if note exists and belongs to user
    const existingNote = await prisma.note.findFirst({
      where: { id, userId },
    });

    if (!existingNote) {
      return res.status(404).json({ error: "Note not found" });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content;
    if (icon !== undefined) updateData.icon = icon;
    if (iconColor !== undefined) updateData.iconColor = iconColor;
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (priority !== undefined) updateData.priority = priority;
    if (tags !== undefined) updateData.tags = tags;
    if (emoji !== undefined) updateData.emoji = emoji;

    const note = await prisma.note.update({
      where: { id },
      data: updateData,
    });

    res.json(note);
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).json({ error: "Failed to update note" });
  }
};

// Delete a note
const deleteNote = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;

    // Check if note exists and belongs to user
    const existingNote = await prisma.note.findFirst({
      where: { id, userId },
    });

    if (!existingNote) {
      return res.status(404).json({ error: "Note not found" });
    }

    await prisma.note.delete({
      where: { id },
    });

    res.json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).json({ error: "Failed to delete note" });
  }
};

// Get a single note
const getNote = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;

    const note = await prisma.note.findFirst({
      where: { id, userId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    res.json(note);
  } catch (error) {
    console.error("Error fetching note:", error);
    res.status(500).json({ error: "Failed to fetch note" });
  }
};

module.exports = {
  // Category controllers
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  
  // Note controllers
  getNotesByCategory,
  createNote,
  updateNote,
  deleteNote,
  getNote,
}; 