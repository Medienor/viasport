/**
 * Utility functions for the ViaSport application
 */

/**
 * Format a date string to a localized format (DD.MM.YYYY)
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Format a date string to a localized time format (HH:MM)
 * @param dateString - ISO date string
 * @returns Formatted time string
 */
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('no-NO', { 
    hour: '2-digit', 
    minute: '2-digit'
  });
}

/**
 * Create a URL-friendly slug from a team name and ID
 * @param name - Team name
 * @param id - Team ID
 * @returns URL-friendly slug
 */
export function createTeamSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Extract team ID from a team slug
 * @param slug - Team slug (format: "team-name-ID")
 * @returns Team ID as number
 */
export function getTeamIdFromSlug(slug: string): number {
  const parts = slug.split('-');
  return parseInt(parts[parts.length - 1] || '0');
}

/**
 * Format a match score
 * @param homeGoals - Home team goals
 * @param awayGoals - Away team goals
 * @returns Formatted score string
 */
export function formatScore(homeGoals: number | null, awayGoals: number | null): string {
  if (homeGoals === null || awayGoals === null) {
    return '-';
  }
  return `${homeGoals} - ${awayGoals}`;
}

/**
 * Determine if a date is today
 * @param dateString - ISO date string
 * @returns Boolean indicating if the date is today
 */
export function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Format a date with relative time (Today, Tomorrow, or DD.MM.YYYY)
 * @param dateString - ISO date string
 * @returns Formatted date string with relative time
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return 'I dag';
  }
  
  if (
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear()
  ) {
    return 'I morgen';
  }
  
  return formatDate(dateString);
}

/**
 * Generate a slug from a team ID and name
 * @param teamId - Team ID
 * @param teamName - Team name
 * @returns Slug in the format "team-name-id"
 */
export function getSlugFromTeamId(teamId: number, teamName: string): string {
  // Convert team name to lowercase and replace spaces with hyphens
  const nameSlug = teamName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Replace multiple hyphens with a single hyphen
  
  // Combine name slug with team ID
  return `${nameSlug}-${teamId}`;
}

/**
 * Create a URL-friendly slug for a player
 * @param name - Player name
 * @param id - Player ID
 * @returns URL-friendly slug
 */
export function createPlayerSlug(name: string, id: number) {
  if (!name) return `player-${id}`;
  
  // Convert to lowercase, replace spaces with hyphens, remove special characters
  const nameSlug = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
  
  return `${nameSlug}-${id}`;
}

export const createLeagueSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}; 