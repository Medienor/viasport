import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

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
    return data.response.map(item => ({
      id: item.team.id,
      name: item.team.name,
      type: 'team',
      logo: item.team.logo,
      country: item.team.country,
      league: leagueId
    }));
  } catch (error) {
    console.error(`Error fetching teams for league ${leagueId}:`, error);
    return [];
  }
}

async function fetchLeagues() {
  console.log('Fetching leagues...');
  try {
    const response = await fetch(`${BASE_URL}/leagues`, { headers });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.response
      .filter(item => LEAGUES.some(l => l.id === item.league.id))
      .map(item => ({
        id: item.league.id,
        name: item.league.name,
        type: 'league',
        logo: item.league.logo,
        country: item.country.name
      }));
  } catch (error) {
    console.error('Error fetching leagues:', error);
    return [];
  }
}

async function generateSearchIndex() {
  console.log('Starting to generate search index...');
  
  const teams = [];
  for (const league of LEAGUES) {
    const leagueTeams = await fetchTeamsForLeague(league.id);
    teams.push(...leagueTeams);
  }
  
  const leagues = await fetchLeagues();
  
  const searchIndex = [...teams, ...leagues];
  
  // Create the data file
  const dataContent = JSON.stringify(searchIndex, null, 2);
  
  const filePath = path.join(__dirname, '../public/searchIndex.json');
  fs.writeFileSync(filePath, dataContent);
  
  console.log(`Search index with ${searchIndex.length} items written to ${filePath}`);
}

generateSearchIndex().catch(error => {
  console.error('Error in generate script:', error);
  process.exit(1);
}); 