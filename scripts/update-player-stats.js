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

      // Select necessary fields: id, date, and BOTH last update timestamps
      const { data, error, count } = await supabase
        .from('fixtures')
        .select('id, date, player_statistics_last_updated, statistics_last_updated', { count: 'exact' })
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
 * Fetches fixture statistics for a specific fixture from RapidAPI.
 */
async function fetchFixtureStats(fixtureId) {
  const url = `https://${rapidApiHost}/v3/fixtures/statistics?fixture=${fixtureId}`;
  console.log(`Fetching fixture stats for fixture ${fixtureId} from RapidAPI...`);
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
        console.warn(`Rate limit hit for fixture stats ${fixtureId}. Skipping for now.`);
        return null; // Indicate rate limit hit
      }
      console.error(`RapidAPI fixture stats request for fixture ${fixtureId} failed with status ${response.status}: ${await response.text()}`);
      return null; // Indicate fetch error
    }

    const data = await response.json();
    const fixtureStats = data?.response;

    if (!fixtureStats || (Array.isArray(fixtureStats) && fixtureStats.length === 0)) {
      console.log(`No fixture stats data returned or found for fixture ${fixtureId}.`);
      return []; // Represent no stats as an empty array
    } else {
      console.log(`Successfully fetched fixture stats for fixture ${fixtureId}.`);
    }
    return fixtureStats;
  } catch (error) {
    console.error(`Error fetching fixture stats for fixture ${fixtureId}:`, error);
    return null; // Indicate fetch error
  }
}

/**
 * Updates a fixture in Supabase with player and fixture statistics.
 */
async function updateCombinedStats(fixtureId, playerStats, fixtureStats) {
  // Only include fields in the update object if they were successfully fetched (not null)
  const updateData = {};
  const nowISO = new Date().toISOString();

  if (playerStats !== null) {
    updateData.player_statistics = playerStats;
    updateData.player_statistics_last_updated = nowISO;
  }
  if (fixtureStats !== null) {
    updateData.fixture_statistics = fixtureStats;
    updateData.statistics_last_updated = nowISO;
  }

  // If neither was fetched successfully, don't attempt an update
  if (Object.keys(updateData).length === 0) {
    console.log(`Skipping Supabase update for fixture ${fixtureId}: No new data fetched.`);
    return false; // Indicate no update occurred (not necessarily an error)
  }

  console.log(`Updating Supabase combined stats for fixture ${fixtureId}...`);
  try {
    const { data, error } = await supabase
      .from('fixtures')
      .update(updateData)
      .eq('id', fixtureId);

    if (error) throw error;
    console.log(`Successfully updated combined stats for fixture ${fixtureId} in Supabase.`);
    return true; // Indicate success
  } catch (error) {
    console.error(`Error updating Supabase combined stats for fixture ${fixtureId}:`, error);
    return false; // Indicate failure
  }
}

// --- Main Execution Logic ---
async function runUpdate() {
  console.log('Starting combined statistics update process...');
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
  let fetchErrorCount = 0; // Count API fetch errors
  let dbErrorCount = 0; // Count DB update errors

  console.log(`Processing ${todaysFixtures.length} fixtures for potential stats updates...`);

  for (const fixture of todaysFixtures) {
    // Destructure both timestamps
    const { id, date, player_statistics_last_updated, statistics_last_updated } = fixture;

    if (!date) {
        console.log(`Skipping fixture ${id}: Missing date.`);
        skippedCount++;
        continue;
    }

    const fixtureStartDate = new Date(date);
    const estimatedEndTime = new Date(fixtureStartDate.getTime() + MATCH_DURATION_BUFFER_MINUTES * 60 * 1000);
    const lastPlayerStatsUpdate = player_statistics_last_updated ? new Date(player_statistics_last_updated) : null;
    const lastFixtureStatsUpdate = statistics_last_updated ? new Date(statistics_last_updated) : null; // Parse fixture stats timestamp

    // --- Filtering Logic ---
    // 1. Skip if game hasn't started yet
    if (now < fixtureStartDate) {
        // console.log(`Skipping fixture ${id}: Start time ${fixtureStartDate.toISOString()} is in the future.`);
        skippedCount++;
        continue;
    }

    // 2. Skip if game is finished AND BOTH stats have been updated after estimated end time
    if (now > estimatedEndTime &&
        lastPlayerStatsUpdate && lastPlayerStatsUpdate >= estimatedEndTime &&
        lastFixtureStatsUpdate && lastFixtureStatsUpdate >= estimatedEndTime) {
        console.log(`Skipping fixture ${id}: Game finished (${estimatedEndTime.toISOString()}) and both stats updated after end.`);
        skippedCount++;
        continue;
    }

    // --- If not skipped, it's a target for fetching ---
    console.log(`Fixture ${id}: Flagging for combined stats update.`);
    fixturesToUpdate++;

    // Fetch BOTH sets of stats
    const playerStats = await fetchPlayerStats(id);
    // Add a small delay between the two API calls for the same fixture if needed,
    // but usually not necessary as they are different endpoints.
    // await new Promise(resolve => setTimeout(resolve, 200)); // Optional small delay
    const fixtureStats = await fetchFixtureStats(id);

    let fetchFailed = false;
    if (playerStats === null) {
        console.warn(`Fetch failed for player stats, fixture ${id}.`);
        fetchFailed = true;
    }
    if (fixtureStats === null) {
        console.warn(`Fetch failed for fixture stats, fixture ${id}.`);
        fetchFailed = true;
    }

    if (fetchFailed) {
        fetchErrorCount++; // Increment fetch error count if either fetch failed
    }

    // Attempt to update Supabase with whatever data was successfully fetched
    const success = await updateCombinedStats(id, playerStats, fixtureStats);

    if (success) {
        // Only count as fully updated if at least one piece of data was fetched and DB update succeeded
        if (playerStats !== null || fixtureStats !== null) {
             updatedCount++;
        }
    } else {
        // Check if the failure was due to a DB error (not just skipped update)
        if (playerStats !== null || fixtureStats !== null) {
            dbErrorCount++; // Increment DB error count only if there was data to update
        }
    }


    // Delay between processing DIFFERENT fixtures
    await new Promise(resolve => setTimeout(resolve, 1100)); // Slightly over 1 sec delay
  }

  const endTime = Date.now();
  console.log('--- Update Summary ---');
  console.log(`Processed:        ${todaysFixtures.length} fixtures`);
  console.log(`Targeted:         ${fixturesToUpdate}`);
  console.log(`Updated in DB:    ${updatedCount}`); // Fixtures with at least one successful stat update in DB
  console.log(`Skipped (no need): ${skippedCount}`);
  console.log(`API Fetch Errors: ${fetchErrorCount}`); // Count of fixtures where at least one API call failed
  console.log(`DB Update Errors: ${dbErrorCount}`);   // Count of fixtures where DB update failed (when data was available)
  console.log(`Combined stats update process finished in ${(endTime - startTime) / 1000} seconds.`);
}

runUpdate().catch(error => {
  console.error("Unhandled error during script execution:", error);
  process.exit(1);
});