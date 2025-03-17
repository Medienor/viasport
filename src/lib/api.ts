import {
    getTeamInfo,
    getTeamSquad,
    getTeamMatches,
    getLeagueSeasons,
    BASE_URL,
    headers
  } from '@/app/services/sportApi';
import { useAPITracking } from './stores/apiTracking';
  
  /**
   * Fetch basic team data
   * @param teamId - Team ID
   * @returns Team data including name, logo, country, etc.
   */
  export async function fetchTeamData(teamId: number) {
    try {
      console.log(`[fetchTeamData] Starting fetch for team ID: ${teamId}`);
      
      const teamInfo = await getTeamInfo(teamId);
      console.log(`[fetchTeamData] Raw API response:`, JSON.stringify(teamInfo, null, 2));
      
      if (!teamInfo || teamInfo.length === 0) {
        console.error(`[fetchTeamData] No team info returned for ID: ${teamId}`);
        return null;
      }
      
      // The API returns the team directly, not wrapped in a 'team' property
      // Let's format it to match what the component expects
      return {
        team: teamInfo
      };
    } catch (error) {
      console.error(`[fetchTeamData] Error fetching team data for ID ${teamId}:`, error);
      return null;
    }
  }
  
  /**
   * Fetch leagues that the team participates in
   * @param teamId - Team ID
   * @returns Array of leagues with their seasons
   */
  export async function fetchTeamLeagues(teamId: number) {
    try {
      // For demo purposes, we'll return a few major leagues
      // In a real implementation, you would determine which leagues the team is in
      const leagueIds = [2, 39, 61]; // Champions League, Premier League, Ligue 1
      const leaguePromises = leagueIds.map(id => getLeagueSeasons(id));
      const leagueData = await Promise.all(leaguePromises);
      
      // Format the data to match what the component expects
      return leagueData
        .filter(data => data && data.length > 0)
        .map(data => {
          // Ensure each league has the expected structure
          return {
            league: {
              id: data[0].league.id,
              name: data[0].league.name,
              logo: data[0].league.logo,
              country: data[0].league.country
            },
            seasons: data[0].seasons || []
          };
        });
    } catch (error) {
      console.error(`Error fetching team leagues for ID ${teamId}:`, error);
      return [];
    }
  }
  
  /**
   * Fetch team standings - optimized version to reduce API calls
   * @param teamId Team ID
   * @returns Array of standings data for the most relevant league and season
   */
  export async function fetchTeamStandings(teamId: number) {
    try {
      console.log(`Fetching standings for team ${teamId} (optimized)`);
      
      // Step 1: Get the leagues the team plays in
      console.log(`Getting leagues for team ${teamId}`);
      const leaguesResponse = await fetch(`${BASE_URL}/leagues?team=${teamId}`, {
        headers
      });
      
      if (!leaguesResponse.ok) {
        console.error(`Failed to fetch leagues for team ${teamId}: ${leaguesResponse.status}`);
        throw new Error(`Failed to fetch leagues for team ${teamId}: ${leaguesResponse.status}`);
      }
      
      const leaguesData = await leaguesResponse.json();
      
      if (!leaguesData.response || leaguesData.response.length === 0) {
        console.log(`No leagues found for team ${teamId}, trying Premier League as fallback`);
        
        // Try Premier League current season as fallback
        const currentYear = new Date().getFullYear();
        const currentSeason = new Date().getMonth() >= 6 ? currentYear : currentYear - 1;
        
        const premierLeagueResponse = await fetch(`${BASE_URL}/standings?league=39&season=${currentSeason}`, {
          headers
        });
        
        if (premierLeagueResponse.ok) {
          const premierLeagueData = await premierLeagueResponse.json();
          if (premierLeagueData.response && premierLeagueData.response.length > 0) {
            return premierLeagueData.response;
          }
        }
        
        return [];
      }
      
      // Step 2: Find the most relevant league
      // Priority: 1. Domestic league (Premier League, La Liga, etc.)
      //           2. Champions League
      //           3. Europa League
      //           4. Any other league
      
      // Define priority leagues
      const priorityLeagueIds = [
        // Domestic leagues
        39,  // Premier League
        140, // La Liga
        78,  // Bundesliga
        135, // Serie A
        61,  // Ligue 1
        71,  // Eliteserien (Norway)
        
        // European competitions
        2,   // Champions League
        3,   // Europa League
        848, // Conference League
      ];
      
      // Sort leagues by priority
      const sortedLeagues = [...leaguesData.response].sort((a, b) => {
        const aPriority = priorityLeagueIds.indexOf(a.league.id);
        const bPriority = priorityLeagueIds.indexOf(b.league.id);
        
        // If both leagues are in priority list, sort by their position
        if (aPriority !== -1 && bPriority !== -1) {
          return aPriority - bPriority;
        }
        
        // If only one is in priority list, it comes first
        if (aPriority !== -1) return -1;
        if (bPriority !== -1) return 1;
        
        // Otherwise, sort by league ID (arbitrary but consistent)
        return a.league.id - b.league.id;
      });
      
      // Get current season
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentSeason = currentDate.getMonth() >= 6 ? currentYear : currentYear - 1;
      
      // Try the most relevant league first
      for (const leagueInfo of sortedLeagues) {
        const league = leagueInfo.league;
        console.log(`Trying standings for priority league ${league.id} (${league.name})`);
        
        // Try current season first
        console.log(`Fetching standings for league ${league.id}, season ${currentSeason}`);
        
        try {
          const response = await fetch(`${BASE_URL}/standings?league=${league.id}&season=${currentSeason}`, {
            headers
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.response && data.response.length > 0) {
              console.log(`Found standings for league ${league.id} (${league.name}), season ${currentSeason}`);
              return data.response;
            }
          }
        } catch (error) {
          console.error(`Error fetching standings for league ${league.id}, season ${currentSeason}:`, error);
        }
        
        // If current season doesn't have data, try previous season
        const previousSeason = currentSeason - 1;
        console.log(`Trying previous season ${previousSeason} for league ${league.id}`);
        
        try {
          const response = await fetch(`${BASE_URL}/standings?league=${league.id}&season=${previousSeason}`, {
            headers
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.response && data.response.length > 0) {
              console.log(`Found standings for league ${league.id} (${league.name}), season ${previousSeason}`);
              return data.response;
            }
          }
        } catch (error) {
          console.error(`Error fetching standings for league ${league.id}, season ${previousSeason}:`, error);
        }
      }
      
      // If we get here, we couldn't find standings for any league
      console.log(`No standings found for any league for team ${teamId}, trying Premier League fallback`);
      
      // Try Premier League as last resort
      const premierLeagueResponse = await fetch(`${BASE_URL}/standings?league=39&season=${currentSeason}`, {
        headers
      });
      
      if (premierLeagueResponse.ok) {
        const premierLeagueData = await premierLeagueResponse.json();
        if (premierLeagueData.response && premierLeagueData.response.length > 0) {
          return premierLeagueData.response;
        }
      }
      
      return [];
    } catch (error) {
      console.error(`Error fetching standings for team ${teamId}:`, error);
      return [];
    }
  }
  
  /**
   * Fetch team matches (upcoming or past)
   * @param teamId - Team ID
   * @param type - Type of matches to fetch ('upcoming' or 'past')
   * @returns Array of match data
   */
  export async function fetchTeamMatches(teamId: number, type: 'upcoming' | 'past') {
    try {
      if (type === 'upcoming') {
        // Use the existing function for upcoming matches
        return await getTeamMatches(teamId, 'NS', 10);
      } else {
        // Use the existing function for past matches
        return await getTeamMatches(teamId, 'FT', 10);
      }
    } catch (error) {
      console.error(`Error fetching ${type} matches for team ID ${teamId}:`, error);
      return [];
    }
  }
  
  /**
   * Fetch team players
   * @param teamId - Team ID
   * @returns Array of player data
   */
  export async function fetchTeamPlayers(teamId: number) {
    try {
      const squad = await getTeamSquad(teamId);
      
      return squad.map(player => ({
        id: player.id,
        name: player.name,
        age: player.age,
        number: player.number,
        position: player.position,
        photo: player.photo || `https://media.api-sports.io/football/players/${player.id}.png`,
        nationality: player.nationality
      }));
    } catch (error) {
      console.error(`Error fetching players for team ID ${teamId}:`, error);
      return [];
    }
  }
  
  // Export the trackedFetch function
  export const trackedFetch = async (url: string, options?: RequestInit) => {
    try {
      // Extract the endpoint path from the URL
      const endpoint = new URL(url).pathname;
      
      // Increment the request counter
      useAPITracking.getState().incrementRequest(endpoint);
      
      // Make the actual fetch request
      return await fetch(url, options);
    } catch (error) {
      console.error('Error in trackedFetch:', error);
      throw error;
    }
  };

  // Remove the duplicate fetchTeamData and update the existing one to use trackedFetch
  export async function fetchTeamTransfers(teamId: number) {
    try {
      const response = await trackedFetch(`https://api-football-v1.p.rapidapi.com/v3/transfers?team=${teamId}`, {
        headers: {
          'x-rapidapi-key': '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90',
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
        },
        next: { revalidate: 86400 } // Cache for 24 hours
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.response || [];
    } catch (error) {
      console.error('Error fetching team transfers:', error);
      return [];
    }
  }

  // Update other fetch calls to use trackedFetch
  export async function fetchTeamInjuries(teamId: number, season: number = new Date().getFullYear()) {
    try {
      console.log(`Fetching injuries for team ${teamId}, season ${season}`);
      
      const response = await trackedFetch(`https://api-football-v1.p.rapidapi.com/v3/injuries?team=${teamId}&season=${season}`, {
        headers: {
          'x-rapidapi-key': '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90',
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
        },
        next: { revalidate: 3600 } // Cache for 1 hour
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Injuries response for team ${teamId}, season ${season}:`, data);
      
      return data.response || [];
    } catch (error) {
      console.error(`Error fetching team injuries for ID ${teamId}, season ${season}:`, error);
      return [];
    }
  }

  /**
   * Fetch all leagues a team is participating in with standings
   * @param teamId Team ID
   * @returns Array of leagues with their IDs and seasons
   */
  export async function fetchTeamLeaguesWithStandings(teamId: number) {
    try {
      console.log(`Fetching leagues with standings for team ${teamId}`);
      
      // Step 1: Get all leagues the team is in
      const leaguesResponse = await fetch(`${BASE_URL}/leagues?team=${teamId}&current=true`, {
        headers
      });
      
      if (!leaguesResponse.ok) {
        throw new Error(`Failed to fetch leagues for team ${teamId}`);
      }
      
      const leaguesData = await leaguesResponse.json();
      console.log(`Found ${leaguesData.results} leagues for team ${teamId}`);
      
      // Step 2: Filter leagues that have standings available
      const leaguesWithStandings = [];
      
      if (leaguesData.response && leaguesData.response.length > 0) {
        for (const leagueInfo of leaguesData.response) {
          const league = leagueInfo.league;
          const season = leagueInfo.seasons[0];
          
          // Check if standings are available for this league
          if (season && season.coverage && season.coverage.standings) {
            leaguesWithStandings.push({
              id: league.id,
              name: league.name,
              logo: league.logo,
              type: league.type,
              country: leagueInfo.country.name,
              season: season.year,
              current: season.current
            });
          }
        }
      }
      
      console.log(`Found ${leaguesWithStandings.length} leagues with standings for team ${teamId}`);
      return leaguesWithStandings;
    } catch (error) {
      console.error(`Error fetching leagues with standings for team ${teamId}:`, error);
      return [];
    }
  }

  /**
   * Fetch standings for a specific league and season
   * @param leagueId League ID
   * @param season Season year
   * @returns Array of standings data
   */
  export async function fetchLeagueStandings(leagueId: number, season: number) {
    try {
      console.log(`Fetching standings for league ${leagueId}, season ${season}`);
      
      const response = await fetch(`${BASE_URL}/standings?league=${leagueId}&season=${season}`, {
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch standings for league ${leagueId}, season ${season}`);
      }
      
      const data = await response.json();
      
      if (data.response && data.response.length > 0) {
        return data.response;
      }
      
      return [];
    } catch (error) {
      console.error(`Error fetching standings for league ${leagueId}, season ${season}:`, error);
      return [];
    }
  }

  /**
   * Fetch player data by ID
   * @param playerId - The ID of the player to fetch
   * @returns Player data including statistics
   */
  export async function fetchPlayerById(playerId: number) {
    try {
      console.log(`[fetchPlayerById] Starting fetch for player ID: ${playerId}`);
      
      // Fetch player information
      const playerResponse = await fetch(`https://api-football-v1.p.rapidapi.com/v3/players?id=${playerId}&season=${new Date().getFullYear()}`, {
        headers: {
          'x-rapidapi-key': '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90',
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
        },
        next: { revalidate: 86400 } // Cache for 24 hours
      });

      if (!playerResponse.ok) {
        throw new Error(`API error: ${playerResponse.status}`);
      }

      const playerData = await playerResponse.json();
      console.log(`[fetchPlayerById] Player data response:`, playerData.results > 0 ? 'Data found' : 'No data found');
      
      if (!playerData.response || playerData.response.length === 0) {
        // Try with previous year if current year doesn't have data
        const prevYearResponse = await fetch(`https://api-football-v1.p.rapidapi.com/v3/players?id=${playerId}&season=${new Date().getFullYear() - 1}`, {
          headers: {
            'x-rapidapi-key': '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90',
            'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
          },
          next: { revalidate: 86400 } // Cache for 24 hours
        });
        
        if (!prevYearResponse.ok) {
          throw new Error(`API error: ${prevYearResponse.status}`);
        }
        
        const prevYearData = await prevYearResponse.json();
        
        if (!prevYearData.response || prevYearData.response.length === 0) {
          console.error(`[fetchPlayerById] No player data found for ID: ${playerId}`);
          return null;
        }
        
        return prevYearData.response[0];
      }
      
      // Fetch player transfers
      const transfersResponse = await fetch(`https://api-football-v1.p.rapidapi.com/v3/transfers?player=${playerId}`, {
        headers: {
          'x-rapidapi-key': '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90',
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
        },
        next: { revalidate: 86400 } // Cache for 24 hours
      });
      
      let transfers = [];
      if (transfersResponse.ok) {
        const transfersData = await transfersResponse.json();
        transfers = transfersData.response || [];
      }
      
      // Combine player data with transfers
      const playerInfo = playerData.response[0];
      playerInfo.transfers = transfers;
      
      return playerInfo;
    } catch (error) {
      console.error(`[fetchPlayerById] Error fetching player data for ID ${playerId}:`, error);
      return null;
    }
  }

  /**
   * Search for players by name
   * @param searchQuery - The name to search for
   * @returns Array of player search results
   */
  export async function searchPlayers(searchQuery: string) {
    try {
      if (!searchQuery || searchQuery.length < 3) {
        return [];
      }
      
      console.log(`[searchPlayers] Searching for players with query: ${searchQuery}`);
      
      const response = await fetch(`https://api-football-v1.p.rapidapi.com/v3/players?search=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'x-rapidapi-key': '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90',
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
        },
        next: { revalidate: 3600 } // Cache for 1 hour
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[searchPlayers] Found ${data.results} players matching query: ${searchQuery}`);
      
      return data.response || [];
    } catch (error) {
      console.error(`[searchPlayers] Error searching players with query ${searchQuery}:`, error);
      return [];
    }
  }

  /**
   * Create a URL-friendly slug for a player
   * @param name - Player name
   * @param id - Player ID
   * @returns URL-friendly slug
   */
  export function createPlayerSlug(name: string, id: number) {
    if (!name) return `player-${id}`;
    
    // Convert to lowercase, replace spaces with hyphens, remove special characters
    const nameSlug = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
    
    return `${nameSlug}-${id}`;
  }

  // Fetch player teams data
  export async function fetchPlayerTeams(playerId: number) {
    try {
      const response = await fetch(`https://api-football-v1.p.rapidapi.com/v3/players/teams?player=${playerId}`, {
        headers: {
          'x-rapidapi-key': '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90',
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
        },
        next: { revalidate: 86400 } // Cache for 24 hours
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch player teams: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching player teams:', error);
      return null;
    }
  }

  // Add this function if it doesn't exist already
  export function createTeamSlug(teamName: string, teamId: number): string {
    const nameSlug = teamName
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
    
    return `${nameSlug}-${teamId}`;
  }