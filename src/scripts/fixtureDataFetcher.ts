import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import axios from 'axios';
import { MAJOR_LEAGUES } from './teamDataFetcher';

// Load environment variables from .env.local in the project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');

// Try to load from .env.local first, then fall back to .env
let envPath = path.join(rootDir, '.env.local');
if (!fs.existsSync(envPath)) {
  envPath = path.join(rootDir, '.env');
}
dotenv.config({ path: envPath });

// Supabase setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cdynfbwdwdsiwkgiua.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkeW5mYndkd2Rmc2l3a2dpeHVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjU3ODQwMSwiZXhwIjoyMDU4MTU0NDAxfQ.5V7CbSCE4lb3FbJUa3kgipRPWXG4LeVRCf7eeLSrSoI';
const supabase = createClient(supabaseUrl, supabaseKey);

const RAPID_API_KEY = process.env.RAPID_API_KEY || '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90';

// Updated Progress tracking interface
export interface FixtureProcessingProgress {
  totalLeagues: number;
  leaguesProcessed: number;
  currentLeagueName?: string;
  currentLeagueId?: number;
  fixturesFoundInCurrentLeague: number;
  fixturesInsertedForCurrentLeague: number;
  cumulativeFixturesApiTotal: number;
  cumulativeFixturesInserted: number;
  apiCalls: number;
}

// Renamed and refactored function to process all major leagues
export async function updateMajorLeagueFixtures(
  season: number = 2024,
  progressCallback?: (progress: FixtureProcessingProgress) => void
) {
  const overallProgress: FixtureProcessingProgress = {
    totalLeagues: MAJOR_LEAGUES.length,
    leaguesProcessed: 0,
    fixturesFoundInCurrentLeague: 0,
    fixturesInsertedForCurrentLeague: 0,
    cumulativeFixturesApiTotal: 0,
    cumulativeFixturesInserted: 0,
    apiCalls: 0
  };

  console.log(`Starting fixture update for ${MAJOR_LEAGUES.length} major leagues for season ${season}.`);

  try {
    console.log('Testing Supabase connection...');
    const { error: sbError } = await supabase.from('fixtures').select('id', { count: 'exact', head: true }).limit(1);
    if (sbError) {
        console.error('Supabase connection test failed:', sbError);
        throw sbError;
    }
    console.log('Supabase connection successful.');

    for (const league of MAJOR_LEAGUES) {
      const leagueId = league.id;
      const leagueName = league.name;
      overallProgress.currentLeagueId = leagueId;
      overallProgress.currentLeagueName = leagueName;

      console.log(`\nProcessing league: ${leagueName} (ID: ${leagueId})`);

      // Step 1: Get fixtures from football API
      overallProgress.apiCalls++;
      let apiFixturesResponse;
      try {
        apiFixturesResponse = await axios.get(
          `https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${leagueId}&season=${season}`,
          {
            headers: {
              'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com',
              'X-RapidAPI-Key': RAPID_API_KEY
            }
          }
        );
      } catch (apiError: any) {
        console.error(`❌ Error fetching fixtures from API for ${leagueName} (ID: ${leagueId}):`, apiError.message);
        overallProgress.leaguesProcessed++;
        progressCallback?.(overallProgress);
        continue;
      }
      
      const fetchedApiFixtures = apiFixturesResponse.data.response || [];
      overallProgress.fixturesFoundInCurrentLeague = fetchedApiFixtures.length;
      overallProgress.cumulativeFixturesApiTotal += fetchedApiFixtures.length;

      if (fetchedApiFixtures.length === 0) {
        console.log(`No fixtures found from API for ${leagueName}.`);
        overallProgress.leaguesProcessed++;
        progressCallback?.(overallProgress);
        continue;
      }
      console.log(`Found ${fetchedApiFixtures.length} fixtures from API for ${leagueName}.`);

      // Step 2: Get existing fixture IDs from Supabase for this league
      const { data: existingDbFixtures, error: fetchExistingError } = await supabase
        .from('fixtures')
        .select('id')
        .eq('league_id', leagueId);

      if (fetchExistingError) {
        console.error(`❌ Error fetching existing fixtures from Supabase for ${leagueName}:`, fetchExistingError);
        overallProgress.leaguesProcessed++;
        progressCallback?.(overallProgress);
        continue;
      }
      const existingFixtureIds = new Set(existingDbFixtures.map((f: any) => f.id));
      console.log(`Found ${existingFixtureIds.size} existing fixtures in DB for ${leagueName}.`);

      // Step 3: Format API fixtures and filter out existing ones
      const formattedFixtures = fetchedApiFixtures.map((fixture: any) => ({
        id: fixture.fixture.id,
        date: fixture.fixture.date,
        league_id: leagueId,
        home_team_id: fixture.teams.home.id,
        away_team_id: fixture.teams.away.id,
        status: fixture.fixture.status.short,
        score_fulltime_home: fixture.score?.fulltime?.home ?? null,
        score_fulltime_away: fixture.score?.fulltime?.away ?? null,
        score_halftime_home: fixture.score?.halftime?.home ?? null,
        score_halftime_away: fixture.score?.halftime?.away ?? null,
        score_extratime_home: fixture.score?.extratime?.home ?? null,
        score_extratime_away: fixture.score?.extratime?.away ?? null,
        score_penalty_home: fixture.score?.penalty?.home ?? null,
        score_penalty_away: fixture.score?.penalty?.away ?? null,
        venue_id: fixture.fixture.venue.id,
        venue_name: fixture.fixture.venue.name,
        venue_city: fixture.fixture.venue.city,
        referee: fixture.fixture.referee,
        timezone: fixture.fixture.timezone,
        timestamp: fixture.fixture.timestamp,
        periods_first: fixture.fixture.periods?.first,
        periods_second: fixture.fixture.periods?.second,
        updated_at: new Date().toISOString()
      }));

      const fixturesToInsert = formattedFixtures.filter(
        (fixture: any) => !existingFixtureIds.has(fixture.id)
      );
      
      overallProgress.fixturesInsertedForCurrentLeague = 0;

      // Step 4: Insert new fixtures into Supabase
      if (fixturesToInsert.length > 0) {
        console.log(`Attempting to insert ${fixturesToInsert.length} new fixtures for ${leagueName}...`);
        const { error: insertError } = await supabase
          .from('fixtures')
          .insert(fixturesToInsert)
          .select();

        if (insertError) {
          console.error(`❌ Error inserting fixtures for ${leagueName}:`, JSON.stringify(insertError, null, 2));
        } else {
          console.log(`✅ Successfully inserted ${fixturesToInsert.length} new fixtures for ${leagueName}.`);
          overallProgress.fixturesInsertedForCurrentLeague = fixturesToInsert.length;
          overallProgress.cumulativeFixturesInserted += fixturesToInsert.length;
        }
      } else {
        console.log(`No new fixtures to insert for ${leagueName}.`);
      }
      
      overallProgress.leaguesProcessed++;
      progressCallback?.(JSON.parse(JSON.stringify(overallProgress)));
    }

    console.log(`\n🏁 Fixture update process completed for all ${overallProgress.leaguesProcessed} processed leagues.`);
    console.log(`Total API calls: ${overallProgress.apiCalls}`);
    console.log(`Total fixtures fetched from API: ${overallProgress.cumulativeFixturesApiTotal}`);
    console.log(`Total new fixtures inserted into Supabase: ${overallProgress.cumulativeFixturesInserted}`);

  } catch (error: any) {
    console.error(`❌ Overall error in updateMajorLeagueFixtures:`, error.message);
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