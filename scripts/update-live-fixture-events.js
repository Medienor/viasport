import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch'; // Use if needed (Node < 18)

// --- Configuration ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const rapidApiKey = process.env.RAPIDAPI_KEY;
const rapidApiHost = 'api-football-v1.p.rapidapi.com';

if (!supabaseUrl || !supabaseServiceKey || !rapidApiKey) {
  console.error('Missing required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RAPIDAPI_KEY).');
  process.exit(1);
}

// --- Initialize Supabase Client ---
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- Constants ---
// Statuses considered "live" for fetching detailed updates
const LIVE_DETAIL_STATUSES = ['1H', 'HT', '2H', 'ET', 'P', 'LIVE', 'INT', 'BREAK', 'BT', 'SUSP']; // Exclude finished/upcoming

// API Call Delay (milliseconds)
const API_DELAY_MS = 1100; // Adjust based on RapidAPI plan

// --- Flag to log only the first response ---
let loggedFirstResponse = false;

// --- Helper Functions ---

/**
 * Fetches IDs of fixtures currently marked as live in Supabase.
 */
async function fetchLiveFixtureIds() {
  console.log(`Fetching live fixture IDs from Supabase (Statuses: ${LIVE_DETAIL_STATUSES.join(', ')})...`);
  try {
    const { data, error } = await supabase
      .from('fixtures')
      .select('id') // Only fetch the ID
      .in('match_status', LIVE_DETAIL_STATUSES); // Filter by live statuses

    if (error) throw error;

    const ids = data ? data.map(f => f.id) : [];
    console.log(`Found ${ids.length} live fixtures.`);
    return ids;
  } catch (error) {
    console.error('Error fetching live fixture IDs from Supabase:', error);
    return [];
  }
}

/**
 * Fetches full fixture details (including events, score, stats) for a specific fixture ID.
 */
async function fetchFixtureDetails(fixtureId) {
  // Use the /v3/fixtures?id= endpoint
  const url = `https://${rapidApiHost}/v3/fixtures?id=${fixtureId}`;
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': rapidApiKey,
      'x-rapidapi-host': rapidApiHost
    }
  };

  console.log(`Fetching details for fixture ${fixtureId} from ${url}`);
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    // Handle API errors or rate limits
    if (!response.ok || data.errors?.requests || data.errors?.rateLimit) {
      console.error(`Error fetching details for fixture ${fixtureId}: Status ${response.status}, Message: ${data.message || JSON.stringify(data.errors)}`);
      return null; // Indicate fetch failure
    }

    // Check if the response array has data
    if (!data.response || data.response.length === 0) {
      console.warn(`No fixture data returned for ID ${fixtureId}.`);
      return null;
    }

    // --- Log the first successful response ---
    if (!loggedFirstResponse && data.response[0]) {
      console.log(`--- RAW API Response Body for Fixture ${fixtureId} (First Found) ---`);
      console.log(JSON.stringify(data.response[0], null, 2)); // Pretty print JSON
      console.log(`--- End RAW API Response Body ---`);
      loggedFirstResponse = true; // Set flag so we don't log again this run
    }
    // --- End Logging ---

    // Return the first (and should be only) fixture object from the response array
    return data.response[0];

  } catch (error) {
    console.error(`Network or parsing error fetching details for fixture ${fixtureId}:`, error);
    return null; // Indicate fetch failure
  }
}

/**
 * Updates the fixture data in Supabase.
 */
async function updateFixtureData(fixtureId, fixtureData) {
  // --- Construct the comprehensive update payload ---
  const updatePayload = {
    // Core fixture details
    fixture: fixtureData.fixture, // Includes status object, date, venue, referee etc.
    league: fixtureData.league,   // Update league info if needed
    teams: fixtureData.teams,     // Update teams info (e.g., winner flag)

    // Score and Goals (Crucial for live display)
    goals: fixtureData.goals,     // e.g., { home: 1, away: 0 }
    score: fixtureData.score,     // e.g., { halftime: {...}, fulltime: {...}, ... }

    // Events (Replaces the old event-specific fetch)
    event_data: fixtureData.events, // Array of event objects

    // Statistics (Optional but useful)
    fixture_statistics: fixtureData.statistics, // Array of team stats objects

    // Player Stats (Optional - can be large, uncomment if needed)
    // player_statistics: fixtureData.players,

    // Derived/Simplified Status
    match_status: fixtureData.fixture?.status?.short, // Keep the short status code updated

    // Timestamp of the last successful update from this script
    details_last_updated_at: new Date().toISOString(),
  };

  // Remove keys with undefined values if necessary (Supabase might handle this)
  Object.keys(updatePayload).forEach(key => {
    if (updatePayload[key] === undefined) {
      delete updatePayload[key];
    }
  });

  console.log(`Updating Supabase for fixture ${fixtureId} with new details...`);
  try {
    const { error, count } = await supabase
      .from('fixtures')
      .update(updatePayload)
      .eq('id', fixtureId);

    if (error) throw error;

    console.log(`Supabase update for ${fixtureId} successful. Rows matched/updated: ${count ?? 'N/A'}`);
    return true; // Indicate success
  } catch (error) {
    console.error(`Error updating Supabase details for fixture ${fixtureId}:`, error);
    return false; // Indicate failure
  }
}

// --- Main Execution Logic ---
async function runLiveUpdate() {
  console.log('Starting LIVE fixture detail update process...');
  const startTime = Date.now();

  // Reset the log flag at the start of each run
  loggedFirstResponse = false;

  const liveFixtureIds = await fetchLiveFixtureIds();

  if (liveFixtureIds.length === 0) {
    console.log('No live fixtures found requiring detail updates. Exiting.');
    return;
  }

  let updatedCount = 0;
  let errorCount = 0;

  console.log(`Processing ${liveFixtureIds.length} live fixtures for detail updates...`);

  for (const fixtureId of liveFixtureIds) {
    const fixtureDetails = await fetchFixtureDetails(fixtureId); // Fetch comprehensive details

    if (fixtureDetails !== null) { // Check if fetch was successful
      const success = await updateFixtureData(fixtureId, fixtureDetails); // Update with new data structure
      if (success) {
        updatedCount++;
      } else {
        errorCount++;
      }
    } else {
      // Fetch failed (rate limit or other error)
      errorCount++; // Count as an error for this cycle
    }

    // Delay between RapidAPI calls
    if (liveFixtureIds.indexOf(fixtureId) < liveFixtureIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, API_DELAY_MS));
    }
  }

  const endTime = Date.now();
  console.log('--- Live Detail Update Summary ---');
  console.log(`Fixtures checked: ${liveFixtureIds.length}`);
  console.log(`Successfully Updated: ${updatedCount}`);
  console.log(`Errors/Fetch Failed: ${errorCount}`);
  console.log(`Live detail update process finished in ${(endTime - startTime) / 1000} seconds.`);
}

runLiveUpdate().catch(error => {
  console.error("Unhandled error during live detail update script execution:", error);
  process.exit(1);
});