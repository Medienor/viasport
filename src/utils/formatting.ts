// Create a URL-friendly slug from a team name
export function createTeamSlug(name: string): string {
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