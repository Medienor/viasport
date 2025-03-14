import fs from 'fs';
import path from 'path';
import { BASE_URL, headers } from '../src/app/services/sportApi.js';

interface PlayerResponse {
  player: {
    id: number;
    name: string;
    firstname: string;
    lastname: string;
    age: number;
    nationality: string;
    photo: string;
    birth: {
      date: string;
      place?: string;
      country?: string;
    };
  };
  statistics: Array<{
    team: {
      id: number;
      name: string;
      logo: string;
    };
    league: {
      id: number;
      name: string;
    };
  }>;
}

async function fetchAndSaveNorwegianPlayers() {
  try {
    const norwegianPlayers = [];
    const norwegianSearchTerms = ['sen', 'son', 'land', 'gaard', 'berg', 'haaland'];
    
    console.log('Starting to fetch Norwegian players...');

    for (const searchTerm of norwegianSearchTerms) {
      console.log(`Searching for players with '${searchTerm}'...`);
      
      const response = await fetch(
        `${BASE_URL}/players/profiles?search=${searchTerm}`,
        { headers }
      );

      if (!response.ok) continue;

      const data = await response.json();
      const norwegians = data.response.filter((entry: PlayerResponse) => 
        entry.player.nationality === "Norway"
      );
      
      for (const entry of norwegians) {
        const player = entry.player;
        const statsResponse = await fetch(
          `${BASE_URL}/players?id=${player.id}&season=2023`,
          { headers }
        );

        if (!statsResponse.ok) continue;

        const statsData = await statsResponse.json();
        const currentStats = statsData.response[0];

        if (currentStats?.statistics?.length > 0) {
          norwegianPlayers.push({
            id: player.id,
            name: player.name,
            firstname: player.firstname,
            lastname: player.lastname,
            age: player.age,
            nationality: player.nationality,
            photo: `https://media.api-sports.io/football/players/${player.id}.png`,
            birth: player.birth,
            team: {
              id: currentStats.statistics[0].team.id,
              name: currentStats.statistics[0].team.name,
              logo: currentStats.statistics[0].team.logo
            },
            league: {
              id: currentStats.statistics[0].league.id,
              name: currentStats.statistics[0].league.name
            },
            statistics: currentStats.statistics[0]
          });
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const uniquePlayers = Array.from(new Map(norwegianPlayers.map(player => 
      [player.id, player]
    )).values());

    // Save to public directory
    const filePath = path.join(process.cwd(), 'public', 'data', 'norwegianPlayers.json');
    
    // Ensure directory exists
    fs.mkdirSync(path.join(process.cwd(), 'public', 'data'), { recursive: true });
    
    // Save the data with timestamp
    fs.writeFileSync(filePath, JSON.stringify({
      success: true,
      count: uniquePlayers.length,
      players: uniquePlayers,
      lastUpdated: new Date().toISOString()
    }, null, 2));

    console.log(`Saved ${uniquePlayers.length} Norwegian players to public/data/norwegianPlayers.json`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fetchAndSaveNorwegianPlayers();