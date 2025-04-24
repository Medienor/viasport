import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

// --- Constants ---
// Consider making this an environment variable if it might change
const LIVE_API_URL = 'https://viasport.no/api/football/live';

// --- Type Definitions (Adjust based on your actual API structure) ---
interface LiveFixtureStatus {
  long: string | null;
  short: string | null;
  elapsed: number | null;
  extra: number | null;
}

interface LiveFixture {
  fixture: {
    id: number;
    status: LiveFixtureStatus;
    // include other fixture details if needed by your logic
  };
  // include other live data details if needed
}

// Assuming the API response has a top-level 'live' array
interface LiveApiResponse {
  live: LiveFixture[];
  // Add other potential top-level keys if they exist in the response
}

// --- Main Update Logic ---
async function runUpdate(supabaseAdmin: SupabaseClient) {
  let updatedCount = 0;
  let errorCount = 0;
  let liveApiFixtureIds: number[] = [];

  console.log('Starting NS -> Live status update process...');

  try {
    // 1. Fetch live data from the external API
    console.log(`Fetching live data from ${LIVE_API_URL}...`);
    const apiResponse = await fetch(LIVE_API_URL); // Deno's built-in fetch

    if (!apiResponse.ok) {
      // Log the error response body if possible for more details
      const errorBody = await apiResponse.text();
      console.error(`API Error Response Body: ${errorBody}`);
      throw new Error(`Failed to fetch live data: ${apiResponse.status} ${apiResponse.statusText}`);
    }

    const liveData: LiveApiResponse = await apiResponse.json();

    // Check if the 'live' array exists and is not empty
    if (!liveData || !Array.isArray(liveData.live) || liveData.live.length === 0) {
      console.log('No live matches found or invalid format in the API feed.');
      return { updatedCount, errorCount, liveApiFixtureIds }; // Return early
    }

    // 2. Extract live fixture IDs and their full status objects
    const liveFixtureMap = new Map<number, LiveFixtureStatus>();
    liveApiFixtureIds = liveData.live
      .map((item) => {
        // Add checks for the existence of nested properties
        if (item?.fixture?.id && item?.fixture?.status) {
          // Ensure the ID is treated as a number
          const fixtureId = Number(item.fixture.id);
          if (!isNaN(fixtureId)) {
             liveFixtureMap.set(fixtureId, item.fixture.status);
             return fixtureId;
          } else {
             console.warn(`Skipping item with non-numeric fixture ID in live API feed: ${item.fixture.id}`);
             return null;
          }
        } else {
          console.warn('Skipping malformed item in live API feed:', JSON.stringify(item));
          return null; // Indicate an invalid item
        }
      })
      .filter((id): id is number => id !== null); // Filter out nulls and ensure type is number[]

    if (liveApiFixtureIds.length === 0) {
      console.log('No valid live fixture IDs extracted from API feed.');
      return { updatedCount, errorCount, liveApiFixtureIds };
    }
    console.log(`Found ${liveApiFixtureIds.length} valid live fixtures in API feed.`);
    // --- Explicit Log of IDs being searched for ---
    console.log('IDs from Live API to check in Supabase:', JSON.stringify(liveApiFixtureIds));
    // --- End Log ---

    // 3. Query Supabase for 'NS' matches that are live according to the API
    console.log("Querying Supabase: Looking for rows in 'fixtures' table where 'id' is in the list above AND 'match_status' column is exactly 'NS'.");
    const { data: nsMatches, error: selectError } = await supabaseAdmin
      .from('fixtures') // Your table name
      .select('id, status, match_status') // Select relevant columns
      .in('id', liveApiFixtureIds) // Filter 1: ID must be one from the live API list
      .eq('match_status', 'NS'); // Filter 2: The 'match_status' (TEXT column) must be 'NS'

    if (selectError) {
      console.error('Supabase select error:', selectError);
      throw new Error(`Supabase select error: ${selectError.message}`);
    }

    // --- Check if the query returned anything ---
    if (!nsMatches || nsMatches.length === 0) {
      // This log means the query above found ZERO rows matching BOTH conditions.
      console.log("Supabase query returned 0 rows. This means NO fixtures were found matching BOTH: (ID is in the live API list) AND (match_status column is 'NS').");
      return { updatedCount, errorCount, liveApiFixtureIds }; // Return early
    }
    // --- End Check ---

    // If we reach here, the query found at least one match.
    console.log(`Supabase query found ${nsMatches.length} fixture(s) to update (ID was live in API and match_status was 'NS'). IDs: ${nsMatches.map(m => m.id).join(', ')}`);

    // 4. Prepare and execute updates for each match found
    const updatePromises = [];
    for (const match of nsMatches) { // Loop through matches found by the query
      const liveStatus = liveFixtureMap.get(match.id); // Get the corresponding status from the API data we stored earlier

      // Double-check we have the status and it's not NS anymore
      if (liveStatus && liveStatus.short && liveStatus.short !== 'NS') {
        console.log(`Preparing update for fixture ${match.id}: Setting status to ${JSON.stringify(liveStatus)} and match_status to '${liveStatus.short}'`);
        updatePromises.push(
          supabaseAdmin
            .from('fixtures')
            .update({
              status: liveStatus,        // Update the JSONB column
              match_status: liveStatus.short // Update the TEXT column
            })
            .eq('id', match.id) // Update only this specific match
            .then(({ error }) => {
              if (error) {
                console.error(`Failed to update fixture ${match.id}:`, error.message);
                errorCount++;
              } else {
                updatedCount++;
              }
            })
        );
      } else {
        // Log if something unexpected happens (e.g., API status missing or still NS)
         console.warn(`Skipping update for fixture ${match.id}. Reason: Could not find valid live status in map OR API status was still NS. Live status found:`, liveStatus);
      }
    }

    // Execute all update promises concurrently
    await Promise.allSettled(updatePromises);

    console.log('Live match status update processing finished.');

  } catch (error) {
    // Catch errors from fetch, JSON parsing, or Supabase query
    console.error('Error during NS -> Live status update process:', error.message, error.stack);
    errorCount++; // Increment general error count
  }

  // Return summary data
  return { updatedCount, errorCount, liveApiFixtureIds };
}

// --- Edge Function Entry Point ---
serve(async (req) => {
  const startTime = Date.now();
  console.log('Function update-ns-to-live invoked.');

  // --- Environment Variables ---
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  // Use Service Role Key for backend updates
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).');
    return new Response(JSON.stringify({ error: 'Internal Server Error: Missing configuration' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // --- Initialize Supabase Admin Client ---
  // Recommended practice: Pass auth header for Deno
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: { headers: { Authorization: `Bearer ${supabaseServiceRoleKey}` } },
  });

  // --- Run the main update logic ---
  const { updatedCount, errorCount, liveApiFixtureIds } = await runUpdate(supabaseAdmin);

  // --- Log Summary & Return Response ---
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  const summary = `--- Summary --- Live Fixtures in API: ${liveApiFixtureIds.length}, Fixtures Updated (NS->Live): ${updatedCount}, Errors: ${errorCount}, Duration: ${duration.toFixed(2)}s`;
  console.log(summary);

  // Return a JSON response suitable for cron job monitoring
  return new Response(JSON.stringify({ message: "NS to Live status update process finished.", summary }), {
    headers: { 'Content-Type': 'application/json' },
    status: errorCount > 0 ? 500 : 200, // Indicate success/failure based on errors
  });
});

// Log when the function initially loads (useful for debugging deployments)
console.log('Edge function update-ns-to-live started.');