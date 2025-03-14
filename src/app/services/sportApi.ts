import { trackedFetch } from '@/lib/api';

// API key for API-FOOTBALL via RapidAPI
const API_KEY = '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90';
export const BASE_URL = 'https://api-football-v1.p.rapidapi.com/v3';

// Headers required for API requests
export const headers = {
  'x-rapidapi-key': API_KEY,
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

/**
 * Get popular football leagues
 * @returns Array of League objects
 */
export async function getPopularLeagues(): Promise<League[]> {
  try {
    // Get current season (current year)
    const currentYear = new Date().getFullYear();
    
    const response = await trackedFetch(`${BASE_URL}/leagues?season=${currentYear}`, {
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
    
    // Popular league IDs
    const popularLeagueIds = [2, 39, 61, 78, 135, 140];
    
    // Filter leagues to only include popular ones
    const leagues = data.response
      .filter((item: any) => popularLeagueIds.includes(item.league.id))
      .map((item: any) => item.league);
    
    return leagues;
  } catch (error) {
    console.error('Error fetching leagues:', error);
    return [];
  }
}

/**
 * Get upcoming fixtures for a specific league
 * @param leagueId Optional league ID
 * @param date Optional date in YYYY-MM-DD format
 * @returns Array of Fixture objects
 */
export async function getUpcomingFixtures(leagueId?: number, date?: string): Promise<Fixture[]> {
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
    
    // Log the response to see what we're getting
    console.log(`Fixtures for ${leagueId ? `league ${leagueId}` : 'all leagues'}:`, data.response.length);
    
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
export async function getAvailableCountries(): Promise<string[]> {
  try {
    const response = await trackedFetch(`${BASE_URL}/countries`, {
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
}

/**
 * Get leagues for a specific country
 * @param country Country name
 * @returns Array of League objects
 */
export async function getLeaguesByCountry(country: string): Promise<League[]> {
  try {
    // Get current season (current year)
    const currentYear = new Date().getFullYear();
    
    const response = await trackedFetch(`${BASE_URL}/leagues?country=${country}&season=${currentYear}`, {
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
export async function getLiveMatches(): Promise<Fixture[]> {
  try {
    const response = await trackedFetch(`${BASE_URL}/fixtures?live=all`, {
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
    
    return data.response;
  } catch (error) {
    console.error('Error fetching live matches:', error);
    return [];
  }
}

/**
 * Get upcoming fixtures for a league
 * @param leagueId League ID
 * @returns Array of Fixture objects
 */
export async function getLeagueUpcomingFixtures(leagueId: number): Promise<Fixture[]> {
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
    
    const response = await trackedFetch(`${BASE_URL}/fixtures?${queryParams}`, {
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
}

/**
 * Get current season information for a league
 * @param leagueId League ID
 * @returns Array of season information
 */
export async function getLeagueSeasons(leagueId: number): Promise<any[]> {
  try {
    const response = await trackedFetch(`${BASE_URL}/leagues?id=${leagueId}`, {
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
}

/**
 * Get team information by ID
 * @param teamId Team ID
 * @returns Team information
 */
export async function getTeamInfo(teamId: number): Promise<any> {
  try {
    const response = await trackedFetch(`${BASE_URL}/teams?id=${teamId}`, {
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
}

/**
 * Get team squad information
 * @param teamId Team ID
 * @returns Team squad information
 */
export async function getTeamSquad(teamId: number): Promise<any[]> {
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