const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../utils/validation");
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getNotesByCategory,
  createNote,
  updateNote,
  deleteNote,
  getNote,
} = require("../controllers/notes.controller");

// ========== CATEGORY ROUTES ==========

// Get all categories for authenticated user
router.get("/categories", authenticateToken, getCategories);

// Create a new category
router.post("/categories", authenticateToken, createCategory);

// Update a category
router.put("/categories/:id", authenticateToken, updateCategory);

// Delete a category
router.delete("/categories/:id", authenticateToken, deleteCategory);

// ========== NOTE ROUTES ==========

// Get notes by category slug
router.get("/categories/:slug", authenticateToken, getNotesByCategory);

// Create a new note
router.post("/", authenticateToken, createNote);

// Get a single note
router.get("/:id", authenticateToken, getNote);

// Update a note
router.put("/:id", authenticateToken, updateNote);

// Delete a note
router.delete("/:id", authenticateToken, deleteNote);

module.exports = router; 