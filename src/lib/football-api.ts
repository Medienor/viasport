import { cache } from 'react';

// Define a type for the league codes
export type LeagueCode = 'PL' | 'BL1' | 'SA' | 'PD' | 'FL1' | 'DED' | 'PPL' | 'CL' | 'EC' | 'WC' | 'ELC' | 'BSA' | 'ELI';

// Available leagues in free tier with proper typing
export const AVAILABLE_LEAGUES: Record<LeagueCode, string> = {
  'PL': 'Premier League (England)',
  'BL1': 'Bundesliga (Germany)',
  'SA': 'Serie A (Italy)',
  'PD': 'La Liga (Spain)',
  'FL1': 'Ligue 1 (France)',
  'DED': 'Eredivisie (Netherlands)',
  'PPL': 'Primeira Liga (Portugal)',
  'CL': 'Champions League (Europe)',
  'EC': 'European Championship (Europe)',
  'WC': 'World Cup (World)',
  'ELC': 'Championship (England)',
  'BSA': 'Serie A (Brazil)',
  'ELI': 'Eliteserien (Norge)'
};

// Helper function to check if a string is a valid league code
export function isValidLeagueCode(code: string): code is LeagueCode {
  return code in AVAILABLE_LEAGUES;
}

// Function to make API requests through our proxy
async function fetchFromAPI(endpoint: string) {
  console.log(`Fetching from proxy API: /api/football/${endpoint}`);
  
  try {
    const response = await fetch(`/api/football/${endpoint}`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`API error (${response.status}):`, errorData);
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching from football API:', error);
    throw error;
  }
}

// Get league standings
export const getLeagueStandings = cache(async (leagueCode: string) => {
  if (!isValidLeagueCode(leagueCode)) {
    throw new Error(`Invalid league code: ${leagueCode}`);
  }
  return await fetchFromAPI(`competitions/${leagueCode}/standings`);
});

// Get upcoming matches for a league
export const getUpcomingMatches = cache(async (leagueCode: string) => {
  if (!isValidLeagueCode(leagueCode)) {
    throw new Error(`Invalid league code: ${leagueCode}`);
  }
  
  // Get current date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  
  // Get date 30 days from now
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
  const endDate = thirtyDaysLater.toISOString().split('T')[0];
  
  return await fetchFromAPI(`competitions/${leagueCode}/matches?dateFrom=${today}&dateTo=${endDate}&status=SCHEDULED`);
});

// Get team information
export const getTeamInfo = cache(async (teamId: number) => {
  return await fetchFromAPI(`teams/${teamId}`);
}); 