import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Removed: import { corsHeaders } from '../_shared/cors.ts';

// --- Configuration ---
// ... (rest of the configuration remains the same) ...
const API_CONFIG = {
  baseUrl: 'https://api-football-v1.p.rapidapi.com/v3',
  headers: {
    'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
    // IMPORTANT: Store your RapidAPI Key as a Supabase Secret
    // Use the exact name defined in Supabase Secrets
    'x-rapidapi-key': Deno.env.get('RAPIDAPI_KEY') || '',
  },
};

// Export the MAJOR_LEAGUES constant
export const MAJOR_LEAGUES = [
  // Norwegian Leagues
  { id: 103, name: 'Eliteserien' },
  { id: 104, name: 'OBOS-ligaen' },
  { id: 725, name: 'Toppserien' }, // Norwegian Women's League

  // Top 5 Leagues
  { id: 39, name: 'Premier League' },
  { id: 140, name: 'La Liga' },
  { id: 135, name: 'Serie A' },
  { id: 78, name: 'Bundesliga' },
  { id: 61, name: 'Ligue 1' },

  // Other Major European Leagues
  { id: 203, name: 'Süper Lig' }, // Turkey
  { id: 94, name: 'Primeira Liga' }, // Portugal
  { id: 106, name: 'Ekstraklasa' }, // Poland
  { id: 88, name: 'Eredivisie' }, // Netherlands
  { id: 113, name: 'Allsvenskan' }, // Sweden
  { id: 40, name: 'Championship' }, // English Second Tier
  { id: 179, name: 'Superliga' }, // Denmark
  { id: 128, name: 'Veikkausliiga' }, // Finland
  { id: 119, name: 'Tippeligaen' }, // Iceland

  // Major European Competitions
  { id: 2, name: 'Champions League' },
  { id: 3, name: 'Europa League' },
  { id: 848, name: 'Conference League' },

  // International Teams & Competitions
  { id: 1, name: 'World Cup' },
  { id: 4, name: 'Euro Championship' },
  { id: 5, name: 'Nations League' },
  { id: 10, name: 'Friendlies' }, // International Friendlies
  
  // Other Continental Competitions
  { id: 15, name: 'Copa America' },
  { id: 17, name: 'African Nations Cup' },
  { id: 18, name: 'AFC Asian Cup' },

  // Major Non-European Leagues
  { id: 71, name: 'Serie A' }, // Brazil
  { id: 128, name: 'Liga MX' }, // Mexico
  { id: 141, name: 'Primera División' }, // Argentina
  { id: 169, name: 'Super League' }, // China
  { id: 98, name: 'J1 League' }, // Japan
  { id: 253, name: 'MLS' }, // USA
  
  // Women's Football
  { id: 725, name: 'Toppserien' }, // Already added above (Norway)
  { id: 37, name: 'Women\'s World Cup' },
  { id: 38, name: 'Women\'s Champions League' }
];

const norwegianLeagues = [103, 104, 725]; // Eliteserien, OBOS-ligaen, Toppserien

// --- Rate Limiter ---
// ... (rateLimiter remains the same) ...
const rateLimiter = {
  lastCall: 0,
  minDelay: 600, // 600ms between calls (adjust based on RapidAPI plan)

  async checkLimit() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;

    if (timeSinceLastCall < this.minDelay) {
      console.log(`Rate limiting: waiting ${this.minDelay - timeSinceLastCall}ms`);
      await new Promise(resolve => setTimeout(resolve, this.minDelay - timeSinceLastCall));
    }

    this.lastCall = Date.now();
  },
};


// --- Helper Functions ---

// Function to determine the current season year for a league
// (Keep this simple for now, adjust if more complex logic is needed)
function getCurrentSeasonYear(leagueId: number): number {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  // Norwegian leagues typically run within a calendar year
  if (norwegianLeagues.includes(leagueId)) {
    return currentYear;
  }
  // Most European leagues span two years, API usually uses the start year.
  // Let's default to the current year as the most likely 'active' season year.
  // The fallback logic will handle cases where this year isn't populated yet.
  return currentYear;
}

// Modified fetchApi to take endpoint and params object
async function fetchApi(endpoint: string, params?: Record<string, string>) {
  await rateLimiter.checkLimit();
  const url = new URL(API_CONFIG.baseUrl + endpoint);
  if (params) {
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
  }

  console.log(`Fetching: ${url.toString()}`);

  try {
    const response = await fetch(url.toString(), { headers: API_CONFIG.headers });
    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText} for ${url.toString()}`);
      try {
        const errorBody = await response.json();
        console.error("API Error Body:", JSON.stringify(errorBody));
      } catch (e) {
        console.error("Could not parse error body.");
      }
      return null; // Indicate failure
    }
    const data = await response.json();
    if (data.errors && (Object.keys(data.errors).length > 0 || (Array.isArray(data.errors) && data.errors.length > 0))) {
        console.warn(`API returned errors for ${url.toString()}:`, JSON.stringify(data.errors));
        // return null; // Option: treat API-level errors as failure
    }
    return data;
  } catch (error) {
    console.error(`Network or fetch error for ${url.toString()}:`, error);
    return null; // Indicate failure
  }
}

// Renamed from getAllTeams and modified to upsert directly
async function processLeaguesAndUpsertTeams(supabase: SupabaseClient): Promise<{ successCount: number; failCount: number }> {
  let successCount = 0;
  let failCount = 0;
  console.log(`Processing ${MAJOR_LEAGUES.length} leagues...`);

  for (const league of MAJOR_LEAGUES) {
    let season = getCurrentSeasonYear(league.id);
    console.log(`Processing ${league.name} (League ID: ${league.id}, Initial Season: ${season})...`);

    // Use the modified fetchApi function signature
    let apiResponse = await fetchApi('/teams', { league: league.id.toString(), season: season.toString() });

    // Fallback: If no teams found for the current season, try the previous season
    if (apiResponse && apiResponse.results === 0) {
      const previousSeason = season - 1;
      console.log(`Found 0 teams in ${league.name} for season ${season}. Trying previous season ${previousSeason}...`);
      // Use the modified fetchApi function signature
      apiResponse = await fetchApi('/teams', { league: league.id.toString(), season: previousSeason.toString() });
      if (apiResponse && apiResponse.results > 0) {
         season = previousSeason; // Use the previous season for logging if it yielded results
         console.log(`Found ${apiResponse.results} teams in ${league.name} for fallback season ${season}.`);
      } else {
         console.log(`Still found 0 teams in ${league.name} for fallback season ${previousSeason}.`);
      }
    }

    if (apiResponse && apiResponse.response && apiResponse.results > 0) {
       console.log(`Upserting ${apiResponse.results} teams found in ${league.name} (Season: ${season})`);
      for (const teamData of apiResponse.response) {
        if (teamData.team && teamData.team.id) {
          // Directly upsert the basic team and venue info
          const { data: upsertData, error: upsertError } = await supabase
            .from('fotball_teams')
            .upsert({
              team_id: teamData.team.id,
              name: teamData.team.name,
              logo: teamData.team.logo,
              // Store the team and venue object directly in the data column
              data: { team: teamData.team, venue: teamData.venue },
              last_updated: new Date().toISOString(),
            })
            .select(); // select() is optional, useful for debugging

          if (upsertError) {
            console.error(`Failed to upsert team ${teamData.team.id} (${teamData.team.name}):`, upsertError.message);
            failCount++;
          } else {
            // console.log(`Successfully upserted team ${teamData.team.id} (${teamData.team.name})`); // Optional: verbose logging
            successCount++;
          }
        } else {
            console.warn(`Skipping team data due to missing team ID in response for league ${league.name} (Season: ${season})`);
            failCount++; // Count as failure if essential data is missing
        }
      }
    } else if (apiResponse && apiResponse.results === 0) {
       // Logged above during fallback check
    } else {
      console.warn(`Could not fetch teams for ${league.name} (League ID: ${league.id}, Season: ${season}) or response was invalid.`);
      // Potentially count this as a failure for the whole league? Or just log.
    }
  }

  console.log(`Finished processing leagues. Total successful upserts: ${successCount}, Total failures: ${failCount}`);
  return { successCount, failCount }; // Return counts
}

// --- Main Request Handler ---

Deno.serve(async (req) => {
  // Removed CORS preflight check

  try {
    // IMPORTANT: Use environment variables for Supabase URL and Service Key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    // Use Service Role Key for server-side operations like this
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    // Use the exact name defined in Supabase Secrets
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
    }
     if (!rapidApiKey) {
      throw new Error('Missing RapidAPI Key (RAPIDAPI_KEY secret)');
    }
    API_CONFIG.headers['x-rapidapi-key'] = rapidApiKey; // Ensure header is set

    // Use Service Role Key for admin-level access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting team update process...');

    // Call the new processing function directly
    const { successCount, failCount } = await processLeaguesAndUpsertTeams(supabase);

    console.log(`Team update process finished. Upserted: ${successCount}, Failed: ${failCount}`);

    // Return the result
    return new Response(JSON.stringify({ message: `Update complete. Upserted: ${successCount}, Failed: ${failCount}` }), {
      // Removed corsHeaders
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Critical error in Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      // Removed corsHeaders
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// ... (rest of the comments remain the same) ...
/*
Important Considerations:

1.  **Secrets & Environment Variables:**
    *   Go to your Supabase Project Settings -> Secrets and add your RapidAPI key with the name `RAPIDAPI_KEY`.
    *   The `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available as environment variables in deployed Edge Functions. For local development (`supabase functions serve`), you might need to set them in a `.env` file. Use the Service Role Key when modifying data from a function.
2.  **Execution Time Limits:** Edge Functions have execution time limits (e.g., ~15-60 seconds depending on the plan). Fetching data for many teams might exceed this.
    *   **Solution 1 (Simpler):** Reduce the `MAJOR_LEAGUES` list or run the function multiple times (maybe triggered by a scheduler like Supabase Cron Jobs).
    *   **Solution 2 (More Complex):** Modify the function to accept parameters (e.g., a league ID or a batch of team IDs) and trigger it multiple times, processing smaller chunks.
3.  **Rate Limiting:** The `minDelay` in `rateLimiter` is set to 600ms. Adjust this based on your RapidAPI plan's limits (e.g., free plans often have stricter limits like 1 call per second).
4.  **Error Handling:** The code includes basic error handling for API calls and database operations. You might want to add more specific logging or retry logic.
5.  **Dependencies:** Ensure your `supabase/functions/import_map.json` (if you use one) correctly maps `@supabase/supabase-js`. If not using an import map, the direct `esm.sh` URL should work.
6.  **Season Logic:** The `getCurrentSeasonYear` function uses a simple logic. The RapidAPI often requires the starting year of the season (e.g., 2023 for the 23/24 season). You might need to refine this based on how the API behaves for different leagues, especially around the turn of the year. The current code attempts to get the season from the `/leagues` endpoint first, which is often more reliable.
*/
