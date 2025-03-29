import { cache } from 'react';

const RAPIDAPI_KEY = '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90';
const RAPIDAPI_HOST = 'api-football-v1.p.rapidapi.com';
const BASE_URL = 'https://api-football-v1.p.rapidapi.com/v3';

const headers = {
  'x-rapidapi-key': RAPIDAPI_KEY,
  'x-rapidapi-host': RAPIDAPI_HOST,
  'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate'
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

// Cache the fetch function itself using React's cache
const cachedFetch = cache(async (url: string, options: RequestInit) => {
  const response = await fetch(url, options);
  return response.json();
});

/**
 * Fetch a match by its ID with additional details
 */
export const fetchMatchById = cache(async (matchId: string) => {
  try {
    // First, get basic match data to determine status
    const basicMatchData = await cachedFetch(`${BASE_URL}/fixtures?id=${matchId}`, { 
      headers,
      next: { revalidate: 86400 } // 24 hour default cache
    });
    
    if (!basicMatchData.response || basicMatchData.response.length === 0) {
      throw new Error('Match not found');
    }
    
    const match = basicMatchData.response[0];
    const matchStatus = match.fixture.status.short;
    
    // Determine cache time based on match status
    let cacheTime = 86400; // Default 24 hours
    if (['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(matchStatus)) {
      cacheTime = 30; // 30 seconds for live matches
    } else if (['NS', 'TBD'].includes(matchStatus)) {
      const matchTime = new Date(match.fixture.date).getTime();
      const timeUntilMatch = matchTime - Date.now();
      if (timeUntilMatch < 3600000) { // < 1 hour
        cacheTime = 300; // 5 minutes
      } else if (timeUntilMatch < 86400000) { // < 24 hours
        cacheTime = 3600; // 1 hour
      }
    }
    
    // Fetch all additional data in parallel with appropriate cache time
    const [lineupData, statsData, eventsData] = await Promise.all([
      cachedFetch(`${BASE_URL}/fixtures/lineups?fixture=${matchId}`, { 
        headers,
        next: { revalidate: cacheTime }
      }),
      cachedFetch(`${BASE_URL}/fixtures/statistics?fixture=${matchId}`, { 
        headers,
        next: { revalidate: cacheTime }
      }),
      cachedFetch(`${BASE_URL}/fixtures/events?fixture=${matchId}`, { 
        headers,
        next: { revalidate: cacheTime }
      })
    ]);

    // Get both teams' IDs
    const homeTeamId = match.teams.home.id;
    const awayTeamId = match.teams.away.id;
    const season = match.league.season;
    
    // Use longer cache time for team data
    const teamCacheTime = Math.max(cacheTime, 86400); // At least 24 hours
    
    // Fetch team and H2H data in parallel
    const [homePlayersData, awayPlayersData, h2hData] = await Promise.all([
      cachedFetch(`${BASE_URL}/players?team=${homeTeamId}&season=${season}`, { 
        headers,
        next: { revalidate: teamCacheTime }
      }),
      cachedFetch(`${BASE_URL}/players?team=${awayTeamId}&season=${season}`, { 
        headers,
        next: { revalidate: teamCacheTime }
      }),
      cachedFetch(`${BASE_URL}/fixtures/headtohead?h2h=${homeTeamId}-${awayTeamId}`, { 
        headers,
        next: { revalidate: teamCacheTime }
      })
    ]);

    // Combine all data
    return {
      ...match,
      lineups: lineupData.response,
      statistics: statsData.response,
      events: eventsData.response,
      h2h: h2hData.response,
      players: {
        home: homePlayersData.response || [],
        away: awayPlayersData.response || []
      }
    };
  } catch (error) {
    console.error('Error fetching match data:', error);
    throw error;
  }
});

/**
 * Fetch all matches for static generation with appropriate caching
 */
export const fetchAllMatches = cache(async () => {
  try {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 3);
    const to = new Date(today);
    to.setDate(today.getDate() + 3);

    return await cachedFetch(
      `${BASE_URL}/fixtures?from=${from.toISOString().split('T')[0]}&to=${to.toISOString().split('T')[0]}`,
      {
        headers,
        next: { revalidate: 86400 } // Cache for 24 hours
      }
    );
  } catch (error) {
    console.error('Error fetching all matches:', error);
    return [];
  }
});

/**
 * Fetch matches by league ID with appropriate caching
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
      headers,
      next: { revalidate: 3600 } // Cache for 1 hour
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