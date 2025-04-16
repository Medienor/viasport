import { createClient } from '@supabase/supabase-js';
// import fetch from 'node-fetch'; // Uncomment if using Node < 18

// --- Configuration (Get from Environment Variables) ---
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
// Adjust these based on the exact status codes from API-Football v3
const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'P', 'LIVE', 'INT', 'BREAK']); // Statuses indicating the game is actively playing or paused mid-game
const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'AWD', 'WO']); // Statuses indicating the game is definitively over

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
async function fetchFixturesForDateRange(startUTC, endUTC) {
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

      const { data, error, count } = await supabase
        .from('fixtures')
        .select('id, match_status, event_data, date', { count: 'exact' })
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
    return []; // Return empty array on error
  }
}

/**
 * Fetches event data for a specific fixture from RapidAPI.
 */
async function fetchFixtureEvents(fixtureId) {
  const url = `https://${rapidApiHost}/v3/fixtures/events?fixture=${fixtureId}`;
  console.log(`Fetching events for fixture ${fixtureId} from RapidAPI...`);
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
         console.warn(`Rate limit hit for fixture events ${fixtureId}. Skipping for now.`);
         return null; // Indicate rate limit hit
      }
      // Log other errors but potentially return empty array if fixture genuinely has no events yet
      console.error(`RapidAPI event request for fixture ${fixtureId} failed with status ${response.status}: ${await response.text()}`);
      // Decide if returning [] or null is better here. [] might be safer for DB update.
      return [];
    }

    const data = await response.json();
    const events = data?.response; // Adjust based on actual API structure

    if (!events) {
        console.log(`No event data structure returned for fixture ${fixtureId}.`);
        return []; // Return empty array if response structure is missing
    }
     if (Array.isArray(events) && events.length === 0) {
        console.log(`No events found for fixture ${fixtureId}.`);
    } else {
        console.log(`Successfully fetched ${events.length} events for fixture ${fixtureId}.`);
    }
    return events; // Return the array of events (can be empty)
  } catch (error) {
    console.error(`Error fetching events for fixture ${fixtureId}:`, error);
    return null; // Indicate fetch error
  }
}

/**
 * Updates a fixture in Supabase with event data.
 */
async function updateFixtureEvents(fixtureId, events) {
  console.log(`Updating Supabase events for fixture ${fixtureId}...`);
  try {
    const { data, error } = await supabase
      .from('fixtures')
      .update({
        event_data: events, // Store the fetched events (JSONB)
        event_data_last_updated: new Date().toISOString(), // Add/update timestamp
      })
      .eq('id', fixtureId);

    if (error) throw error;
    console.log(`Successfully updated events for fixture ${fixtureId} in Supabase.`);
  } catch (error) {
    console.error(`Error updating Supabase events for fixture ${fixtureId}:`, error);
  }
}

// --- Main Execution Logic ---
async function runUpdate() {
  console.log('Starting fixture event update process...');
  const startTime = Date.now();

  const { startUTC, endUTC } = getTodayUTCRange();
  const todaysFixtures = await fetchFixturesForDateRange(startUTC, endUTC);

  if (todaysFixtures.length === 0) {
    console.log('No fixtures found scheduled for today. Exiting.');
    return;
  }

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  console.log(`Processing ${todaysFixtures.length} fixtures for potential event updates...`);

  for (const fixture of todaysFixtures) {
    const { id, match_status, event_data } = fixture;
    let shouldFetch = false;

    // Rule 1: Always fetch for live games
    if (LIVE_STATUSES.has(match_status)) {
      console.log(`Fixture ${id} is LIVE (Status: ${match_status}). Flagging for event update.`);
      shouldFetch = true;
    }
    // Rule 2: Fetch if not finished and event_data is missing/empty
    else if (!FINISHED_STATUSES.has(match_status) && (event_data === null || (Array.isArray(event_data) && event_data.length === 0))) {
        console.log(`Fixture ${id} (Status: ${match_status}) has empty/null events. Flagging for initial fetch.`);
        shouldFetch = true;
    }
    // Rule 3: Skip finished or already populated (and not live)
    else {
        // console.log(`Skipping fixture ${id} (Status: ${match_status}, Events Populated: ${event_data !== null}).`);
        skippedCount++;
        continue; // Move to the next fixture
    }

    if (shouldFetch) {
      const events = await fetchFixtureEvents(id);

      // Only update if fetch was successful (events is not null)
      // We store empty arrays [] if the API returns no events for a fixture
      if (events !== null) {
        await updateFixtureEvents(id, events);
        updatedCount++;
      } else {
        // Fetch failed (e.g., rate limit or network error)
        errorCount++;
      }

      // Delay between RapidAPI calls
      await new Promise(resolve => setTimeout(resolve, 1100)); // Slightly over 1 sec delay
    }
  }

  const endTime = Date.now();
  console.log('--- Update Summary ---');
  console.log(`Processed: ${todaysFixtures.length} fixtures`);
  console.log(`Updated:   ${updatedCount}`);
  console.log(`Skipped:   ${skippedCount}`);
  console.log(`Errors:    ${errorCount}`);
  console.log(`Fixture event update process finished in ${(endTime - startTime) / 1000} seconds.`);
}

runUpdate().catch(error => {
  console.error("Unhandled error during script execution:", error);
  process.exit(1);
});