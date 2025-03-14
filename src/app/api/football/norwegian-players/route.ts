import { NextResponse } from 'next/server';
import { BASE_URL, headers } from '@/app/services/sportApi';

export async function GET() {
  try {
    console.log('Starting to fetch Norwegian players...');
    
    // Search for players from Norway directly
    const response = await fetch(
      `${BASE_URL}/players?nationality=Norway&season=2023`,
      { headers, cache: 'no-store' }
    );
    
    console.log(`Response status for Norwegian players: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Found ${data.response?.length || 0} players with Norwegian nationality`);
    
    // Process the players
    const norwegianPlayers = [];
    
    if (data.response && data.response.length > 0) {
      // Take up to 10 players
      const playersToProcess = data.response.slice(0, 10);
      
      for (const playerData of playersToProcess) {
        const player = playerData.player;
        
        // Check if player has statistics
        if (!playerData.statistics || playerData.statistics.length === 0) {
          console.log(`No statistics found for player ${player.id}`);
          continue;
        }
        
        const stats = playerData.statistics[0];
        
        norwegianPlayers.push({
          id: player.id,
          name: player.name,
          firstname: player.firstname,
          lastname: player.lastname,
          age: player.age,
          nationality: player.nationality,
          photo: `https://media.api-sports.io/football/players/${player.id}.png`,
          team: {
            id: stats.team.id,
            name: stats.team.name,
            logo: stats.team.logo
          },
          league: {
            id: stats.league.id,
            name: stats.league.name
          },
          statistics: stats
        });
      }
    }
    
    console.log(`Processed ${norwegianPlayers.length} Norwegian players`);
    
    return NextResponse.json({
      success: true,
      count: norwegianPlayers.length,
      players: norwegianPlayers,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching Norwegian players:', error);
    return NextResponse.json(
      { success: false, message: 'Error fetching Norwegian players data', players: [] },
      { status: 500 }
    );
  }
}