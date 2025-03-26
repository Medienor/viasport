// Helper function to extract team ID from slug
export function extractTeamId(slug: string): number | null {
  const match = slug.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

// Helper function to create URL-friendly slug
export function createTeamSlug(teamName: string, teamId: number) {
  return `${teamName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${teamId}`;
} 