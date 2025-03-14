import { BASE_URL, headers, Fixture } from './sportApi';

/**
 * Fetch fixtures by date
 * @param date Date in YYYY-MM-DD format
 * @returns Array of fixtures for the specified date
 */
export async function fetchFixturesByDate(date: string): Promise<Fixture[]> {
  try {
    const response = await fetch(`${BASE_URL}/fixtures?date=${date}`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error(`API Error for fixtures on ${date}:`, data.errors);
      return [];
    }
    
    return data.response;
  } catch (error) {
    console.error(`Error fetching fixtures for date ${date}:`, error);
    return [];
  }
}

/**
 * Fetch fixtures by league and date
 * @param leagueId League ID
 * @param date Date in YYYY-MM-DD format
 * @returns Array of fixtures for the specified league and date
 */
export async function fetchFixturesByLeagueAndDate(leagueId: number, date: string): Promise<Fixture[]> {
  try {
    const response = await fetch(`${BASE_URL}/fixtures?league=${leagueId}&date=${date}`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error(`API Error for fixtures in league ${leagueId} on ${date}:`, data.errors);
      return [];
    }
    
    return data.response;
  } catch (error) {
    console.error(`Error fetching fixtures for league ${leagueId} on date ${date}:`, error);
    return [];
  }
}

/**
 * Fetch fixtures for a specific match ID
 * @param matchId Match ID
 * @returns Match fixture data
 */
export async function fetchFixtureById(matchId: string | number): Promise<Fixture | null> {
  try {
    const response = await fetch(`${BASE_URL}/fixtures?id=${matchId}`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error(`API Error for fixture ${matchId}:`, data.errors);
      return null;
    }
    
    if (data.response && data.response.length > 0) {
      return data.response[0];
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching fixture ${matchId}:`, error);
    return null;
  }
} 