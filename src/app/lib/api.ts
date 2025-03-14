import { 
  headers, 
  BASE_URL,
  Fixture
} from '../services/sportApi';

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
 * @param matchId Match ID
 * @returns Enhanced fixture with events and statistics
 */
export async function fetchMatchById(matchId: string): Promise<EnhancedFixture> {
  try {
    // First, get the basic fixture information
    const response = await fetch(`${BASE_URL}/fixtures?id=${matchId}`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error(`API Error for match ${matchId}:`, data.errors);
      throw new Error(`API Error: ${JSON.stringify(data.errors)}`);
    }
    
    if (!data.response || data.response.length === 0) {
      throw new Error(`Match with ID ${matchId} not found`);
    }
    
    const match = data.response[0];
    
    // Now get events for the match (goals, cards, etc.)
    const eventsResponse = await fetch(`${BASE_URL}/fixtures/events?fixture=${matchId}`, {
      headers
    });
    
    if (eventsResponse.ok) {
      const eventsData = await eventsResponse.json();
      if (!eventsData.errors || Object.keys(eventsData.errors).length === 0) {
        match.events = eventsData.response;
      }
    }
    
    // Get match statistics
    const statsResponse = await fetch(`${BASE_URL}/fixtures/statistics?fixture=${matchId}`, {
      headers
    });
    
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      if (!statsData.errors || Object.keys(statsData.errors).length === 0) {
        match.statistics = statsData.response;
      }
    }
    
    return match;
  } catch (error) {
    console.error(`Error fetching match ${matchId}:`, error);
    throw error;
  }
}

/**
 * Fetch all matches for static generation
 * @returns Array of fixtures
 */
export async function fetchAllMatches() {
  try {
    // Get today's date
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    
    // Get matches for today
    const response = await fetch(`${BASE_URL}/fixtures?date=${formattedDate}`, {
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
    
    return data.response || [];
  } catch (error) {
    console.error('Error fetching all matches:', error);
    return [];
  }
}

/**
 * Fetch matches by league ID
 * @param leagueId League ID
 * @returns Array of fixtures
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