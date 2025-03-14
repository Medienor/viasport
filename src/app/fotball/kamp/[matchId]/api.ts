import { cache } from 'react';

const RAPIDAPI_KEY = '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90';
const RAPIDAPI_HOST = 'api-football-v1.p.rapidapi.com';
const BASE_URL = 'https://api-football-v1.p.rapidapi.com/v3';

const headers = {
  'x-rapidapi-key': RAPIDAPI_KEY,
  'x-rapidapi-host': RAPIDAPI_HOST,
};

interface MatchEvent {
  time: {
    elapsed: number;
    extra?: number | null;
  };
  team: {
    id: number;
    name: string;
    logo: string;
  };
  player: {
    id: number;
    name: string;
  };
  type: string;
  detail: string;
}

interface MatchStatistics {
  team: {
    id: number;
    name: string;
    logo: string;
  };
  statistics: Array<{
    type: string;
    value: string | number;
  }>;
}

interface EnhancedFixture extends Fixture {
  events?: MatchEvent[];
  statistics?: MatchStatistics[];
}

/**
 * Fetch a match by its ID with additional details
 */
export const fetchMatchById = cache(async (matchId: string) => {
  try {
    // Fetch match data and all related data in parallel
    const [matchResponse, lineupResponse, statsResponse, h2hResponse] = await Promise.all([
      fetch(`${BASE_URL}/fixtures?id=${matchId}`, { headers }),
      fetch(`${BASE_URL}/fixtures/lineups?fixture=${matchId}`, { headers }),
      fetch(`${BASE_URL}/fixtures/statistics?fixture=${matchId}`, { headers }),
      fetch(`${BASE_URL}/fixtures/headtohead?h2h=${matchId}`, { headers })
    ]);

    const [matchData, lineupData, statsData, h2hData] = await Promise.all([
      matchResponse.json(),
      lineupResponse.json(),
      statsResponse.json(),
      h2hResponse.json()
    ]);

    const match = matchData.response[0];
    if (match) {
      // Get both teams' IDs
      const homeTeamId = match.teams.home.id;
      const awayTeamId = match.teams.away.id;
      const season = match.league.season;

      // Fetch both teams' players in parallel
      const [homePlayersResponse, awayPlayersResponse] = await Promise.all([
        fetch(`${BASE_URL}/players?team=${homeTeamId}&season=${season}`, { headers }),
        fetch(`${BASE_URL}/players?team=${awayTeamId}&season=${season}`, { headers })
      ]);

      const [homePlayersData, awayPlayersData] = await Promise.all([
        homePlayersResponse.json(),
        awayPlayersResponse.json()
      ]);

      // Add all data to the match object
      match.lineups = lineupData.response;
      match.statistics = statsData.response;
      match.h2h = h2hData.response;
      match.players = {
        home: homePlayersData.response || [],
        away: awayPlayersData.response || []
      };
    }

    return match;
  } catch (error) {
    console.error('Error fetching match data:', error);
    throw error;
  }
});

/**
 * Fetch all matches for static generation
 */
export const fetchAllMatches = cache(async () => {
  try {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 7); // Last 7 days
    const to = new Date(today);
    to.setDate(today.getDate() + 7); // Next 7 days

    const response = await fetch(
      `${BASE_URL}/fixtures?from=${from.toISOString().split('T')[0]}&to=${to.toISOString().split('T')[0]}`,
      {
        headers,
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    const data = await response.json();
    return data.response || [];
  } catch (error) {
    console.error('Error fetching all matches:', error);
    return [];
  }
});

/**
 * Fetch matches by league ID
 */
export async function fetchMatchesByLeague(leagueId: number) {
  try {
    // Get current date
    const today = new Date();
    
    // Get current season
    const currentYear = today.getFullYear();
    const seasonYear = today.getMonth() >= 6 ? currentYear : currentYear - 1;
    
    // Get matches for the league in the current season
    const response = await fetch(`${BASE_URL}/fixtures?league=${leagueId}&season=${seasonYear}`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error(`API Error for league ${leagueId}:`, data.errors);
      return [];
    }
    
    // Sort fixtures by date
    return data.response.sort((a: any, b: any) => {
      return new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime();
    });
  } catch (error) {
    console.error(`Error fetching matches for league ${leagueId}:`, error);
    return [];
  }
} 