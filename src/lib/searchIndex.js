import fetch from 'node-fetch';

// Define the API configuration with exact same format that worked
const headers = {
  "x-rapidapi-key": "1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90",
  "x-rapidapi-host": "api-football-v1.p.rapidapi.com"
};

// Let's first test with a simple endpoint
const TEST_URL = 'https://api-football-v1.p.rapidapi.com/v3/status';

// Popular leagues to fetch teams from
const POPULAR_LEAGUES = [
  39,   // Premier League
  140,  // La Liga
  135,  // Serie A
  78,   // Bundesliga
  61,   // Ligue 1
  2,    // Champions League
  3     // Europa League
];

export async function createSearchIndex() {
  const teams = [];
  const leagues = [];
  
  try {
    // First test the connection
    console.log('Testing API connection...');
    const testResponse = await fetch(TEST_URL, { headers });
    const testData = await testResponse.json();
    console.log('API Test Response:', testData);

    if (!testResponse.ok) {
      throw new Error(`API test failed with status ${testResponse.status}`);
    }

    // If test succeeds, proceed with actual data fetching
    console.log('API test successful, proceeding with data fetch...');

    console.log('Fetching teams...');
    console.log('Using API Key:', process.env.RAPID_API_KEY ? 'Present' : 'Missing');
    
    // Fetch teams from all popular leagues
    const teamsResponse = await fetch(
      `${BASE_URL}/teams?league=${POPULAR_LEAGUES.join(',')}`, 
      { headers }
    );
    
    if (!teamsResponse.ok) {
      const errorText = await teamsResponse.text();
      console.error('Teams API Error:', teamsResponse.status, errorText);
      throw new Error(`Teams API returned ${teamsResponse.status}`);
    }

    const teamsData = await teamsResponse.json();
    console.log('Teams API Response:', JSON.stringify(teamsData, null, 2));

    if (!teamsData || !teamsData.response) {
      throw new Error('Invalid teams API response format');
    }

    teams.push(...teamsData.response.map(item => ({
      id: item.team.id,
      name: item.team.name,
      type: 'team',
      logo: item.team.logo,
      country: item.team.country
    })));

    console.log(`Successfully fetched ${teams.length} teams`);

    // Fetch all leagues
    console.log('Fetching leagues...');
    const leaguesResponse = await fetch(`${BASE_URL}/leagues`, { headers });
    
    if (!leaguesResponse.ok) {
      const errorText = await leaguesResponse.text();
      console.error('Leagues API Error:', leaguesResponse.status, errorText);
      throw new Error(`Leagues API returned ${leaguesResponse.status}`);
    }

    const leaguesData = await leaguesResponse.json();
    console.log('Leagues API Response:', JSON.stringify(leaguesData, null, 2));

    if (!leaguesData || !leaguesData.response) {
      throw new Error('Invalid leagues API response format');
    }

    leagues.push(...leaguesData.response.map(item => ({
      id: item.league.id,
      name: item.league.name,
      type: 'league',
      logo: item.league.logo,
      country: item.country.name
    })));

    console.log(`Successfully fetched ${leagues.length} leagues`);

    // Return the combined data
    const combinedData = [...teams, ...leagues];
    console.log(`Total items in search index: ${combinedData.length}`);
    
    return combinedData;

  } catch (error) {
    console.error('Error creating search index:', error);
    console.error('Full error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response ? await error.response.text() : 'No response'
    });
    return null;
  }
} 