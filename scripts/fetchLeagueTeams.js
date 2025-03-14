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

const LEAGUES = [
  { id: 39, name: 'Premier League' },
  { id: 2, name: 'Champions League' },
  { id: 140, name: 'La Liga' },
  { id: 135, name: 'Serie A' },
  { id: 78, name: 'Bundesliga' },
];

async function fetchTeamsForLeague(leagueId) {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const seasonYear = currentDate.getMonth() >= 6 ? currentYear : currentYear - 1;
  
  console.log(`Fetching teams for league ${leagueId} (season ${seasonYear})...`);
  
  try {
    const response = await fetch(`${BASE_URL}/teams?league=${leagueId}&season=${seasonYear}`, {
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
    
    console.log(`Found ${data.response.length} teams for league ${leagueId}`);
    return data.response;
  } catch (error) {
    console.error(`Error fetching teams for league ${leagueId}:`, error);
    return [];
  }
}

async function fetchAllLeagueTeams() {
  const leagueTeams = {};
  
  for (const league of LEAGUES) {
    leagueTeams[league.id] = await fetchTeamsForLeague(league.id);
  }
  
  return leagueTeams;
}

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Starting to fetch teams for all leagues...');
  
  const leagueTeams = await fetchAllLeagueTeams();
  
  // Create the data file
  const dataContent = `// Auto-generated file - do not edit manually
// Last updated: ${new Date().toISOString()}

export const leagueTeamsData = ${JSON.stringify(leagueTeams, null, 2)};
`;
  
  const filePath = path.join(__dirname, '../src/app/data/leagueTeams.ts');
  fs.writeFileSync(filePath, dataContent);
  
  console.log(`League teams data written to ${filePath}`);
}

main().catch(error => {
  console.error('Error in fetch script:', error);
  process.exit(1);
}); 