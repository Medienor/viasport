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
   * Fetch team standings
   * @param teamId Team ID
   * @returns Array of standings data
   */
  export async function fetchTeamStandings(teamId: number) {
    try {
      console.log(`Fetching standings for team ${teamId}`);
      
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
      console.log(`Leagues data for team ${teamId}:`, JSON.stringify(leaguesData, null, 2));
      
      if (!leaguesData.response || leaguesData.response.length === 0) {
        console.error(`No leagues found for team ${teamId}`);
        
        // Try a direct approach with Premier League
        console.log(`Trying direct Premier League standings for team ${teamId}`);
        const directResponse = await fetch(`${BASE_URL}/standings?league=39&season=2023`, {
          headers
        });
        
        if (directResponse.ok) {
          const directData = await directResponse.json();
          if (directData.response && directData.response.length > 0) {
            console.log(`Found Premier League standings for 2023`);
            return directData.response;
          }
        }
        
        return [];
      }
      
      // Step 2: Try specific seasons for each league
      const seasons = [2023, 2022, 2021, 2020, 2024];
      const leaguePromises = [];
      
      // Try to get standings for each league the team is in
      for (const leagueInfo of leaguesData.response) {
        const league = leagueInfo.league;
        console.log(`Checking standings for league ${league.id} (${league.name})`);
        
        // Try each season for this league
        for (const season of seasons) {
          console.log(`Trying season ${season} for league ${league.id}`);
          
          leaguePromises.push(
            fetch(`${BASE_URL}/standings?league=${league.id}&season=${season}`, {
              headers
            }).then(async res => {
              if (res.ok) {
                const data = await res.json();
                console.log(`Response for league ${league.id}, season ${season}:`, 
                  data.response && data.response.length > 0 ? 'Has data' : 'No data');
                return { data, league, season };
              }
              console.log(`Failed to fetch standings for league ${league.id}, season ${season}: ${res.status}`);
              return null;
            }).catch(err => {
              console.error(`Error fetching standings for league ${league.id}, season ${season}:`, err);
              return null;
            })
          );
        }
      }
      
      // Wait for all league standings requests to complete
      const leagueResults = await Promise.all(leaguePromises);
      
      // Filter out null results and empty responses
      const validResults = leagueResults.filter(result => 
        result && result.data && result.data.response && result.data.response.length > 0
      );
      
      if (validResults.length === 0) {
        console.error(`No valid standings found for any league for team ${teamId}`);
        
        // Try Premier League 2023 as a fallback
        console.log('Trying Premier League 2023 as fallback');
        const premierLeagueResponse = await fetch(`${BASE_URL}/standings?league=39&season=2023`, {
          headers
        });
        
        if (premierLeagueResponse.ok) {
          const premierLeagueData = await premierLeagueResponse.json();
          console.log('Premier League 2023 response:', 
            premierLeagueData.response && premierLeagueData.response.length > 0 ? 'Has data' : 'No data');
          
          if (premierLeagueData.response && premierLeagueData.response.length > 0) {
            return premierLeagueData.response;
          }
        }
        
        // Try Premier League 2022 as a last resort
        console.log('Trying Premier League 2022 as last resort');
        const premierLeague2022Response = await fetch(`${BASE_URL}/standings?league=39&season=2022`, {
          headers
        });
        
        if (premierLeague2022Response.ok) {
          const premierLeague2022Data = await premierLeague2022Response.json();
          console.log('Premier League 2022 response:', 
            premierLeague2022Data.response && premierLeague2022Data.response.length > 0 ? 'Has data' : 'No data');
          
          if (premierLeague2022Data.response && premierLeague2022Data.response.length > 0) {
            return premierLeague2022Data.response;
          }
        }
        
        return [];
      }
      
      // Sort by season (newest first) and return the first valid result
      validResults.sort((a, b) => b.season - a.season);
      console.log(`Returning standings for league ${validResults[0].league.id} (${validResults[0].league.name}), season ${validResults[0].season}`);
      return validResults[0].data.response;
    } catch (error) {
      console.error(`Error fetching standings for team ${teamId}:`, error);
      
      // Fallback to hardcoded Premier League standings
      console.log('Error occurred, using hardcoded Premier League standings');
      
      // Try Premier League 2023 as a fallback
      try {
        const premierLeagueResponse = await fetch(`${BASE_URL}/standings?league=39&season=2023`, {
          headers
        });
        
        if (premierLeagueResponse.ok) {
          const premierLeagueData = await premierLeagueResponse.json();
          if (premierLeagueData.response && premierLeagueData.response.length > 0) {
            return premierLeagueData.response;
          }
        }
      } catch (fallbackError) {
        console.error('Premier League 2023 fallback failed:', fallbackError);
      }
      
      // Try Premier League 2022 as a last resort
      try {
        const premierLeague2022Response = await fetch(`${BASE_URL}/standings?league=39&season=2022`, {
          headers
        });
        
        if (premierLeague2022Response.ok) {
          const premierLeague2022Data = await premierLeague2022Response.json();
          if (premierLeague2022Data.response && premierLeague2022Data.response.length > 0) {
            return premierLeague2022Data.response;
          }
        }
      } catch (fallbackError) {
        console.error('Premier League 2022 fallback failed:', fallbackError);
      }
      
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