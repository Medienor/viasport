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

// Helper function to determine cache time based on match status
function getCacheTimeByStatus(status: string): number {
  // Live statuses
  const liveStatuses = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'];
  
  // Upcoming statuses
  const upcomingStatuses = ['NS', 'TBD', 'PST'];
  
  // Finished statuses
  const finishedStatuses = ['FT', 'AET', 'PEN', 'CANC', 'ABD', 'AWD', 'WO'];
  
  if (liveStatuses.includes(status)) {
    return 60; // 1 minute cache for live matches
  } else if (upcomingStatuses.includes(status)) {
    return 1800; // 30 minutes cache for upcoming matches
  } else if (finishedStatuses.includes(status)) {
    return 86400; // 24 hours cache for finished matches
  } else {
    return 3600; // Default: 1 hour cache
  }
}

/**
 * Fetch a match by its ID with additional details
 */
export const fetchMatchById = cache(async (matchId: string) => {
  try {
    // First, get basic match data to determine status
    const basicMatchResponse = await fetch(`${BASE_URL}/fixtures?id=${matchId}`, { 
      headers,
      next: { 
        revalidate: 300 // 5 minute default cache for the initial request
      }
    });
    
    const basicMatchData = await basicMatchResponse.json();
    
    if (!basicMatchData.response || basicMatchData.response.length === 0) {
      throw new Error('Match not found');
    }
    
    // Get match status to determine cache time
    const matchStatus = basicMatchData.response[0].fixture.status.short;
    const cacheTime = getCacheTimeByStatus(matchStatus);
    
    console.log(`Match ${matchId} status: ${matchStatus}, cache time: ${cacheTime} seconds`);
    
    // Now fetch all the detailed data with appropriate cache time
    const [matchData, lineupData, statsData, eventsData] = await Promise.all([
      basicMatchData, // Reuse the data we already have
      fetch(`${BASE_URL}/fixtures/lineups?fixture=${matchId}`, { 
        headers,
        next: { revalidate: cacheTime }
      }).then(res => res.json()),
      fetch(`${BASE_URL}/fixtures/statistics?fixture=${matchId}`, { 
        headers,
        next: { revalidate: cacheTime }
      }).then(res => res.json()),
      fetch(`${BASE_URL}/fixtures/events?fixture=${matchId}`, { 
        headers,
        next: { revalidate: cacheTime }
      }).then(res => res.json())
    ]);

    const match = matchData.response[0];
    if (match) {
      // Get both teams' IDs
      const homeTeamId = match.teams.home.id;
      const awayTeamId = match.teams.away.id;
      const season = match.league.season;
      
      // For team and player data, use longer cache times as they don't change frequently
      const teamCacheTime = Math.max(cacheTime, 3600); // At least 1 hour for team data
      
      // Fetch both teams' players in parallel
      const [homePlayersResponse, awayPlayersResponse, h2hData] = await Promise.all([
        fetch(`${BASE_URL}/players?team=${homeTeamId}&season=${season}`, { 
          headers,
          next: { revalidate: teamCacheTime }
        }).then(res => res.json()),
        fetch(`${BASE_URL}/players?team=${awayTeamId}&season=${season}`, { 
          headers,
          next: { revalidate: teamCacheTime }
        }).then(res => res.json()),
        fetch(`${BASE_URL}/fixtures/headtohead?h2h=${homeTeamId}-${awayTeamId}`, { 
          headers,
          next: { revalidate: teamCacheTime }
        }).then(res => res.json())
      ]);

      // Add all data to the match object
      match.lineups = lineupData.response;
      match.statistics = statsData.response;
      match.events = eventsData.response;
      match.h2h = h2hData.response;
      match.players = {
        home: homePlayersResponse.response || [],
        away: awayPlayersResponse.response || []
      };
    }

    return match;
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
    from.setDate(today.getDate() - 3); // Last 3 days instead of 7
    const to = new Date(today);
    to.setDate(today.getDate() + 3); // Next 3 days instead of 7

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