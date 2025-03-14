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

async function fetchAllLeagues() {
  console.log('Fetching all leagues...');
  
  try {
    // Fetch leagues from API
    const leaguesResponse = await fetch(`${BASE_URL}/leagues`, { headers });
    
    if (!leaguesResponse.ok) {
      throw new Error(`API error: ${leaguesResponse.status}`);
    }
    
    const leaguesResult = await leaguesResponse.json();
    let leaguesData = leaguesResult.response || [];
    
    // Filter out leagues without proper data
    leaguesData = leaguesData.filter(league => 
      league.league && 
      league.league.id && 
      league.league.name && 
      league.country && 
      league.country.name
    );
    
    // Sort leagues by country and then by name
    leaguesData.sort((a, b) => {
      if (a.country.name === b.country.name) {
        return a.league.name.localeCompare(b.league.name);
      }
      return a.country.name.localeCompare(b.country.name);
    });
    
    console.log(`Found ${leaguesData.length} leagues`);
    
    // Fetch countries
    console.log('Fetching all countries...');
    const countriesResponse = await fetch(`${BASE_URL}/countries`, { headers });
    
    if (!countriesResponse.ok) {
      throw new Error(`API error: ${countriesResponse.status}`);
    }
    
    const countriesResult = await countriesResponse.json();
    const countriesData = countriesResult.response || [];
    
    console.log(`Found ${countriesData.length} countries`);
    
    return {
      leagues: leaguesData,
      countries: countriesData
    };
  } catch (error) {
    console.error('Error fetching leagues data:', error);
    return {
      leagues: [],
      countries: []
    };
  }
}

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Starting to fetch leagues data...');
  
  const { leagues, countries } = await fetchAllLeagues();
  
  // Create the data file
  const dataContent = `// Auto-generated file - do not edit manually
// Last updated: ${new Date().toISOString()}

export const leaguesData = ${JSON.stringify(leagues, null, 2)};
export const countriesData = ${JSON.stringify(countries, null, 2)};
`;
  
  const filePath = path.join(__dirname, '../src/app/data/leaguesData.ts');
  fs.writeFileSync(filePath, dataContent);
  
  console.log(`Leagues data written to ${filePath}`);
}

main().catch(error => {
  console.error('Error in fetch script:', error);
  process.exit(1);
}); 