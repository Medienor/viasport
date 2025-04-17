import { createClient } from '@supabase/supabase-js';
// Use node-fetch if needed (Node < 18)
import fetch from 'node-fetch';

// --- Configuration (Get from Environment Variables) ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use Service Role for updates
const rapidApiKey = process.env.RAPIDAPI_KEY;
const rapidApiHost = 'api-football-v1.p.rapidapi.com';

if (!supabaseUrl || !supabaseServiceKey || !rapidApiKey) {
  console.error('Missing required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RAPIDAPI_KEY).');
  process.exit(1);
}

// --- Initialize Supabase Client ---
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- Constants ---
// Define statuses considered "live" for event fetching purposes
// IMPORTANT: Exclude finished statuses like 'FT', 'AET', 'PEN'
const LIVE_EVENT_STATUSES = ['1H', 'HT', '2H', 'ET', 'P', 'LIVE', 'INT', 'BREAK', 'BT']; // Add any other relevant live/paused statuses

// API Call Delay (milliseconds) - adjust based on RapidAPI plan limits
const API_DELAY_MS = 1100; // Slightly over 1 second to be safe

// --- Helper Functions ---

/**
 * Fetches IDs of fixtures currently marked as live in Supabase.
 */
async function fetchLiveFixtureIds() {
  console.log(`Fetching live fixture IDs from Supabase (Statuses: ${LIVE_EVENT_STATUSES.join(', ')})...`);
  try {
    const { data, error } = await supabase
      .from('fixtures')
      .select('id') // Only fetch the ID
      .in('match_status', LIVE_EVENT_STATUSES); // Filter by live statuses

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
 * Fetches event data for a specific fixture from RapidAPI.
 * (Identical to the one in your other script, kept here for clarity)
 */
async function fetchFixtureEvents(fixtureId) {
  const url = `https://${rapidApiHost}/v3/fixtures/events?fixture=${fixtureId}`;
  console.log(`Fetching events for live fixture ${fixtureId} from RapidAPI...`);
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
         console.warn(`Rate limit hit for fixture events ${fixtureId}. Skipping this update cycle.`);
         return null; // Indicate rate limit hit
      }
      console.error(`RapidAPI event request for fixture ${fixtureId} failed with status ${response.status}: ${await response.text()}`);
      return null; // Indicate other fetch error
    }

    const data = await response.json();
    const events = data?.response;

    if (!events) {
        console.log(`No event data structure returned for fixture ${fixtureId}.`);
        return []; // Return empty array if response structure is missing but request was ok
    }
     if (Array.isArray(events)) {
        console.log(`Successfully fetched ${events.length} events for fixture ${fixtureId}.`);
     } else {
         console.warn(`Unexpected event data format for fixture ${fixtureId}:`, events);
         return []; // Return empty if format is wrong
     }
    return events;
  } catch (error) {
    console.error(`Error fetching events for fixture ${fixtureId}:`, error);
    return null; // Indicate fetch error
  }
}

/**
 * Updates a fixture in Supabase with event data.
 * (Identical to the one in your other script)
 */
async function updateFixtureEvents(fixtureId, events) {
  console.log(`Updating Supabase events for live fixture ${fixtureId}...`);
  try {
    const { data, error } = await supabase
      .from('fixtures')
      .update({
        event_data: events, // Overwrite with the latest events
        event_last_updated: new Date().toISOString(), // Update timestamp
      })
      .eq('id', fixtureId);

    if (error) throw error;
    console.log(`Successfully updated events for fixture ${fixtureId} in Supabase.`);
    return true;
  } catch (error) {
    console.error(`Error updating Supabase events for fixture ${fixtureId}:`, error);
    return false;
  }
}

// --- Main Execution Logic ---
async function runLiveUpdate() {
  console.log('Starting LIVE fixture event update process...');
  const startTime = Date.now();

  const liveFixtureIds = await fetchLiveFixtureIds();

  if (liveFixtureIds.length === 0) {
    console.log('No live fixtures found requiring event updates. Exiting.');
    return;
  }

  let updatedCount = 0;
  let errorCount = 0;

  console.log(`Processing ${liveFixtureIds.length} live fixtures for event updates...`);

  for (const fixtureId of liveFixtureIds) {
    const events = await fetchFixtureEvents(fixtureId);

    if (events !== null) { // Check if fetch was successful (not rate limited or errored)
      const success = await updateFixtureEvents(fixtureId, events);
      if (success) {
        updatedCount++;
      } else {
        errorCount++;
      }
    } else {
      // Fetch failed (rate limit or other error)
      errorCount++; // Count as an error for this cycle
    }

    // Delay between RapidAPI calls to avoid hitting rate limits too quickly
    if (liveFixtureIds.indexOf(fixtureId) < liveFixtureIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, API_DELAY_MS));
    }
  }

  const endTime = Date.now();
  console.log('--- Live Event Update Summary ---');
  console.log(`Fixtures checked: ${liveFixtureIds.length}`);
  console.log(`Successfully Updated: ${updatedCount}`);
  console.log(`Errors/Skipped: ${errorCount}`);
  console.log(`Live event update process finished in ${(endTime - startTime) / 1000} seconds.`);
}

runLiveUpdate().catch(error => {
  console.error("Unhandled error during live event update script execution:", error);
  process.exit(1);
});