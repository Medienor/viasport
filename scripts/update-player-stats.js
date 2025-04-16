import { createClient } from '@supabase/supabase-js';
// Use node-fetch if you installed it (for Node < 18)
// import fetch from 'node-fetch'; // Uncomment this line if using node-fetch

// --- Configuration (Get from Environment Variables) ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use Service Role Key for server-side updates
const rapidApiKey = process.env.RAPIDAPI_KEY;
const internalApiUrl = process.env.INTERNAL_LIVE_FIXTURES_URL; // e.g., 'https://your-app-domain.com/api/football/live'
const rapidApiHost = 'api-football-v1.p.rapidapi.com';

if (!supabaseUrl || !supabaseServiceKey || !rapidApiKey || !internalApiUrl) {
  console.error('Missing required environment variables.');
  process.exit(1);
}

// --- Initialize Supabase Client ---
// Note: Using the Service Role Key bypasses RLS. Ensure this script runs in a secure environment.
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- Helper Functions ---

/**
 * Fetches live fixture IDs from your internal API.
 * Assumes the API returns a structure like { live: [{ fixture: { id: 123 } }, ...] }
 * Adjust parsing based on your actual API response.
 */
async function fetchLiveFixtureIds() {
  console.log(`Fetching live fixtures from ${internalApiUrl}...`);
  try {
    const response = await fetch(internalApiUrl);
    if (!response.ok) {
      throw new Error(`Internal API request failed with status ${response.status}: ${await response.text()}`);
    }
    const data = await response.json();
    // --- Adjust this parsing based on your actual API response ---
    const liveIds = data?.live?.map(match => match?.fixture?.id).filter(id => id != null) || [];
    // --- End adjustment section ---
    console.log(`Found ${liveIds.length} live fixture IDs from internal API.`);
    return new Set(liveIds); // Use a Set for efficient lookup
  } catch (error) {
    console.error('Error fetching live fixture IDs:', error);
    return new Set(); // Return empty set on error
  }
}

/**
 * Fetches ALL fixture IDs stored in your Supabase table using pagination.
 */
async function fetchSupabaseFixtureIds() {
  console.log('Fetching ALL fixture IDs from Supabase (using pagination)...');
  const allSupabaseIds = [];
  const pageSize = 1000; // Supabase default limit
  let page = 0;
  let fetchMore = true;

  try {
    while (fetchMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      console.log(`Fetching Supabase fixtures range: ${from} - ${to}`);

      const { data, error, count } = await supabase
        .from('fixtures') // Your table name
        .select('id', { count: 'exact' }) // Select only the ID column, get total count on first query
        .range(from, to); // Fetch the current page range

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const supabaseIds = data.map(fixture => fixture.id).filter(id => id != null);
        allSupabaseIds.push(...supabaseIds); // Add fetched IDs to the main list
        console.log(`Fetched ${data.length} IDs. Total fetched so far: ${allSupabaseIds.length}`);
      } else {
        // No more data returned, stop fetching
        fetchMore = false;
        console.log('No more Supabase fixtures found.');
      }

      // Optional: Log total count on the first iteration
      if (page === 0 && count !== null) {
          console.log(`Total fixtures count reported by Supabase: ${count}`);
      }

      // Check if we've fetched enough based on the count (if available)
      // This is an optimization to potentially stop early if count is reliable
      if (count !== null && allSupabaseIds.length >= count) {
          console.log('Fetched count matches total count. Stopping pagination.');
          fetchMore = false;
      }


      page++; // Move to the next page for the next iteration

      // Safety break: Add a limit to prevent infinite loops in unexpected scenarios
      if (page > 200) { // Adjust limit based on expected max pages (e.g., 13000 / 1000 = 13 -> 20 pages is safe)
          console.warn("Pagination limit reached. Stopping fetch.");
          fetchMore = false;
      }
    }

    console.log(`Finished fetching. Found ${allSupabaseIds.length} total fixture IDs in Supabase.`);
    return new Set(allSupabaseIds); // Use a Set for efficient lookup

  } catch (error) {
    console.error('Error fetching Supabase fixture IDs with pagination:', error);
    return new Set(); // Return empty set on error
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
      // Handle rate limits specifically if possible (e.g., status 429)
      if (response.status === 429) {
         console.warn(`Rate limit hit for fixture ${fixtureId}. Skipping for now.`);
         return null;
      }
      throw new Error(`RapidAPI request for fixture ${fixtureId} failed with status ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    // --- Adjust this if the structure is different ---
    // Assuming the stats are directly in the response or within a specific key
    const statsData = data?.response;
    // --- End adjustment section ---

    if (!statsData || (Array.isArray(statsData) && statsData.length === 0)) {
        console.log(`No player stats data returned for fixture ${fixtureId}.`);
        return null; // Or return an empty object/array if preferred
    }

    console.log(`Successfully fetched player stats for fixture ${fixtureId}.`);
    return statsData;
  } catch (error) {
    console.error(`Error fetching player stats for fixture ${fixtureId}:`, error);
    return null; // Return null on error
  }
}

/**
 * Updates a fixture in Supabase with player statistics.
 */
async function updateFixtureStats(fixtureId, playerStats) {
  console.log(`Updating Supabase for fixture ${fixtureId}...`);
  try {
    const { data, error } = await supabase
      .from('fixtures') // Your table name
      .update({
        player_statistics: playerStats,
        player_statistics_last_updated: new Date().toISOString(), // Use ISO string for timestamptz
      })
      .eq('id', fixtureId); // Match the specific fixture ID

    if (error) {
      throw error;
    }
    console.log(`Successfully updated fixture ${fixtureId} in Supabase.`);
  } catch (error) {
    console.error(`Error updating Supabase for fixture ${fixtureId}:`, error);
  }
}

// --- Main Execution Logic ---
async function runUpdate() {
  console.log('Starting player statistics update process...');
  const startTime = Date.now();

  const [liveFixtureIds, supabaseFixtureIds] = await Promise.all([
    fetchLiveFixtureIds(),
    fetchSupabaseFixtureIds(),
  ]);

  if (liveFixtureIds.size === 0) {
    console.log('No live fixtures found via internal API. Exiting.');
    return;
  }

  if (supabaseFixtureIds.size === 0) {
    console.log('No fixtures found in Supabase. Exiting.');
    return;
  }

  // Find the intersection: fixtures that are live AND in our database
  const fixturesToUpdate = [...liveFixtureIds].filter(id => supabaseFixtureIds.has(id));

  if (fixturesToUpdate.length === 0) {
    console.log('No currently live fixtures match those stored in Supabase. Exiting.');
    return;
  }

  console.log(`Found ${fixturesToUpdate.length} live fixtures in Supabase to update: ${fixturesToUpdate.join(', ')}`);

  // Process updates sequentially with a small delay to avoid hammering the API
  for (const fixtureId of fixturesToUpdate) {
    const playerStats = await fetchPlayerStats(fixtureId);

    if (playerStats) {
      await updateFixtureStats(fixtureId, playerStats);
    } else {
      console.log(`Skipping Supabase update for fixture ${fixtureId} due to missing stats data.`);
    }

    // Add a small delay (e.g., 1 second) between RapidAPI calls
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const endTime = Date.now();
  console.log(`Player statistics update process finished in ${(endTime - startTime) / 1000} seconds.`);
}

runUpdate().catch(error => {
  console.error("Unhandled error during script execution:", error);
  process.exit(1);
});