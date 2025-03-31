import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');
let envPath = path.join(rootDir, '.env.local');
if (!fs.existsSync(envPath)) {
  envPath = path.join(rootDir, '.env');
}
dotenv.config({ path: envPath });

const RAPID_API_KEY = process.env.RAPID_API_KEY || '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90';

async function testFootballApi() {
  console.log('Testing Football API connection...');
  
  try {
    // Step 1: Get fixtures from football API
    console.log('Fetching fixtures...');
    const response = await axios.get(
      'https://api-football-v1.p.rapidapi.com/v3/fixtures?league=39&season=2024',
      {
        headers: {
          'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com',
          'X-RapidAPI-Key': RAPID_API_KEY
        }
      }
    );

    // Log the raw response
    console.log('\nRaw API Response:', JSON.stringify(response.data, null, 2));

    // Take only first 3 fixtures for testing
    const fixtures = (response.data.response || []).slice(0, 3);
    
    // Format fixtures like in the main script
    const formattedFixtures = fixtures.map((fixture: any) => ({
      id: fixture.fixture.id,
      date: fixture.fixture.date,
      league_id: 39,
      home_team_id: fixture.teams.home.id,
      away_team_id: fixture.teams.away.id,
      status: fixture.fixture.status,
      score: fixture.score,
      venue: fixture.fixture.venue,
      referee: fixture.fixture.referee,
      timezone: fixture.fixture.timezone,
      timestamp: fixture.fixture.timestamp,
      periods: fixture.fixture.periods,
      round: fixture.league.round,
      goals: fixture.goals,
      fixture: fixture.fixture,
      league: fixture.league,
      updated_at: new Date().toISOString()
    }));

    console.log('\nFormatted Fixtures:', JSON.stringify(formattedFixtures, null, 2));
    
    if (formattedFixtures.length === 0) {
      console.log('❌ No fixtures found!');
      return;
    }

    console.log('✅ Successfully fetched and formatted fixtures!');
    console.log(`Found ${formattedFixtures.length} fixtures`);

  } catch (error) {
    console.error('❌ Error:', error);
    if (axios.isAxiosError(error)) {
      console.error('API Response:', error.response?.data);
    }
  }
}

// Run the test
testFootballApi(); 