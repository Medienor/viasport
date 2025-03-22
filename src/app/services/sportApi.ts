import { trackedFetch } from '@/lib/api';

export const BASE_URL = 'https://api-football-v1.p.rapidapi.com/v3';

// TEMPORARY API DISABLE FLAG - set to true to disable API calls
const DISABLE_API_CALLS = true;

// Helper function to log disabled API calls
function logDisabledCall(functionName: string, ...args: any[]) {
  console.log(`[API DISABLED] ${functionName} would have been called with:`, ...args);
  return [];
}

// Headers with environment variable
export const headers = {
  'x-rapidapi-key': process.env.RAPID_API_KEY!,
  'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
};

// Interface for League data
export interface League {
  id: number;
  name: string;
  type: string;
  logo: string;
  country: string;
}

// Interface for Team data
export interface Team {
  id: number;
  name: string;
  logo: string;
}

// Interface for Goal data
export interface Goals {
  home: number | null;
  away: number | null;
}

// Interface for Teams in a fixture
export interface FixtureTeams {
  home: Team;
  away: Team;
}

// Interface for Fixture status
export interface FixtureStatus {
  long: string;
  short: string;
  elapsed: number | null;
}

// Interface for Fixture data
export interface Fixture {
  id: number;
  date: string;
  timestamp: number;
  timezone: string;
  status: FixtureStatus;
  league: League;
  teams: FixtureTeams;
  goals: Goals;
  venue?: {
    id: number;
    name: string;
    city: string;
  };
}

// Add a global cache object to store API responses
const globalCache: {
  [key: string]: {
    data: any;
    timestamp: number;
  }
} = {};

// Increased cache duration and added rate limiting
const CACHE_DURATION = 7200; // 2 hours
const LIVE_CACHE_DURATION = 30; // 30 seconds for live data
const API_RATE_LIMIT = 1000; // 1 second minimum between calls
let lastApiCall = 0;

// Rate limiting function
const checkRateLimit = async () => {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;
  if (timeSinceLastCall < API_RATE_LIMIT) {
    await new Promise(resolve => setTimeout(resolve, API_RATE_LIMIT - timeSinceLastCall));
  }
  lastApiCall = Date.now();
};

// API call tracking
interface ApiCallLog {
  endpoint: string;
  timestamp: number;
  cacheKey: string;
  parameters: Record<string, any>;
  source: string;
}

const apiCallLogs: ApiCallLog[] = [];
let totalApiCalls = 0;

/**
 * Log an API call
 * @param endpoint The API endpoint called
 * @param cacheKey The cache key used
 * @param parameters Parameters sent to the API
 * @param source Information about what triggered the call
 */
function logApiCall(endpoint: string, cacheKey: string, parameters: Record<string, any>, source: string): void {
  totalApiCalls++;
  const log: ApiCallLog = {
    endpoint,
    timestamp: Date.now(),
    cacheKey,
    parameters,
    source
  };
  
  apiCallLogs.push(log);
  
  // Keep log size manageable by removing older entries if needed
  if (apiCallLogs.length > 1000) {
    apiCallLogs.shift();
  }
  
  console.log(`API CALL #${totalApiCalls}: ${endpoint} | Source: ${source} | Cache Key: ${cacheKey} | Time: ${new Date().toISOString()}`);
}

/**
 * Get API call statistics
 * @returns Statistics about API calls
 */
export function getApiCallStats() {
  return {
    totalCalls: totalApiCalls,
    recentCalls: apiCallLogs.slice(-20), // Last 20 calls
    cacheSizeEntries: Object.keys(globalCache).length,
    cacheSizeEstimate: `~${Math.round(JSON.stringify(globalCache).length / 1024)} KB`
  };
}

/**
 * Remove expired entries from the cache
 */
function cleanupCache(): void {
  const now = Math.floor(Date.now() / 1000);
  let removedCount = 0;
  
  Object.keys(globalCache).forEach(key => {
    if (now - globalCache[key].timestamp >= CACHE_DURATION) {
      delete globalCache[key];
      removedCount++;
    }
  });
  
  if (removedCount > 0) {
    console.log(`Cleaned up ${removedCount} expired cache entries. Current cache size: ${Object.keys(globalCache).length}`);
  }
}

/**
 * Clear the entire cache manually if needed
 */
export function clearCache(): void {
  const count = Object.keys(globalCache).length;
  Object.keys(globalCache).forEach(key => delete globalCache[key]);
  console.log(`Manually cleared ${count} cache entries`);
}

// Modified cachedFetch to respect the disable flag
async function cachedFetch<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  endpoint: string,
  parameters: Record<string, any>,
  source: string
): Promise<T> {
  // Skip API call if disabled
  if (DISABLE_API_CALLS) {
    console.log(`[API DISABLED] cachedFetch would have called ${endpoint} with parameters:`, parameters);
    return [] as unknown as T;
  }

  const cached = globalCache[cacheKey];
  const now = Date.now();

  if (cached && (now - cached.timestamp) < CACHE_DURATION * 1000) {
    return cached.data;
  }

  await checkRateLimit();
  logApiCall(endpoint, cacheKey, parameters, source);

  try {
    const result = await fetchFn();
    
    globalCache[cacheKey] = {
      data: result,
      timestamp: now
    };
    
    // Cleanup cache occasionally
    if (Math.random() < 0.1) { // 10% chance to run cleanup
      cleanupCache();
    }
    
    return result;
  } catch (error) {
    console.error(`Error in cachedFetch for ${cacheKey}:`, error);
    if (cached) {
      console.log(`Returning stale cached data for ${cacheKey}`);
      return cached.data;
    }
    throw error;
  }
}

// Modify all API functions to respect the disable flag

export async function getUpcomingFixtures(leagueId?: number, date?: string, source: string = 'unknown'): Promise<Fixture[]> {
  if (DISABLE_API_CALLS) {
    return logDisabledCall('getUpcomingFixtures', { leagueId, date, source }) as Fixture[];
  }

  const cacheKey = `upcoming-fixtures-${leagueId || 'all'}-${date || 'next10days'}`;
  const cached = globalCache[cacheKey];
  const now = Date.now();

  if (cached && (now - cached.timestamp) < CACHE_DURATION * 1000) {
    return cached.data;
  }

  await checkRateLimit();

  try {
    // Build query parameters
    let queryParams = '';
    
    // Get current season (current year)
    const currentYear = new Date().getFullYear();
    queryParams += `season=${currentYear}&`;
    
    if (leagueId) {
      queryParams += `league=${leagueId}&`;
    }
    
    if (date) {
      queryParams += `date=${date}&`;
    } else {
      // If no date provided, get next 10 days
      const from = new Date();
      const to = new Date();
      to.setDate(to.getDate() + 10);
      
      const fromStr = from.toISOString().split('T')[0];
      const toStr = to.toISOString().split('T')[0];
      
      queryParams += `from=${fromStr}&to=${toStr}&`;
    }
    
    // Add timezone
    queryParams += 'timezone=Europe/Oslo';
    
    // Log the API call with source information
    logApiCall(`${BASE_URL}/fixtures`, cacheKey, { leagueId, date }, source);
    
    const response = await trackedFetch(`${BASE_URL}/fixtures?${queryParams}`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error('API Error:', data.errors);
      return [];
    }
    
    globalCache[cacheKey] = {
      data: data.response,
      timestamp: now
    };
    
    return data.response;
  } catch (error) {
    console.error(`Error fetching fixtures for league ${leagueId}:`, error);
    return [];
  }
}

/**
 * Get available countries for leagues
 * @returns Array of country names
 */
export async function getAvailableCountries(source: string = 'unknown'): Promise<string[]> {
  if (DISABLE_API_CALLS) {
    return logDisabledCall('getAvailableCountries', { source }) as string[];
  }

  const cacheKey = 'available-countries';
  const endpoint = `${BASE_URL}/countries`;
  const parameters = {};
  
  return cachedFetch(cacheKey, async () => {
    try {
      const response = await trackedFetch(`${endpoint}`, {
        headers
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.errors && Object.keys(data.errors).length > 0) {
        console.error('API Error:', data.errors);
        return [];
      }
      
      return data.response.map((country: any) => country.name);
    } catch (error) {
      console.error('Error fetching countries:', error);
      return [];
    }
  }, endpoint, parameters, source);
}

/**
 * Get leagues for a specific country
 * @param country Country name
 * @returns Array of League objects
 */
export async function getLeaguesByCountry(country: string, source: string = 'unknown'): Promise<League[]> {
  if (DISABLE_API_CALLS) {
    return logDisabledCall('getLeaguesByCountry', { country, source }) as League[];
  }

  const cacheKey = `leagues-by-country-${country}`;
  const endpoint = `${BASE_URL}/leagues`;
  const parameters = { country, season: new Date().getFullYear() };
  
  return cachedFetch(cacheKey, async () => {
    try {
      // Get current season (current year)
      const currentYear = new Date().getFullYear();
      
      const response = await trackedFetch(`${endpoint}?country=${country}&season=${currentYear}`, {
        headers
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.errors && Object.keys(data.errors).length > 0) {
        console.error('API Error:', data.errors);
        return [];
      }
      
      return data.response.map((item: any) => item.league);
    } catch (error) {
      console.error(`Error fetching leagues for country ${country}:`, error);
      return [];
    }
  }, endpoint, parameters, source);
}

/**
 * Get league logo URL
 * @param leagueId League ID
 * @returns URL to league logo
 */
export function getLeagueLogoUrl(leagueId: number): string {
  return `https://media.api-sports.io/football/leagues/${leagueId}.png`;
}

/**
 * Get team logo URL
 * @param teamId Team ID
 * @returns URL to team logo
 */
export function getTeamLogoUrl(teamId: number): string {
  return `https://media.api-sports.io/football/teams/${teamId}.png`;
}

/**
 * Get live matches
 * @returns Array of Fixture objects for live matches
 */
export async function getLiveMatches(source: string = 'unknown'): Promise<Fixture[]> {
  if (DISABLE_API_CALLS) {
    return logDisabledCall('getLiveMatches', { source }) as Fixture[];
  }

  const cacheKey = 'live-matches';
  const cached = globalCache[cacheKey];
  const now = Date.now();

  if (cached && (now - cached.timestamp) < LIVE_CACHE_DURATION * 1000) {
    return cached.data;
  }

  await checkRateLimit();

  try {
    const endpoint = `${BASE_URL}/fixtures`;
    logApiCall(endpoint, cacheKey, { live: 'all' }, source);
    
    const response = await trackedFetch(`${endpoint}?live=all`, { headers });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    const data = await response.json();
    if (data.errors) throw new Error(JSON.stringify(data.errors));
    
    globalCache[cacheKey] = {
      data: data.response,
      timestamp: now
    };
    
    return data.response;
  } catch (error) {
    console.error('Error fetching live matches:', error);
    return cached?.data || [];
  }
}

/**
 * Get upcoming fixtures for a league
 * @param leagueId League ID
 * @returns Array of Fixture objects
 */
export async function getLeagueUpcomingFixtures(leagueId: number, source: string = 'unknown'): Promise<Fixture[]> {
  if (DISABLE_API_CALLS) {
    return logDisabledCall('getLeagueUpcomingFixtures', { leagueId, source }) as Fixture[];
  }

  const cacheKey = `league-upcoming-fixtures-${leagueId}`;
  const endpoint = `${BASE_URL}/fixtures`;
  const parameters = { leagueId, season: new Date().getFullYear() };
  
  return cachedFetch(cacheKey, async () => {
    try {
      // Get current season and next season
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      
      // Determine which season to use based on current month
      // For leagues that run across calendar years (like Premier League), 
      // we need to use the starting year of the season
      const seasonYear = currentDate.getMonth() >= 6 ? currentYear : currentYear - 1;
      
      // Build query parameters
      const queryParams = `league=${leagueId}&season=${seasonYear}&status=NS`;
      
      console.log(`Fetching fixtures with params: ${queryParams}`);
      
      const response = await trackedFetch(`${endpoint}?${queryParams}`, {
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
      
      console.log(`Upcoming fixtures for league ${leagueId}:`, data.response.length);
      
      // Sort fixtures by date (earliest first)
      const sortedFixtures = data.response.sort((a: Fixture, b: Fixture) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      
      // Take only the next 10 fixtures
      return sortedFixtures.slice(0, 10);
    } catch (error) {
      console.error(`Error fetching upcoming fixtures for league ${leagueId}:`, error);
      return [];
    }
  }, endpoint, parameters, source);
}

/**
 * Get current season information for a league
 * @param leagueId League ID
 * @returns Array of season information
 */
export async function getLeagueSeasons(leagueId: number, source: string = 'unknown'): Promise<any[]> {
  if (DISABLE_API_CALLS) {
    return logDisabledCall('getLeagueSeasons', { leagueId, source }) as any[];
  }

  const cacheKey = `league-seasons-${leagueId}`;
  const endpoint = `${BASE_URL}/leagues`;
  const parameters = { id: leagueId };
  
  return cachedFetch(cacheKey, async () => {
    try {
      const response = await trackedFetch(`${endpoint}?id=${leagueId}`, {
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
      
      console.log(`League info for ${leagueId}:`, data.response);
      
      return data.response;
    } catch (error) {
      console.error(`Error fetching league info for ${leagueId}:`, error);
      return [];
    }
  }, endpoint, parameters, source);
}

/**
 * Get team information by ID
 * @param teamId Team ID
 * @returns Team information
 */
export async function getTeamInfo(teamId: number, source: string = 'unknown'): Promise<any> {
  if (DISABLE_API_CALLS) {
    return logDisabledCall('getTeamInfo', { teamId, source });
  }

  const cacheKey = `team-info-${teamId}`;
  const endpoint = `${BASE_URL}/teams`;
  const parameters = { id: teamId };
  
  return cachedFetch(cacheKey, async () => {
    try {
      const response = await trackedFetch(`${endpoint}?id=${teamId}`, {
        headers
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.errors && Object.keys(data.errors).length > 0) {
        console.error(`API Error for team ${teamId}:`, data.errors);
        return null;
      }
      
      // The API returns an array, but we only need the first item
      if (data.response && data.response.length > 0) {
        return data.response[0].team;
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching team info for ${teamId}:`, error);
      throw error;
    }
  }, endpoint, parameters, source);
}

/**
 * Get team squad information
 * @param teamId Team ID
 * @returns Team squad information
 */
export async function getTeamSquad(teamId: number): Promise<any[]> {
  if (DISABLE_API_CALLS) {
    return logDisabledCall('getTeamSquad', { teamId });
  }

  try {
    const response = await trackedFetch(`${BASE_URL}/players/squads?team=${teamId}`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error(`API Error for team squad ${teamId}:`, data.errors);
      return [];
    }
    
    if (data.response && data.response.length > 0) {
      return data.response[0].players || [];
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching team squad for ${teamId}:`, error);
    return [];
  }
}

/**
 * Get team matches
 * @param teamId Team ID
 * @param status Match status (NS for upcoming, FT for finished)
 * @param limit Number of matches to return
 * @returns Array of team matches
 */
export async function getTeamMatches(teamId: number, status: string = 'NS', limit: number = 10): Promise<any[]> {
  if (DISABLE_API_CALLS) {
    return logDisabledCall('getTeamMatches', { teamId, status, limit });
  }

  try {
    // Get current season
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    // Determine which season to use based on current month
    const seasonYear = currentDate.getMonth() >= 6 ? currentYear : currentYear - 1;
    
    const response = await trackedFetch(`${BASE_URL}/fixtures?team=${teamId}&season=${seasonYear}&status=${status}`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error(`API Error for team matches ${teamId}:`, data.errors);
      return [];
    }
    
    // Sort fixtures by date
    const sortedFixtures = data.response.sort((a: any, b: any) => {
      if (status === 'NS') {
        // For upcoming matches, sort by earliest first
        return new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime();
      } else {
        // For finished matches, sort by most recent first
        return new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime();
      }
    });
    
    // Limit the number of matches
    return sortedFixtures.slice(0, limit);
  } catch (error) {
    console.error(`Error fetching team matches for ${teamId}:`, error);
    return [];
  }
}

/**
 * Get team statistics for a specific league and season
 * @param teamId Team ID
 * @param leagueId League ID
 * @param season Season year (YYYY)
 * @param date Optional date to get statistics up to (YYYY-MM-DD)
 * @returns Team statistics
 */
export async function getTeamStatistics(
  teamId: number, 
  leagueId: number, 
  season: number,
  date?: string
): Promise<any> {
  if (DISABLE_API_CALLS) {
    return logDisabledCall('getTeamStatistics', { teamId, leagueId, season, date });
  }

  try {
    let url = `/api/teams/statistics?team=${teamId}&league=${leagueId}&season=${season}`;
    
    if (date) {
      url += `&date=${date}`;
    }
    
    const response = await trackedFetch(url);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error('API Error:', data.errors);
      return null;
    }
    
    return data.response;
  } catch (error) {
    console.error(`Error fetching team statistics for team ${teamId} in league ${leagueId}:`, error);
    return null;
  }
}

/**
 * Get team's top players
 * @param teamId Team ID
 * @param season Season year
 * @returns Array of top players with their statistics
 */
export async function getTeamTopPlayers(teamId: number, season: number): Promise<any[]> {
  if (DISABLE_API_CALLS) {
    return logDisabledCall('getTeamTopPlayers', { teamId, season });
  }

  try {
    const response = await trackedFetch(`${BASE_URL}/players?team=${teamId}&season=${season}`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error(`API Error for team players ${teamId}:`, data.errors);
      return [];
    }

    // Sort players by goals and assists
    const players = data.response.sort((a: any, b: any) => {
      const aStats = a.statistics[0];
      const bStats = b.statistics[0];
      const aScore = (aStats?.goals?.total || 0) + (aStats?.goals?.assists || 0);
      const bScore = (bStats?.goals?.total || 0) + (bStats?.goals?.assists || 0);
      return bScore - aScore;
    });
    
    // Return top 4 players with relevant stats
    return players.slice(0, 4).map((player: any) => {
      const stats = player.statistics[0];
      return {
        id: player.player.id,
        name: player.player.name,
        photo: `https://media.api-sports.io/football/players/${player.player.id}.png`,
        position: stats.games.position,
        goals: stats.goals.total || 0,
        assists: stats.goals.assists || 0,
        appearances: stats.games.appearences || 0
      };
    });
  } catch (error) {
    console.error(`Error fetching top players for team ${teamId}:`, error);
    return [];
  }
}

export async function getHeadToHead(team1Id: number, team2Id: number) {
  if (DISABLE_API_CALLS) {
    return logDisabledCall('getHeadToHead', { team1Id, team2Id });
  }

  try {
    const response = await trackedFetch(`${BASE_URL}/fixtures/headtohead?h2h=${team1Id}-${team2Id}&last=5`, {
      headers
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error('API Error:', data.errors);
      return [];
    }

    // Sort matches by date (newest first)
    return data.response.sort((a: any, b: any) => 
      new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime()
    );
  } catch (error) {
    console.error('Error fetching head to head:', error);
    return [];
  }
}

/**
 * Get teams for a specific league
 * @param leagueId League ID
 * @returns Array of team information
 */
export async function getTeamsByLeague(leagueId: number): Promise<any[]> {
  if (DISABLE_API_CALLS) {
    return logDisabledCall('getTeamsByLeague', { leagueId });
  }

  try {
    // Get current season (current year)
    const currentYear = new Date().getFullYear();
    
    const response = await trackedFetch(`${BASE_URL}/teams?league=${leagueId}&season=${currentYear}`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error(`API Error for league teams ${leagueId}:`, data.errors);
      return [];
    }
    
    console.log(`Teams for league ${leagueId}:`, data.response.length);
    
    return data.response;
  } catch (error) {
    console.error(`Error fetching teams for league ${leagueId}:`, error);
    return [];
  }
}

/**
 * Get fixtures for a league
 * @param leagueId League ID
 * @param days Number of days to fetch fixtures for (default: 30)
 * @param source Information about what triggered the call
 * @returns Array of fixtures
 */
export async function getFixtures(leagueId: number, days: number = 30, source: string = 'unknown'): Promise<any[]> {
  if (DISABLE_API_CALLS) {
    return logDisabledCall('getFixtures', { leagueId, days, source }) as any[];
  }

  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + days);
  
  const fromDate = today.toISOString().split('T')[0];
  const toDate = endDate.toISOString().split('T')[0];
  
  const cacheKey = `fixtures-league-${leagueId}-from-${fromDate}-to-${toDate}`;
  const endpoint = `${BASE_URL}/fixtures`;
  const parameters = { 
    league: leagueId, 
    from: fromDate, 
    to: toDate,
    season: new Date().getFullYear()
  };
  
  return cachedFetch(cacheKey, async () => {
    try {
      const response = await trackedFetch(
        `${endpoint}?league=${leagueId}&from=${fromDate}&to=${toDate}&season=${new Date().getFullYear()}`, 
        { headers }
      );
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.errors && Object.keys(data.errors).length > 0) {
        console.error(`API Error for fixtures in league ${leagueId}:`, data.errors);
        return [];
      }
      
      console.log(`Fixtures for league ${leagueId} (${fromDate} to ${toDate}):`, data.response.length);
      
      return data.response;
    } catch (error) {
      console.error(`Error fetching fixtures for league ${leagueId}:`, error);
      return [];
    }
  }, endpoint, parameters, source);
}

// Add cleanup interval for cache
setInterval(cleanupCache, CACHE_DURATION * 500); // Run cleanup every half cache duration 