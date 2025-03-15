/**
 * Creates a URL-friendly slug from a league name
 * @param name The league name to convert to a slug
 * @returns A URL-friendly slug
 */
export function createLeagueSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/[æøå]/g, match => {   // Handle Norwegian characters
      if (match === 'æ') return 'ae';
      if (match === 'ø') return 'o';
      if (match === 'å') return 'a';
      return match;
    })
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '')             // Trim hyphens from start
    .replace(/-+$/, '');            // Trim hyphens from end
}

/**
 * Creates a URL-friendly slug from a team name
 * @param name The team name to convert to a slug
 * @returns A URL-friendly slug
 */
export function createTeamSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[æøå]/g, match => {   // Handle Norwegian characters
      if (match === 'æ') return 'ae';
      if (match === 'ø') return 'o';
      if (match === 'å') return 'a';
      return match;
    })
    .replace(/[^\w\s-]/g, '')       // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/\-\-+/g, '-')         // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '')             // Trim hyphens from start
    .replace(/-+$/, '');            // Trim hyphens from end
}

/**
 * Creates a URL-friendly slug from a player name and ID
 * @param name The player name to convert to a slug
 * @param id The player ID to append to the slug
 * @returns A URL-friendly slug with ID
 */
export function createPlayerSlug(name: string, id: number): string {
  const nameSlug = name
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/[æøå]/g, match => {   // Handle Norwegian characters
      if (match === 'æ') return 'ae';
      if (match === 'ø') return 'o';
      if (match === 'å') return 'a';
      return match;
    })
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '')             // Trim hyphens from start
    .replace(/-+$/, '');            // Trim hyphens from end
    
  return `${nameSlug}-${id}`;
}

/**
 * Creates a URL-friendly slug from a team name and ID
 * @param name The team name to convert to a slug
 * @param id The team ID to append to the slug
 * @returns A URL-friendly slug with ID
 */
export function createTeamSlugWithId(name: string, id: number): string {
  const nameSlug = createTeamSlug(name);
  return `${nameSlug}-${id}`;
} 