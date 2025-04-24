import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2'; // Use npm specifier
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'; // Standard Deno HTTP server

// --- Constants ---
const LIVE_DETAIL_STATUSES = ['1H', 'HT', '2H', 'ET', 'P', 'LIVE', 'INT', 'BREAK', 'BT', 'SUSP'];
const API_DELAY_MS = 1100; // Delay between RapidAPI calls within a single function invocation
const RAPIDAPI_HOST = 'api-football-v1.p.rapidapi.com';

// --- Type Definitions (Optional but Recommended) ---
interface FixtureData {
  fixture: any;
  league: any;
  teams: any;
  goals: any;
  score: any;
  events: any[];
  statistics: any[];
  players?: any[]; // Optional player stats
  lineups?: any[]; // <<< ENSURE THIS IS PRESENT AND NOT COMMENTED OUT
}

// --- Helper Functions ---

async function fetchLiveFixtureIds(supabase: SupabaseClient): Promise<number[]> {
  console.log(`Fetching live fixture IDs from Supabase (Statuses: ${LIVE_DETAIL_STATUSES.join(', ')})...`);
  try {
    const { data, error } = await supabase
      .from('fixtures')
      .select('id')
      .in('match_status', LIVE_DETAIL_STATUSES);

    if (error) throw error;

    const ids = data ? data.map((f: { id: number }) => f.id) : [];
    console.log(`Found ${ids.length} live fixtures.`);
    return ids;
  } catch (error) {
    console.error('Error fetching live fixture IDs from Supabase:', error.message);
    return [];
  }
}

async function fetchFixtureDetails(fixtureId: number, rapidApiKey: string): Promise<FixtureData | null> {
  const url = `https://${RAPIDAPI_HOST}/v3/fixtures?id=${fixtureId}`;
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': rapidApiKey,
      'x-rapidapi-host': RAPIDAPI_HOST,
    },
  };

  console.log(`Fetching details for fixture ${fixtureId} from ${url}`);
  try {
    const response = await fetch(url, options); // Deno has built-in fetch
    const data = await response.json();

    if (!response.ok || data.errors?.requests || data.errors?.rateLimit) {
      console.error(`Error fetching details for fixture ${fixtureId}: Status ${response.status}, Message: ${data.message || JSON.stringify(data.errors)}`);
      return null;
    }
    if (!data.response || data.response.length === 0) {
      console.warn(`No fixture data returned for ID ${fixtureId}.`);
      return null;
    }

    // Basic validation (can be expanded)
    if (!data.response[0]?.fixture?.id) {
       console.warn(`Incomplete fixture data received for ID ${fixtureId}.`);
       return null;
    }

    // --- Log first response (optional, useful for debugging) ---
    // Consider removing this in production for cleaner logs
    console.log(`--- RAW API Response Body for Fixture ${fixtureId} ---`);
    console.log(JSON.stringify(data.response[0], null, 2)); // Log the first fixture object prettified
    console.log(`--- End RAW API Response Body ---`);
    // --- End logging ---

    return data.response[0] as FixtureData;

  } catch (error) {
    console.error(`Network or parsing error fetching details for fixture ${fixtureId}:`, error.message);
    return null;
  }
}

async function updateFixtureData(supabase: SupabaseClient, fixtureId: number, fixtureData: FixtureData): Promise<boolean> {
  // Base payload with common fields
  const updatePayload: { [key: string]: any } = { // Define type for easier manipulation
    fixture: fixtureData.fixture,
    league: fixtureData.league,
    teams: fixtureData.teams,
    goals: fixtureData.goals,
    score: fixtureData.score,
    status: fixtureData.fixture?.status,
    event_data: fixtureData.events,
    fixture_statistics: fixtureData.statistics, // Assuming this is TEAM stats
    // player_statistics: fixtureData.players, // Keep this commented unless you want unconditional update
    match_status: fixtureData.fixture?.status?.short,
    details_last_updated_at: new Date().toISOString(), // Timestamp for general details update
  };

  // --- Conditionally add lineup data ---
  // Check if lineups exist in the fetched data and the array is not empty
  if (fixtureData.lineups && Array.isArray(fixtureData.lineups) && fixtureData.lineups.length > 0) {
    console.log(`Fixture ${fixtureId}: Found lineup data in API response. Adding to update.`);
    updatePayload.lineups = fixtureData.lineups; // Add the lineup array (to 'lineups' jsonb column)
    updatePayload.lineups_last_updated = new Date().toISOString(); // Add the specific lineup timestamp (to 'lineups_last_updated' timestampz column)
  } else {
    console.log(`Fixture ${fixtureId}: No lineup data found in this API response. Skipping lineup update.`);
  }
  // --- End conditional lineup data ---

  // --- Conditionally add player statistics data ---
  // Check if players stats exist in the fetched data and the array is not empty
  if (fixtureData.players && Array.isArray(fixtureData.players) && fixtureData.players.length > 0) {
    console.log(`Fixture ${fixtureId}: Found player statistics data in API response. Adding to update.`);
    updatePayload.player_statistics = fixtureData.players; // Add the player stats array (to 'player_statistics' jsonb column)
    updatePayload.player_statistics_last_updated = new Date().toISOString(); // Add the specific player stats timestamp (to 'player_statistics_last_updated' timestampz column)
  } else {
    console.log(`Fixture ${fixtureId}: No player statistics data found in this API response. Skipping player statistics update.`);
  }
  // --- End conditional player statistics data ---


  // Remove undefined keys (good practice, although less likely with the typed payload)
  Object.keys(updatePayload).forEach((key) => {
    if (updatePayload[key] === undefined) {
      delete updatePayload[key];
    }
  });

  // --- Add these log lines for verification ---
  console.log(`Fixture ${fixtureId}: Preparing to update with status: ${JSON.stringify(fixtureData.fixture?.status)}`);
  console.log(`Fixture ${fixtureId}: Preparing to update with general timestamp: ${updatePayload.details_last_updated_at}`);
  // Log lineup timestamp if it was added
  if (updatePayload.lineups_last_updated) {
    console.log(`Fixture ${fixtureId}: Preparing to update with lineup timestamp: ${updatePayload.lineups_last_updated}`);
  }
  // Log player stats timestamp if it was added
  if (updatePayload.player_statistics_last_updated) {
    console.log(`Fixture ${fixtureId}: Preparing to update with player statistics timestamp: ${updatePayload.player_statistics_last_updated}`);
  }
  // --- End added log lines ---

  console.log(`Updating Supabase for fixture ${fixtureId}... Payload keys: ${Object.keys(updatePayload).join(', ')}`); // Log keys being sent
  try {
    const { error, count } = await supabase
      .from('fixtures')
      .update(updatePayload) // Send the potentially modified payload
      .eq('id', fixtureId);

    if (error) throw error;

    console.log(`Supabase update for ${fixtureId} successful. Rows matched/updated: ${count ?? 'N/A'}`);
    return true;
  } catch (error) {
    console.error(`Error updating Supabase details for fixture ${fixtureId}:`, error.message);
    return false;
  }
}

// --- Main Edge Function Handler ---
serve(async (req) => {
  console.log('Edge Function "update-live-fixture-details" invoked.');
  const startTime = Date.now();

  // --- Get Environment Variables ---
  // Ensure these are set in your Supabase project's Function settings or .env file for local dev
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // Use Service Role Key for backend operations
  const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');

  if (!supabaseUrl || !supabaseServiceRoleKey || !rapidApiKey) {
    console.error('Missing required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RAPIDAPI_KEY).');
    return new Response('Internal Server Error: Missing configuration', { status: 500 });
  }

  // --- Initialize Supabase Client ---
  // Note: Use service_role key for backend operations like this cron job
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  let updatedCount = 0;
  let errorCount = 0;
  let fixtureIds: number[] = [];

  try {
    fixtureIds = await fetchLiveFixtureIds(supabaseAdmin);

    if (fixtureIds.length === 0) {
      console.log('No live fixtures found requiring detail updates.');
    } else {
      console.log(`Processing ${fixtureIds.length} live fixtures...`);

      for (const fixtureId of fixtureIds) {
        const fixtureDetails = await fetchFixtureDetails(fixtureId, rapidApiKey);

        if (fixtureDetails !== null) {
          const success = await updateFixtureData(supabaseAdmin, fixtureId, fixtureDetails);
          if (success) {
            updatedCount++;
          } else {
            errorCount++;
          }
        } else {
          errorCount++; // Fetch failed
        }

        // Delay between RapidAPI calls if processing multiple fixtures in one run
        if (fixtureIds.indexOf(fixtureId) < fixtureIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, API_DELAY_MS));
        }
      }
    }
  } catch (e) {
     console.error("Unhandled error during main execution:", e.message);
     errorCount++; // Count the top-level error
  }


  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  const summary = `--- Summary --- Fixtures Checked: ${fixtureIds.length}, Updated: ${updatedCount}, Errors: ${errorCount}, Duration: ${duration.toFixed(2)}s`;
  console.log(summary);

  // Return a response for the cron job invocation
  return new Response(JSON.stringify({ message: "Live fixture update process finished.", summary }), {
    headers: { 'Content-Type': 'application/json' },
    status: errorCount > 0 ? 500 : 200, // Indicate success/failure
  });
});

console.log('Edge function update-live-fixture-details started.'); // Log when the function initially loads