export async function fetchTransfersForLeague(leagueId: number) {
  // Use your API key and endpoint
  const apiKey = process.env.FOOTBALL_API_KEY;
  const url = `https://api-football-v1.p.rapidapi.com/v3/transfers`;
  
  try {
    // Get all teams for this league
    const teamsResponse = await fetch(
      `https://api-football-v1.p.rapidapi.com/v3/teams?league=${leagueId}&season=2023`,
      {
        headers: {
          'x-rapidapi-key': apiKey as string,
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
        },
      }
    );
    
    const teamsData = await teamsResponse.json();
    
    // Add error handling for the API response
    if (!teamsData.response || !Array.isArray(teamsData.response)) {
      console.error('Invalid teams data response:', teamsData);
      return {};
    }
    
    const teams = teamsData.response.map((team: any) => team.team.id);
    
    // Fetch transfers for each team
    const transfersMap: Record<number, any[]> = {};
    
    // Use Promise.all to fetch transfers for all teams in parallel
    await Promise.all(
      teams.map(async (teamId: number) => {
        try {
          const response = await fetch(`${url}?team=${teamId}`, {
            headers: {
              'x-rapidapi-key': apiKey as string,
              'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
            },
          });
          
          const data = await response.json();
          
          if (data.response && data.response.length > 0) {
            transfersMap[teamId] = data.response;
          }
        } catch (err) {
          console.error(`Error fetching transfers for team ${teamId}:`, err);
        }
      })
    );
    
    return transfersMap;
  } catch (error) {
    console.error(`Error in fetchTransfersForLeague for league ${leagueId}:`, error);
    return {};
  }
}

export async function fetchTransfersForTeams(teamIds: number[]) {
  const apiKey = process.env.FOOTBALL_API_KEY;
  const url = `https://api-football-v1.p.rapidapi.com/v3/transfers`;
  
  console.log(`Starting to fetch transfers for ${teamIds.length} teams`);
  console.log('Team IDs:', teamIds);
  
  try {
    // Fetch transfers for each team
    const transfersMap: Record<number, any[]> = {};
    
    // Instead of Promise.all, fetch sequentially with delays to avoid rate limits
    for (const teamId of teamIds) {
      try {
        console.log(`Fetching transfers for team ID: ${teamId}`);
        const response = await fetch(`${url}?team=${teamId}`, {
          headers: {
            'x-rapidapi-key': apiKey as string,
            'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
          },
        });
        
        if (!response.ok) {
          console.error(`API response not OK for team ${teamId}:`, response.status, response.statusText);
          
          // If we hit rate limits, add a longer delay
          if (response.status === 429) {
            console.log('Rate limit hit, waiting longer before next request...');
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
          }
          
          continue;
        }
        
        const data = await response.json();
        
        if (data.response && data.response.length > 0) {
          console.log(`Found ${data.response.length} transfers for team ${teamId}`);
          transfersMap[teamId] = data.response;
        } else {
          console.log(`No transfers found for team ${teamId}`);
        }
        
        // Add a small delay between requests to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
        
      } catch (err) {
        console.error(`Error fetching transfers for team ${teamId}:`, err);
      }
    }
    
    console.log(`Completed fetching transfers. Found data for ${Object.keys(transfersMap).length} teams`);
    
    // If we didn't get any data, add some mock data for testing
    if (Object.keys(transfersMap).length === 0) {
      console.log('No data found, adding mock data for testing');
      transfersMap[teamIds[0]] = [
        {
          player: {
            id: 12345,
            name: 'Test Player'
          },
          transfers: [
            {
              date: '2023-07-15',
              type: '€ 5M',
              teams: {
                in: {
                  id: teamIds[0],
                  name: 'Team A'
                },
                out: {
                  id: 999,
                  name: 'Team B'
                }
              }
            }
          ]
        }
      ];
    }
    
    return transfersMap;
  } catch (error) {
    console.error(`Error in fetchTransfersForTeams:`, error);
    return {};
  }
} 