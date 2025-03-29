import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { MAJOR_LEAGUES, rateLimiter } from './teamDataFetcher';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Log to help debug
console.log('Environment check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ Present' : '✗ Missing');
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? '✓ Present' : '✗ Missing');
console.log('RAPID_API_KEY:', process.env.RAPID_API_KEY ? '✓ Present' : '✗ Missing');

const API_CONFIG = {
  baseUrl: 'https://api-football-v1.p.rapidapi.com/v3',
  headers: {
    'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
    'x-rapidapi-key': process.env.RAPID_API_KEY || ''
  }
};

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

interface FixtureData {
  fixture: {
    id: number;
    date: string;
    status: {
      short: string;
      long: string;
    };
    venue: any;
  };
  league: {
    id: number;
    name: string;
  };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: any;
}

interface FixtureProgress {
  totalFixtures: number;
  processedFixtures: number;
  apiCalls: number;
}

interface ProgressCallback {
  (progress: FixtureProgress): void;
}

async function updateFixtureData(leagueId: number, progressCallback?: ProgressCallback) {
  const progress: FixtureProgress = {
    totalFixtures: 0,
    processedFixtures: 0,
    apiCalls: 0
  };

  console.log('Starting fixture update process...');
  
  try {
    // Calculate date range (today to 3 months ahead)
    const today = new Date();
    const threeMonthsFromNow = new Date(today);
    threeMonthsFromNow.setMonth(today.getMonth() + 3);

    // Process each league
    for (const league of MAJOR_LEAGUES) {
      console.log(`Processing fixtures for ${league.name}...`);
      
      try {
        await rateLimiter.checkLimit();
        
        // Fetch fixtures for the league
        const fixtures = await fetchLeagueFixtures(
          league.id,
          today.toISOString().split('T')[0],
          threeMonthsFromNow.toISOString().split('T')[0]
        );

        // Process fixtures based on their status
        await processFixtures(fixtures);
        
      } catch (error) {
        console.error(`Error processing league ${league.name}:`, error);
      }
    }

    console.log('Fixture update completed successfully!');
  } catch (error) {
    console.error('Failed to update fixtures:', error);
    throw error;
  } finally {
    progressCallback?.(progress);
  }
}

async function fetchLeagueFixtures(leagueId: number, from: string, to: string): Promise<FixtureData[]> {
  console.log(`\n📊 Fetching fixtures for league ${leagueId}`);
  
  const allFixtures: FixtureData[] = [];
  let totalApiCalls = 0;
  
  for (const season of [2024, 2025]) {
    const url = `${API_CONFIG.baseUrl}/fixtures?league=${leagueId}&season=${season}`;
    console.log(`\n🔍 Season ${season}`);
    console.log(`API URL: ${url}`);
    
    try {
      totalApiCalls++;
      const response = await fetch(url, { 
        headers: {
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
          'x-rapidapi-key': process.env.RAPID_API_KEY || ''
        }
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`❌ API Error for season ${season}:`, text);
        continue;
      }

      const data = await response.json();
      const fixtures = data.response || [];
      allFixtures.push(...fixtures);
      
      console.log(`✅ Season ${season}: Found ${fixtures.length} fixtures`);
      console.log(`📈 Running total: ${allFixtures.length} fixtures`);
      
      await rateLimiter.checkLimit();
      
    } catch (error) {
      console.error(`❌ Error fetching season ${season}:`, error);
    }
  }

  console.log(`\n📊 Summary for league ${leagueId}:`);
  console.log(`🎯 Total fixtures found: ${allFixtures.length}`);
  console.log(`🔄 API calls made: ${totalApiCalls}`);
  console.log('----------------------------------------');
  
  return allFixtures;
}

async function processFixtures(fixtures: FixtureData[]) {
  console.log(`\n⚽ Processing ${fixtures.length} fixtures`);
  
  // Separate fixtures based on status
  const completedFixtures = fixtures.filter(f => 
    ['FT', 'AET', 'PEN', 'ABD', 'AWD', 'WO'].includes(f.fixture.status.short)
  );
  const upcomingFixtures = fixtures.filter(f => 
    ['NS', 'TBD', 'PST', 'CANC'].includes(f.fixture.status.short)
  );

  console.log(`📊 Fixture breakdown:`);
  console.log(`✅ Completed fixtures: ${completedFixtures.length}`);
  console.log(`🕒 Upcoming fixtures: ${upcomingFixtures.length}`);

  // Process completed fixtures
  for (let i = 0; i < completedFixtures.length; i++) {
    const fixture = completedFixtures[i];
    console.log(`\nProcessing completed fixture ${i + 1}/${completedFixtures.length}`);
    console.log(`${fixture.teams.home.name} vs ${fixture.teams.away.name}`);
    await processCompletedFixture(fixture);
  }

  // Process upcoming fixtures
  console.log('\nStoring upcoming fixtures...');
  await storeUpcomingFixtures(upcomingFixtures);
}

async function processCompletedFixture(fixture: FixtureData) {
  try {
    // 1. Store basic fixture data
    await supabase.from('fixtures').upsert({
      id: fixture.fixture.id,
      date: fixture.fixture.date,
      league_id: fixture.league.id,
      home_team_id: fixture.teams.home.id,
      away_team_id: fixture.teams.away.id,
      status: fixture.fixture.status,
      score: fixture.score,
      venue: fixture.fixture.venue,
      updated_at: new Date().toISOString()
    });

    // 2. Fetch and store events
    await rateLimiter.checkLimit();
    const eventsResponse = await fetch(
      `${API_CONFIG.baseUrl}/fixtures/events?fixture=${fixture.fixture.id}`,
      { headers: API_CONFIG.headers }
    );
    const eventsData = await eventsResponse.json();
    
    if (eventsData.response) {
      for (const event of eventsData.response) {
        await supabase.from('fixture_events').upsert({
          fixture_id: fixture.fixture.id,
          time: event.time,
          team_id: event.team.id,
          player_id: event.player?.id,
          type: event.type,
          detail: event.detail
        }, { onConflict: 'fixture_id, time, team_id, type' });
      }
    }

    // 3. Fetch and store statistics
    await rateLimiter.checkLimit();
    const statsResponse = await fetch(
      `${API_CONFIG.baseUrl}/fixtures/statistics?fixture=${fixture.fixture.id}`,
      { headers: API_CONFIG.headers }
    );
    const statsData = await statsResponse.json();
    
    if (statsData.response) {
      for (const teamStats of statsData.response) {
        await supabase.from('fixture_statistics').upsert({
          fixture_id: fixture.fixture.id,
          team_id: teamStats.team.id,
          statistics: teamStats.statistics
        }, { onConflict: 'fixture_id, team_id' });
      }
    }

  } catch (error) {
    console.error(`Error processing completed fixture ${fixture.fixture.id}:`, error);
  }
}

async function storeUpcomingFixtures(fixtures: FixtureData[]) {
  // Group fixtures by date
  const fixturesByDate = fixtures.reduce((acc, fixture) => {
    const date = fixture.fixture.date.split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(fixture);
    return acc;
  }, {} as { [key: string]: FixtureData[] });

  // Ensure directory exists
  const fixturesDir = path.join(process.cwd(), 'data', 'fixtures', 'upcoming');
  await fs.mkdir(fixturesDir, { recursive: true });

  // Store each date's fixtures
  for (const [date, dateFixtures] of Object.entries(fixturesByDate)) {
    await fs.writeFile(
      path.join(fixturesDir, `${date}.json`),
      JSON.stringify(dateFixtures, null, 2)
    );
  }
}

// Single export statement
export {
  updateFixtureData,
  type FixtureProgress,
  type ProgressCallback
};