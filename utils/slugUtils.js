/**
 * Generate a URL-friendly slug from a title
 * @param {string} title - The title to convert to slug
 * @returns {string} - The generated slug
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a unique slug by checking existing slugs and appending a number if needed
 * @param {string} title - The title to convert to slug
 * @param {Function} checkExisting - Function to check if slug already exists
 * @returns {Promise<string>} - The generated unique slug
 */
async function generateUniqueSlug(title, checkExisting) {
  let baseSlug = generateSlug(title);
  let slug = baseSlug;
  let counter = 1;

  while (await checkExisting(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Convert title to capitalized dash format (e.g., "My Project" -> "My-Project")
 * @param {string} title - The title to convert
 * @returns {string} - The formatted slug
 */
function generateCapitalizedSlug(title) {
  return title
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('-');
}

/**
 * Generate a capitalized slug for workspace (e.g., "My Project" -> "My-Project")
 * @param {string} title - The title to convert to slug
 * @returns {string} - The generated capitalized slug
 */
function generateWorkspaceSlug(title) {
  return title
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters except spaces
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('-');
}

/**
 * Generate a unique workspace slug by checking existing slugs within a team and appending a number if needed
 * @param {string} title - The title to convert to slug
 * @param {Function} checkExisting - Function to check if slug already exists within team
 * @returns {Promise<string>} - The generated unique workspace slug
 */
async function generateUniqueWorkspaceSlug(title, checkExisting) {
  let baseSlug = generateWorkspaceSlug(title);
  let slug = baseSlug;
  let counter = 1;

  while (await checkExisting(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Predefined workspace prefixes mapping
 */
const workspacePrefixes = {
  "Engineering": "ENG",
  "Design": "DES", 
  "Marketing": "MKT",
  "Solutions": "SOL",
  "Solven": "SLV" // Different prefix to avoid collision
};

/**
 * Generate a unique prefix for workspace based on title
 * @param {string} workspaceTitle - The workspace title
 * @param {Function} checkExisting - Function to check if prefix already exists
 * @returns {Promise<string>} - The generated unique prefix
 */
async function generateUniquePrefix(workspaceTitle, checkExisting) {
  // Check if we have a predefined prefix for this title
  const predefinedPrefix = workspacePrefixes[workspaceTitle];
  if (predefinedPrefix) {
    const existing = await checkExisting(predefinedPrefix);
    if (!existing) {
      return predefinedPrefix;
    }
  }

  // Generate prefix from title (first 3 characters, uppercase)
  const basePrefix = workspaceTitle.toUpperCase().substring(0, 3);
  
  // Check if prefix already exists
  const existing = await checkExisting(basePrefix);
  
  if (!existing) {
    return basePrefix;
  }
  
  // Generate alternative if collision - use first 2 chars + number
  let counter = 1;
  let newPrefix = basePrefix.substring(0, 2) + counter;
  
  while (await checkExisting(newPrefix)) {
    counter++;
    newPrefix = basePrefix.substring(0, 2) + counter;
  }
  
  return newPrefix;
}

module.exports = {
  generateSlug,
  generateUniqueSlug,
  generateCapitalizedSlug,
  generateWorkspaceSlug,
  generateUniqueWorkspaceSlug,
  generateUniquePrefix
}; 