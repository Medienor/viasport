import { createClient } from '@supabase/supabase-js';
// Use node-fetch if you installed it (for Node < 18)
// import fetch from 'node-fetch'; // Uncomment this line if using node-fetch

// --- Configuration (Get from Environment Variables) ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use Service Role Key for server-side updates
const rapidApiKey = process.env.RAPIDAPI_KEY;
const rapidApiHost = 'api-football-v1.p.rapidapi.com';

// Optional: Keep internal live API for potentially faster "live" signal?
// const internalLiveFixturesUrl = process.env.INTERNAL_LIVE_FIXTURES_URL;

if (!supabaseUrl || !supabaseServiceKey || !rapidApiKey) {
  console.error('Missing required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RAPIDAPI_KEY).');
  process.exit(1);
}

// --- Initialize Supabase Client ---
// Note: Using the Service Role Key bypasses RLS. Ensure this script runs in a secure environment.
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- Constants ---
const MATCH_DURATION_BUFFER_MINUTES = 120; // Estimated max duration (90 min + 30 min extra time/stoppage)

// --- Helper Functions ---

/**
 * Gets the start and end timestamps for the current day in UTC.
 */
function getTodayUTCRange() {
  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  return {
    startUTC: startOfDay.toISOString(),
    endUTC: endOfDay.toISOString(),
  };
}

/**
 * Fetches fixtures from Supabase scheduled within a given UTC date range using pagination.
 */
async function fetchTodaysFixturesFromSupabase(startUTC, endUTC) {
  console.log(`Fetching Supabase fixtures between ${startUTC} and ${endUTC}...`);
  const allFixtures = [];
  const pageSize = 1000;
  let page = 0;
  let fetchMore = true;

  try {
    while (fetchMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      console.log(`Fetching fixtures range: ${from} - ${to}`);

      // Select necessary fields: id, date (start time), and last update timestamp
      const { data, error, count } = await supabase
        .from('fixtures')
        .select('id, date, player_statistics_last_updated', { count: 'exact' })
        .gte('date', startUTC)
        .lt('date', endUTC)
        .order('date', { ascending: true })
        .range(from, to);

      if (error) throw error;

      if (data && data.length > 0) {
        allFixtures.push(...data);
        console.log(`Fetched ${data.length} fixtures. Total so far: ${allFixtures.length}`);
      } else {
        fetchMore = false;
        console.log('No more fixtures found in range.');
      }

      if (page === 0 && count !== null) console.log(`Total fixtures count for today reported by Supabase: ${count}`);
      if (count !== null && allFixtures.length >= count) {
          console.log('Fetched count matches total count. Stopping pagination.');
          fetchMore = false;
      }

      page++;
      if (page > 200) { // Safety break
          console.warn("Pagination limit reached. Stopping fetch.");
          fetchMore = false;
      }
    }
    console.log(`Finished fetching. Found ${allFixtures.length} total fixtures for today.`);
    return allFixtures;
  } catch (error) {
    console.error('Error fetching Supabase fixtures:', error);
    return [];
  }
}

/**
 * Fetches player statistics for a specific fixture from RapidAPI.
 */
async function fetchPlayerStats(fixtureId) {
  const url = `https://${rapidApiHost}/v3/fixtures/players?fixture=${fixtureId}`;
  console.log(`Fetching player stats for fixture ${fixtureId} from RapidAPI...`);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': rapidApiHost,
      },
    });

    if (!response.ok) {
       if (response.status === 429) {
         console.warn(`Rate limit hit for player stats ${fixtureId}. Skipping for now.`);
         return null; // Indicate rate limit hit
      }
      console.error(`RapidAPI player stats request for fixture ${fixtureId} failed with status ${response.status}: ${await response.text()}`);
      // Return null or an empty object depending on how you want to handle API errors downstream
      return null; // Indicate fetch error
    }

    const data = await response.json();
    // Adjust based on the actual structure of the player stats response
    const playerStats = data?.response;

    if (!playerStats || (Array.isArray(playerStats) && playerStats.length === 0)) {
        console.log(`No player stats data returned or found for fixture ${fixtureId}.`);
        // Return an empty array/object or null if you want to store "no stats" explicitly
        return []; // Represent no stats as an empty array
    } else {
        console.log(`Successfully fetched player stats for fixture ${fixtureId}.`);
    }
    return playerStats;
  } catch (error) {
    console.error(`Error fetching player stats for fixture ${fixtureId}:`, error);
    return null; // Indicate fetch error
  }
}

/**
 * Updates a fixture in Supabase with player statistics.
 */
async function updateFixtureStats(fixtureId, stats) {
  console.log(`Updating Supabase player stats for fixture ${fixtureId}...`);
  try {
    const { data, error } = await supabase
      .from('fixtures')
      .update({
        player_statistics: stats, // Store the fetched stats (JSONB)
        player_statistics_last_updated: new Date().toISOString(), // Update timestamp
      })
      .eq('id', fixtureId);

    if (error) throw error;
    console.log(`Successfully updated player stats for fixture ${fixtureId} in Supabase.`);
    return true; // Indicate success
  } catch (error) {
    console.error(`Error updating Supabase player stats for fixture ${fixtureId}:`, error);
    return false; // Indicate failure
  }
}

// --- Main Execution Logic ---
async function runUpdate() {
  console.log('Starting player statistics update process...');
  const startTime = Date.now();
  const now = new Date(); // Get current time once

  const { startUTC, endUTC } = getTodayUTCRange();
  const todaysFixtures = await fetchTodaysFixturesFromSupabase(startUTC, endUTC);

  if (todaysFixtures.length === 0) {
    console.log('No fixtures found scheduled for today. Exiting.');
    return;
  }

  let fixturesToUpdate = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  console.log(`Processing ${todaysFixtures.length} fixtures for potential player stats updates...`);

  for (const fixture of todaysFixtures) {
    const { id, date, player_statistics_last_updated } = fixture;

    if (!date) {
        console.log(`Skipping fixture ${id}: Missing date.`);
        skippedCount++;
        continue;
    }

    const fixtureStartDate = new Date(date);
    const estimatedEndTime = new Date(fixtureStartDate.getTime() + MATCH_DURATION_BUFFER_MINUTES * 60 * 1000);
    const lastStatsUpdate = player_statistics_last_updated ? new Date(player_statistics_last_updated) : null;

    // --- Filtering Logic ---
    // 1. Skip if game hasn't started yet
    if (now < fixtureStartDate) {
        // console.log(`Skipping fixture ${id}: Start time ${fixtureStartDate.toISOString()} is in the future.`);
        skippedCount++;
        continue;
    }

    // 2. Skip if game is finished AND already updated after estimated end time
    if (now > estimatedEndTime && lastStatsUpdate && lastStatsUpdate >= estimatedEndTime) {
        console.log(`Skipping fixture ${id}: Game finished (${estimatedEndTime.toISOString()}) and stats updated after end (${lastStatsUpdate.toISOString()}).`);
        skippedCount++;
        continue;
    }

    // --- If not skipped, it's a target for fetching ---
    console.log(`Fixture ${id}: Flagging for player stats update.`);
    fixturesToUpdate++;

    const stats = await fetchPlayerStats(id);

    if (stats !== null) { // Check if fetch was successful (not null)
      const success = await updateFixtureStats(id, stats);
      if (success) {
        updatedCount++;
      } else {
        errorCount++; // DB update failed
      }
    } else {
      // Fetch failed (e.g., rate limit, API error, network error)
      errorCount++;
    }

    // Delay between RapidAPI calls
    await new Promise(resolve => setTimeout(resolve, 1100)); // Slightly over 1 sec delay
  }

  const endTime = Date.now();
  console.log('--- Update Summary ---');
  console.log(`Processed: ${todaysFixtures.length} fixtures`);
  console.log(`Targeted:  ${fixturesToUpdate}`);
  console.log(`Updated:   ${updatedCount}`);
  console.log(`Skipped:   ${skippedCount}`);
  console.log(`Errors:    ${errorCount}`);
  console.log(`Player stats update process finished in ${(endTime - startTime) / 1000} seconds.`);
}

runUpdate().catch(error => {
  console.error("Unhandled error during script execution:", error);
  process.exit(1);
});