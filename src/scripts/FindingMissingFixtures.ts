// WARNING: Hardcoded credentials is not recommended for production or shared code.
// These should ideally be loaded from environment variables.

// --- BEGIN Hardcoded Credentials and Configuration ---
const SCRIPT_SUPABASE_URL = 'https://cdynfbwdwdfsiwkgixua.supabase.co';
const SCRIPT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkeW5mYndkd2Rmc2l3a2dpeHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1Nzg0MDEsImV4cCI6MjA1ODE1NDQwMX0.kfDN39vw2ulre8ndNcytD-ISo9YXjptsBIfuH1p1HCg';
const RAPIDAPI_KEY = '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90';

import { createClient } from '@supabase/supabase-js';
const supabase = createClient(SCRIPT_SUPABASE_URL, SCRIPT_SUPABASE_ANON_KEY);
// --- END Hardcoded Credentials and Configuration ---

import colors from 'ansi-colors';

interface ApiFixture {
  fixture: {
    id: number;
    referee: string;
    timezone: string;
    date: string;
    timestamp: number;
    periods: {
      first: number;
      second: number;
    };
    venue: {
      id: number | null;
      name: string;
      city: string;
    };
    status: {
      long: string;
      short: string;
      elapsed: number;
      extra?: number;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string | null;
    season: number;
    round: string;
    standings: boolean;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
    away: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    halftime: {
      home: number | null;
      away: number | null;
    };
    fulltime: {
      home: number | null;
      away: number | null;
    };
    extratime: {
      home: number | null;
      away: number | null;
    };
    penalty: {
      home: number | null;
      away: number | null;
    };
  };
}

interface DatabaseFixture {
  id: number;
  date: string;
  league_id: number;
  home_team_id: number;
  away_team_id: number;
  status: any;
  score: any;
  venue: any;
  referee?: string;
  timezone?: string;
  timestamp?: number;
  periods?: any;
  fixture?: any;
  round?: string;
  league?: any;
  teams?: any;
  season_year?: number;
  match_status?: string;
}

const API_CALLS_PER_MINUTE = 600;
const DELAY_BETWEEN_CALLS = Math.ceil(60000 / API_CALLS_PER_MINUTE); // ~100ms delay

// Rate limiter
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchFixturesFromAPI(league: number, season: number): Promise<ApiFixture[]> {
  console.log(colors.yellow(`🔍 Fetching fixtures for league ${league}, season ${season}...`));
  
  const response = await fetch(`https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${league}&season=${season}`, {
    method: 'GET',
    headers: {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
    }
  });

  if (!response.ok) {
    throw new Error(`API returned status ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  
  console.log(colors.gray(`API Response: results=${data.results}, response length=${data.response?.length || 0}`));
  
  if (!data.response || data.response.length === 0) {
    console.log(colors.yellow(`⚠️  No fixtures found for league ${league}, season ${season}`));
    return [];
  }

  return data.response;
}

async function fetchHeadToHeadData(homeTeamId: number, awayTeamId: number): Promise<any[]> {
  console.log(colors.gray(`🔍 Fetching head-to-head data for ${homeTeamId} vs ${awayTeamId}...`));
  
  const response = await fetch(`https://api-football-v1.p.rapidapi.com/v3/fixtures/headtohead?h2h=${homeTeamId}-${awayTeamId}`, {
    method: 'GET',
    headers: {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
    }
  });

  if (!response.ok) {
    throw new Error(`API returned status ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  
  console.log(colors.gray(`H2H API Response: results=${data.results}, response length=${data.response?.length || 0}`));
  
  // Return just the response array, not the entire wrapper
  return data.response || [];
}

async function getExistingFixtureIdsForLeague(leagueId: number): Promise<Set<number>> {
  console.log(colors.yellow(`📋 Fetching existing fixture IDs for league ${leagueId} from database...`));
  
  const { data: existingFixtures, error } = await supabase
    .from('fixtures')
    .select('id')
    .eq('league_id', leagueId);

  if (error) {
    throw new Error(`Error fetching existing fixtures for league ${leagueId}: ${error.message}`);
  }

  const existingIds = new Set(existingFixtures?.map(f => f.id) || []);
  console.log(colors.gray(`Found ${existingIds.size} existing fixtures for league ${leagueId} in database`));
  
  return existingIds;
}

async function getFixturesNeedingUpdate(leagueId: number): Promise<number[]> {
  console.log(colors.yellow('🔍 Checking for fixtures needing data updates...'));
  
  const { data: fixturesNeedingUpdate, error } = await supabase
    .from('fixtures')
    .select('id')
    .eq('league_id', leagueId)
    .or('referee.is.null,timezone.is.null,timestamp.is.null,periods.is.null,fixture.is.null,round.is.null,league.is.null,teams.is.null,season_year.is.null,match_status.is.null');

  if (error) {
    throw new Error(`Error fetching fixtures needing update: ${error.message}`);
  }

  const fixtureIds = fixturesNeedingUpdate?.map(f => f.id) || [];
  console.log(colors.gray(`Found ${fixtureIds.length} fixtures needing data updates`));
  
  return fixtureIds;
}

async function getFixturesNeedingHeadToHead(leagueId: number): Promise<{id: number, home_team_id: number, away_team_id: number}[]> {
  console.log(colors.yellow('🔍 Checking for fixtures needing head-to-head data...'));
  
  const { data: fixturesNeedingH2H, error } = await supabase
    .from('fixtures')
    .select('id, home_team_id, away_team_id')
    .eq('league_id', leagueId)
    .is('head_to_head', null);

  if (error) {
    throw new Error(`Error fetching fixtures needing head-to-head data: ${error.message}`);
  }

  console.log(colors.gray(`Found ${fixturesNeedingH2H?.length || 0} fixtures needing head-to-head data`));
  
  return fixturesNeedingH2H || [];
}

function transformApiFixtureToDatabase(apiFixture: ApiFixture, includeAllFields: boolean = false): DatabaseFixture {
  const baseFixture = {
    id: apiFixture.fixture.id,
    date: apiFixture.fixture.date,
    league_id: apiFixture.league.id,
    home_team_id: apiFixture.teams.home.id,
    away_team_id: apiFixture.teams.away.id,
    status: apiFixture.fixture.status,
    score: apiFixture.score,
    venue: apiFixture.fixture.venue
  };

  if (includeAllFields) {
    return {
      ...baseFixture,
      referee: apiFixture.fixture.referee,
      timezone: apiFixture.fixture.timezone,
      timestamp: apiFixture.fixture.timestamp,
      periods: apiFixture.fixture.periods,
      fixture: apiFixture.fixture,
      round: apiFixture.league.round,
      league: apiFixture.league,
      teams: apiFixture.teams,
      season_year: apiFixture.league.season,
      match_status: apiFixture.fixture.status.short
    };
  }

  return baseFixture;
}

async function insertMissingFixtures(missingFixtures: DatabaseFixture[]): Promise<{ successCount: number; errorCount: number }> {
  console.log(colors.yellow(`📥 Inserting ${missingFixtures.length} missing fixtures...`));
  
  let successCount = 0;
  let errorCount = 0;
  const BATCH_SIZE = 100; // Insert in batches to avoid overwhelming the database
  
  for (let i = 0; i < missingFixtures.length; i += BATCH_SIZE) {
    const batch = missingFixtures.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(missingFixtures.length / BATCH_SIZE);
    
    console.log(colors.gray(`Inserting batch ${batchNumber}/${totalBatches} (${batch.length} fixtures)...`));
    
    try {
      const { error } = await supabase
        .from('fixtures')
        .insert(batch);

      if (error) {
        console.error(colors.red(`❌ Error inserting batch ${batchNumber}:`), error.message);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
        console.log(colors.green(`✅ Successfully inserted batch ${batchNumber}`));
      }
    } catch (error: any) {
      console.error(colors.red(`❌ Exception inserting batch ${batchNumber}:`), error.message);
      errorCount += batch.length;
    }
    
    // Small delay between batches
    if (i + BATCH_SIZE < missingFixtures.length) {
      await delay(100);
    }
  }
  
  return { successCount, errorCount };
}

async function updateExistingFixtures(apiFixtures: ApiFixture[], fixtureIdsToUpdate: number[]): Promise<{ successCount: number; errorCount: number }> {
  console.log(colors.yellow(`🔄 Updating ${fixtureIdsToUpdate.length} existing fixtures with missing data...`));
  
  let successCount = 0;
  let errorCount = 0;
  
  // Create a map of API fixtures by ID for quick lookup
  const apiFixtureMap = new Map<number, ApiFixture>();
  apiFixtures.forEach(fixture => {
    apiFixtureMap.set(fixture.fixture.id, fixture);
  });
  
  // Process updates in batches
  const BATCH_SIZE = 50;
  for (let i = 0; i < fixtureIdsToUpdate.length; i += BATCH_SIZE) {
    const batch = fixtureIdsToUpdate.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(fixtureIdsToUpdate.length / BATCH_SIZE);
    
    console.log(colors.gray(`Updating batch ${batchNumber}/${totalBatches} (${batch.length} fixtures)...`));
    
    for (const fixtureId of batch) {
      const apiFixture = apiFixtureMap.get(fixtureId);
      if (!apiFixture) {
        console.log(colors.yellow(`⚠️  No API data found for fixture ${fixtureId}, skipping update`));
        errorCount++;
        continue;
      }
      
      try {
        const updateData = {
          referee: apiFixture.fixture.referee,
          timezone: apiFixture.fixture.timezone,
          timestamp: apiFixture.fixture.timestamp,
          periods: apiFixture.fixture.periods,
          fixture: apiFixture.fixture,
          round: apiFixture.league.round,
          league: apiFixture.league,
          teams: apiFixture.teams,
          season_year: apiFixture.league.season,
          match_status: apiFixture.fixture.status.short
        };
        
        const { error } = await supabase
          .from('fixtures')
          .update(updateData)
          .eq('id', fixtureId);

        if (error) {
          console.error(colors.red(`❌ Error updating fixture ${fixtureId}:`), error.message);
          errorCount++;
        } else {
          successCount++;
        }
        
        // Small delay between individual updates
        await delay(50);
        
      } catch (error: any) {
        console.error(colors.red(`❌ Exception updating fixture ${fixtureId}:`), error.message);
        errorCount++;
      }
    }
    
    // Delay between batches
    if (i + BATCH_SIZE < fixtureIdsToUpdate.length) {
      await delay(200);
    }
  }
  
  return { successCount, errorCount };
}

async function updateFixturesWithHeadToHead(fixturesNeedingH2H: {id: number, home_team_id: number, away_team_id: number}[]): Promise<{ successCount: number; errorCount: number }> {
  console.log(colors.yellow(`🔄 Updating ${fixturesNeedingH2H.length} fixtures with head-to-head data...`));
  
  let successCount = 0;
  let errorCount = 0;
  
  // Process updates individually with proper rate limiting
  for (let i = 0; i < fixturesNeedingH2H.length; i++) {
    const fixture = fixturesNeedingH2H[i];
    
    try {
      // Progress update
      if (i % 10 === 0) {
        console.log(colors.gray(`Processing head-to-head ${i + 1}/${fixturesNeedingH2H.length}...`));
      }
      
      // Fetch head-to-head data from API
      const headToHeadData = await fetchHeadToHeadData(fixture.home_team_id, fixture.away_team_id);
      
      // Update the database with head-to-head data
      const { error } = await supabase
        .from('fixtures')
        .update({ head_to_head: headToHeadData })
        .eq('id', fixture.id);

      if (error) {
        console.error(colors.red(`❌ Error updating head-to-head for fixture ${fixture.id}:`), error.message);
        errorCount++;
      } else {
        successCount++;
        if (i % 25 === 0 && i > 0) {
          console.log(colors.green(`✅ Updated fixture ${fixture.id} with head-to-head data (${successCount} successful so far)`));
        }
      }
      
      // Rate limiting delay (more conservative for head-to-head calls)
      if (i < fixturesNeedingH2H.length - 1) {
        await delay(DELAY_BETWEEN_CALLS + 100); // Extra delay for head-to-head API
      }
      
    } catch (error: any) {
      console.error(colors.red(`❌ API error for head-to-head ${fixture.home_team_id}-${fixture.away_team_id}:`), error.message);
      errorCount++;
      
      // Still apply delay even on error to maintain rate limit
      if (i < fixturesNeedingH2H.length - 1) {
        await delay(DELAY_BETWEEN_CALLS + 100);
      }
    }
  }
  
  return { successCount, errorCount };
}

async function findMissingFixtures() {
  console.log(colors.cyan('🔄 Starting Missing Fixtures Detection...'));
  console.log(colors.gray('Finding fixtures that exist in API but not in database\n'));

  const startTime = Date.now();
  
  try {
    // Target Premier League for 2024/25 season (API uses 2024 as season identifier)
    const LEAGUE_ID = 39; // Premier League
    const LEAGUE_NAME = 'Premier League';
    const SEASONS = [2024]; // Focus on 2024/25 season
    
    console.log(colors.cyan(`🎯 Target: ${LEAGUE_NAME} (ID: ${LEAGUE_ID})`));
    console.log(colors.cyan(`🎯 Seasons: ${SEASONS.join(', ')}\n`));
    
    // Step 1: Get existing fixture IDs for this specific league
    const existingIds = await getExistingFixtureIdsForLeague(LEAGUE_ID);
    
    // Step 2: Get fixtures from this league that need data updates
    const fixturesNeedingUpdate = await getFixturesNeedingUpdate(LEAGUE_ID);
    
    // Step 3: Get fixtures from this league that need head-to-head data
    const fixturesNeedingHeadToHead = await getFixturesNeedingHeadToHead(LEAGUE_ID);
    
    let totalApiFixtures = 0;
    let totalMissingFixtures: DatabaseFixture[] = [];
    let allApiFixtures: ApiFixture[] = [];
    
    // Step 3: Process each season
    for (const season of SEASONS) {
      console.log(colors.yellow(`\n🔍 Processing ${LEAGUE_NAME} - Season ${season}...`));
      
      // Fetch fixtures from API for this season
      await delay(DELAY_BETWEEN_CALLS); // Rate limiting
      const apiFixtures = await fetchFixturesFromAPI(LEAGUE_ID, season);
      
      if (apiFixtures.length === 0) {
        console.log(colors.yellow(`⚠️  No fixtures found for season ${season}`));
        continue;
      }
      
      totalApiFixtures += apiFixtures.length;
      allApiFixtures = allApiFixtures.concat(apiFixtures);
      
      // Find truly missing fixtures for this season (that don't exist in DB at all)
      console.log(colors.yellow(`🔍 Identifying missing fixtures for season ${season}...`));
      const seasonMissingFixtures: DatabaseFixture[] = [];
      
      for (const apiFixture of apiFixtures) {
        if (!existingIds.has(apiFixture.fixture.id)) {
          seasonMissingFixtures.push(transformApiFixtureToDatabase(apiFixture, true));
        }
      }
      
      totalMissingFixtures = totalMissingFixtures.concat(seasonMissingFixtures);
      
      console.log(colors.cyan(`📊 Season ${season} Results:`));
      console.log(colors.white(`  Fixtures in API: ${colors.bold(apiFixtures.length.toLocaleString())}`));
      console.log(colors.white(`  New fixtures (not in DB): ${colors.bold(seasonMissingFixtures.length.toLocaleString())}`));
      console.log(colors.white(`  Existing fixtures (already in DB): ${colors.bold((apiFixtures.length - seasonMissingFixtures.length).toLocaleString())}`));
    }
    
    // Filter fixtures needing update to only those that are in our API response
    const apiFixtureIds = new Set(allApiFixtures.map(f => f.fixture.id));
    const actualFixturesToUpdate = fixturesNeedingUpdate.filter(id => apiFixtureIds.has(id));
    
    console.log(colors.cyan(`\n📊 Overall Analysis Results:`));
    console.log(colors.white(`Total fixtures in API: ${colors.bold(totalApiFixtures.toLocaleString())}`));
    console.log(colors.white(`Existing in database: ${colors.bold(existingIds.size.toLocaleString())}`));
    console.log(colors.white(`New fixtures to insert: ${colors.bold(totalMissingFixtures.length.toLocaleString())}`));
    console.log(colors.white(`Existing fixtures to update: ${colors.bold(actualFixturesToUpdate.length.toLocaleString())}`));
    console.log(colors.white(`Fixtures needing head-to-head: ${colors.bold(fixturesNeedingHeadToHead.length.toLocaleString())}`));
    
    let insertSuccessCount = 0;
    let insertErrorCount = 0;
    let updateSuccessCount = 0;
    let updateErrorCount = 0;
    let h2hSuccessCount = 0;
    let h2hErrorCount = 0;
    
    // Step 4: Insert missing fixtures
    if (totalMissingFixtures.length > 0) {
      console.log(colors.yellow(`\n🚀 Phase 1: Inserting ${totalMissingFixtures.length} missing fixtures...`));
      const insertResults = await insertMissingFixtures(totalMissingFixtures);
      insertSuccessCount = insertResults.successCount;
      insertErrorCount = insertResults.errorCount;
    } else {
      console.log(colors.green('\n✅ Phase 1: No missing fixtures found!'));
    }
    
    // Step 5: Update existing fixtures with missing data
    if (actualFixturesToUpdate.length > 0) {
      console.log(colors.yellow(`\n🔄 Phase 2: Updating ${actualFixturesToUpdate.length} fixtures with missing data...`));
      const updateResults = await updateExistingFixtures(allApiFixtures, actualFixturesToUpdate);
      updateSuccessCount = updateResults.successCount;
      updateErrorCount = updateResults.errorCount;
    } else {
      console.log(colors.green('\n✅ Phase 2: No fixtures need data updates!'));
    }
    
    // Step 6: Update fixtures with head-to-head data
    if (fixturesNeedingHeadToHead.length > 0) {
      console.log(colors.yellow(`\n🔄 Phase 3: Updating ${fixturesNeedingHeadToHead.length} fixtures with head-to-head data...`));
      const h2hResults = await updateFixturesWithHeadToHead(fixturesNeedingHeadToHead);
      h2hSuccessCount = h2hResults.successCount;
      h2hErrorCount = h2hResults.errorCount;
    } else {
      console.log(colors.green('\n✅ Phase 3: No fixtures need head-to-head data!'));
    }
    
    // Final results
    const totalTime = (Date.now() - startTime) / 1000;
    const totalProcessed = totalMissingFixtures.length + actualFixturesToUpdate.length + fixturesNeedingHeadToHead.length;
    const totalSuccessful = insertSuccessCount + updateSuccessCount + h2hSuccessCount;
    const totalErrors = insertErrorCount + updateErrorCount + h2hErrorCount;
    
    console.log(colors.green('\n🎉 Missing Fixtures Detection & Update Complete!\n'));
    console.log(colors.cyan('📊 FINAL RESULTS:'));
    console.log(colors.white(`League: ${colors.bold(LEAGUE_NAME)}`));
    console.log(colors.white(`Seasons: ${colors.bold(SEASONS.join(', '))}`));
    console.log(colors.white(`\n--- PHASE 1: INSERTIONS ---`));
    console.log(colors.white(`Missing fixtures found: ${colors.bold(totalMissingFixtures.length.toLocaleString())}`));
    console.log(colors.white(`Successfully inserted: ${colors.bold(insertSuccessCount.toLocaleString())}`));
    console.log(colors.white(`Insertion errors: ${colors.bold(insertErrorCount.toLocaleString())}`));
    console.log(colors.white(`\n--- PHASE 2: UPDATES ---`));
    console.log(colors.white(`Fixtures needing updates: ${colors.bold(actualFixturesToUpdate.length.toLocaleString())}`));
    console.log(colors.white(`Successfully updated: ${colors.bold(updateSuccessCount.toLocaleString())}`));
    console.log(colors.white(`Update errors: ${colors.bold(updateErrorCount.toLocaleString())}`));
    console.log(colors.white(`\n--- PHASE 3: HEAD-TO-HEAD ---`));
    console.log(colors.white(`Fixtures needing head-to-head: ${colors.bold(fixturesNeedingHeadToHead.length.toLocaleString())}`));
    console.log(colors.white(`Successfully updated with H2H: ${colors.bold(h2hSuccessCount.toLocaleString())}`));
    console.log(colors.white(`Head-to-head errors: ${colors.bold(h2hErrorCount.toLocaleString())}`));
    console.log(colors.white(`\n--- OVERALL SUMMARY ---`));
    console.log(colors.white(`Total fixtures processed: ${colors.bold(totalProcessed.toLocaleString())}`));
    console.log(colors.white(`Total successful operations: ${colors.bold(totalSuccessful.toLocaleString())}`));
    console.log(colors.white(`Total errors: ${colors.bold(totalErrors.toLocaleString())}`));
    console.log(colors.white(`Total time: ${colors.bold(totalTime.toFixed(1))} seconds`));
    
    if (totalSuccessful > 0 && totalProcessed > 0) {
      const successRate = ((totalSuccessful / totalProcessed) * 100).toFixed(1);
      console.log(colors.white(`Overall success rate: ${colors.bold(successRate + '%')}`));
    }
    
    console.log(colors.green('\n✅ Fixtures processing finished!'));
    
  } catch (error: any) {
    console.error(colors.red('💥 FATAL ERROR:'), error.message);
    throw error;
  }
}

// Run the script
findMissingFixtures().catch(error => {
  console.error(colors.red('💥 FATAL: Unhandled error in findMissingFixtures:'), error.message);
  process.exit(1);
}); 