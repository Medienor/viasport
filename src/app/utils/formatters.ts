/**
 * Format time from ISO date string to HH:MM format
 * @param dateString ISO date string
 * @returns Formatted time string (HH:MM)
 */
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * Create a URL-friendly slug for a team
 * @param teamName Team name
 * @param teamId Team ID
 * @returns URL-friendly slug
 */
export function createTeamSlug(teamName: string, teamId: number): string {
  const nameSlug = teamName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with single hyphen
    .trim();
  
  return `${nameSlug}-${teamId}`;
}

/**
 * Create a URL-friendly slug for a league
 * @param leagueName League name
 * @param leagueId League ID
 * @returns URL-friendly slug
 */
export function createLeagueSlug(leagueName: string, leagueId: number): string {
  const nameSlug = leagueName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with single hyphen
    .trim();
  
  return `${nameSlug}-${leagueId}`;
}

/**
 * Check if a league is considered popular/important
 * @param leagueId League ID
 * @returns Boolean indicating if the league is popular
 */
export function isPopularLeague(leagueId: number): boolean {
  // List of popular league IDs
  const popularLeagueIds = [
    2,    // UEFA Champions League
    3,    // UEFA Europa League
    39,   // Premier League
    61,   // Ligue 1
    78,   // Bundesliga
    103,  // Eliteserien (Norway)
    135,  // Serie A
    140,  // La Liga
    179,  // OBOS-ligaen (Norway)
  ];
  
  return popularLeagueIds.includes(leagueId);
}

/**
 * Format date to Norwegian format (e.g., "Mandag 15. mai")
 * @param dateString ISO date string
 * @returns Formatted date string in Norwegian
 */
export function formatNorwegianDate(dateString: string): string {
  const date = new Date(dateString);
  const days = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
  const months = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
  
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  
  return `${dayName} ${day}. ${month}`;
}

/**
 * Format match status for display
 * @param status Match status code
 * @param elapsed Elapsed minutes (for live matches)
 * @returns Formatted status string
 */
export function formatMatchStatus(status: string, elapsed: number | null): string {
  switch (status) {
    case 'NS':
      return 'Ikke startet';
    case 'LIVE':
    case '1H':
    case '2H':
      return `${elapsed || 0}'`;
    case 'HT':
      return 'Pause';
    case 'FT':
      return 'Ferdig';
    case 'AET':
      return 'Etter ekstraomganger';
    case 'PEN':
      return 'Etter straffespark';
    case 'SUSP':
      return 'Utsatt';
    case 'INT':
      return 'Avbrutt';
    case 'PST':
      return 'Utsatt';
    case 'CANC':
      return 'Avlyst';
    case 'ABD':
      return 'Avbrutt';
    case 'AWD':
      return 'Walkover';
    case 'WO':
      return 'Walkover';
    default:
      return status;
  }
} 