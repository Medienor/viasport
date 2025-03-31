import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import axios from 'axios';

// Load environment variables from .env.local in the project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');

// Try to load from .env.local first, then fall back to .env
let envPath = path.join(rootDir, '.env.local');
if (!fs.existsSync(envPath)) {
  envPath = path.join(rootDir, '.env');
}
dotenv.config({ path: envPath });

// Supabase setup (same as our working test file)
const supabaseUrl = 'https://cdynfbwdwdsiwkgiua.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkeW5mYndkd2Rmc2l3a2dpeHVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjU3ODQwMSwiZXhwIjoyMDU4MTU0NDAxfQ.5V7CbSCE4lb3FbJUa3kgipRPWXG4LeVRCf7eeLSrSoI';
const supabase = createClient(supabaseUrl, supabaseKey);

const RAPID_API_KEY = '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90';

// Progress tracking interface
export interface FixtureProgress {
  totalFixtures: number;
  processedFixtures: number;
  apiCalls: number;
}

export async function updateFixtureData(
  leagueId: number = 39,
  progressCallback?: (progress: FixtureProgress) => void
) {
  const progress: FixtureProgress = {
    totalFixtures: 0,
    processedFixtures: 0,
    apiCalls: 0
  };

  try {
    console.log(`Fetching fixtures for league ${leagueId}...`);
    
    // Test Supabase connection first
    console.log('Testing Supabase connection...');
    try {
      const { data, error } = await supabase.from('fixtures').select('count').limit(1);
      if (error) throw error;
      console.log('Supabase connection successful');
    } catch (e) {
      console.error('Supabase connection test failed:', e);
      throw e;
    }

    // Step 1: Get fixtures from football API
    progress.apiCalls++;
    const response = await axios.get(
      `https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${leagueId}&season=2024`,
      {
        headers: {
          'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com',
          'X-RapidAPI-Key': RAPID_API_KEY
        }
      }
    );

    // Take only first 3 fixtures for testing
    const fixtures = (response.data.response || []).slice(0, 3);
    console.log(`Testing with first 3 fixtures from league ${leagueId}`);
    
    progress.totalFixtures = fixtures.length;
    progressCallback?.(progress);

    // Step 2: Format fixtures
    const formattedFixtures = fixtures.map((fixture: any) => ({
      id: fixture.fixture.id,
      date: fixture.fixture.date,
      league_id: leagueId,
      home_team_id: fixture.teams.home.id,
      away_team_id: fixture.teams.away.id,
      status: fixture.fixture.status.short,
      score: fixture.score,
      venue: fixture.fixture.venue,
      updated_at: new Date().toISOString()
    }));

    console.log('\nTest Fixtures to process:', JSON.stringify(formattedFixtures, null, 2));

    // Step 3: Insert into Supabase
    console.log('Attempting to insert into Supabase...');
    const { error: insertError } = await supabase
      .from('fixtures')
      .insert(formattedFixtures)
      .select();

    if (insertError) {
      console.error(`❌ Error inserting fixtures:`, JSON.stringify(insertError, null, 2));
      throw insertError;
    }

    progress.processedFixtures = formattedFixtures.length;
    progressCallback?.(progress);

    console.log(`✅ Successfully processed ${progress.processedFixtures} test fixtures`);

  } catch (error) {
    console.error(`❌ Error processing test fixtures:`, JSON.stringify(error, null, 2));
    throw error;
  }
}

// Function to check fixture count in Supabase
export async function getFixtureStats(leagueId: number = 39) {
  try {
    const { data, error } = await supabase
      .from('fixtures')
      .select('*', { count: 'exact' })
      .eq('league_id', leagueId);

    if (error) {
      console.error('Error fetching fixture stats:', error);
      return;
    }

    console.log(`Current fixtures in database for league ${leagueId}: ${data?.length || 0}`);
    return data;
  } catch (error) {
    console.error('Error in getFixtureStats:', error);
    return null;
  }
}