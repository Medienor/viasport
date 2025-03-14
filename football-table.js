#!/usr/bin/env node

//const https = require('https');
const API_KEY = 'a985a864bd184fcba3f0a89e92aadf08';

// Available leagues in free tier
const AVAILABLE_LEAGUES = {
  'PL': 'Premier League (England)',
  'BL1': 'Bundesliga (Germany)',
  'SA': 'Serie A (Italy)',
  'PD': 'La Liga (Spain)',
  'FL1': 'Ligue 1 (France)',
  'DED': 'Eredivisie (Netherlands)',
  'PPL': 'Primeira Liga (Portugal)',
  'CL': 'Champions League (Europe)',
  'EC': 'European Championship (Europe)',
  'WC': 'World Cup (World)',
  'ELC': 'Championship (England)',
  'BSA': 'Serie A (Brazil)'
};

// Parse command line arguments
const args = process.argv.slice(2);
const leagueCode = args[0] || 'PL'; // Default to Premier League if no league specified

if (!AVAILABLE_LEAGUES[leagueCode]) {
  console.log('Available leagues:');
  Object.entries(AVAILABLE_LEAGUES).forEach(([code, name]) => {
    console.log(`  ${code} - ${name}`);
  });
  process.exit(1);
}

// Function to make API requests
function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.football-data.org',
      path: `/v4/${endpoint}`,
      method: 'GET',
      headers: {
        'X-Auth-Token': API_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve(parsedData);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Function to display standings
async function displayStandings(leagueCode) {
  try {
    console.log(`Fetching standings for ${AVAILABLE_LEAGUES[leagueCode]}...\n`);
    
    const data = await makeRequest(`competitions/${leagueCode}/standings`);
    
    if (!data || !data.standings || !data.standings.length) {
      console.log('No standings data available.');
      return;
    }
    
    // Display competition info
    console.log(`${data.competition.name} (${data.competition.code})`);
    console.log(`Season: ${data.season.startDate} to ${data.season.endDate}`);
    console.log(`Current Matchday: ${data.season.currentMatchday || 'N/A'}\n`);
    
    // Display standings table
    const standings = data.standings[0]; // Usually the first one is TOTAL
    console.log(`${standings.type} Standings:`);
    
    // Format and display the table header
    console.log('Pos  Team                           P     W     D     L    GF    GA    GD   Pts');
    console.log('─────────────────────────────────────────────────────────────────────────────');
    
    // Display each team's stats
    standings.table.forEach(entry => {
      const position = entry.position.toString().padEnd(4);
      const team = entry.team.shortName || entry.team.name;
      const teamName = team.padEnd(30);
      const played = entry.playedGames.toString().padStart(4);
      const won = entry.won.toString().padStart(5);
      const draw = entry.draw.toString().padStart(5);
      const lost = entry.lost.toString().padStart(5);
      const goalsFor = entry.goalsFor.toString().padStart(5);
      const goalsAgainst = entry.goalsAgainst.toString().padStart(5);
      const goalDifference = entry.goalDifference.toString().padStart(5);
      const points = entry.points.toString().padStart(5);
      
      console.log(`${position}${teamName}${played}${won}${draw}${lost}${goalsFor}${goalsAgainst}${goalDifference}${points}`);
    });
    
  } catch (error) {
    console.error('Error fetching standings:', error.message);
    if (error.message.includes('429')) {
      console.log('You have exceeded your rate limit. Please try again later.');
    }
  }
}

// Run the script
displayStandings(leagueCode); 