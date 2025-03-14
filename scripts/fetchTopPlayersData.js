import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const API_KEY = '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90';
const BASE_URL = 'https://api-football-v1.p.rapidapi.com/v3';

const headers = {
  'x-rapidapi-key': API_KEY,
  'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
};

// Leagues to fetch data for
const LEAGUES = [
  { id: 39, name: 'Premier League', country: 'England' },
  { id: 140, name: 'La Liga', country: 'Spain' },
  { id: 78, name: 'Bundesliga', country: 'Germany' },
  { id: 135, name: 'Serie A', country: 'Italy' },
  { id: 61, name: 'Ligue 1', country: 'France' },
  { id: 1, name: 'Eliteserien', country: 'Norway' }
];

// Categories to fetch
const CATEGORIES = [
  { endpoint: 'topscorers', name: 'scorers' },
  { endpoint: 'topassists', name: 'assists' },
  { endpoint: 'topredcards', name: 'redcards' }
];

// Current season
const CURRENT_SEASON = '2023';

async function fetchTopPlayers() {
  console.log('Fetching top players data...');
  
  const allData = {};
  
  try {
    for (const league of LEAGUES) {
      console.log(`Processing league: ${league.name} (${league.id})`);
      allData[league.id] = {
        id: league.id,
        name: league.name,
        country: league.country,
        categories: {}
      };
      
      for (const category of CATEGORIES) {
        console.log(`  Fetching ${category.name}...`);
        
        const url = `${BASE_URL}/players/${category.endpoint}?league=${league.id}&season=${CURRENT_SEASON}`;
        const response = await fetch(url, { headers });
        
        if (!response.ok) {
          console.error(`  API error for ${category.name}: ${response.status}`);
          continue;
        }
        
        const result = await response.json();
        
        if (result.response && Array.isArray(result.response)) {
          // Store only the top 10 players for each category
          allData[league.id].categories[category.name] = result.response.slice(0, 10);
          console.log(`  Found ${result.response.length} players, stored top 10`);
        } else {
          console.error(`  No data found for ${category.name}`);
          allData[league.id].categories[category.name] = [];
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return allData;
  } catch (error) {
    console.error('Error fetching top players data:', error);
    return {};
  }
}

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Starting to fetch top players data...');
  
  const topPlayersData = await fetchTopPlayers();
  
  // Create the data file
  const dataContent = `// Auto-generated file - do not edit manually
// Last updated: ${new Date().toISOString()}

export const topPlayersData = ${JSON.stringify(topPlayersData, null, 2)};
`;
  
  // Ensure the data directory exists
  const dataDir = path.join(__dirname, '../src/app/data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const filePath = path.join(dataDir, 'topPlayersData.ts');
  fs.writeFileSync(filePath, dataContent);
  
  console.log(`Top players data written to ${filePath}`);
}

main().catch(error => {
  console.error('Error in fetch script:', error);
  process.exit(1);
}); 