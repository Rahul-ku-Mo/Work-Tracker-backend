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
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

module.exports = {
  generateSlug,
  generateUniqueSlug,
  generateCapitalizedSlug
}; 