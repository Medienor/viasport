import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- Configuration ---
const API_CONFIG = {
  baseUrl: 'https://api-football-v1.p.rapidapi.com/v3',
  headers: {
    'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
    // IMPORTANT: Store your RapidAPI Key as a Supabase Secret
    'x-rapidapi-key': Deno.env.get('RAPIDAPI_KEY') || '',
  },
};

// Interface for league data from Supabase
interface League {
  id: number;
  name: string;
  type?: string;
  country?: string;
  logo?: string;
  flag?: string;
}

const norwegianLeagues = [103, 104, 725]; // Eliteserien, OBOS-ligaen, Toppserien

// --- Rate Limiter ---
const rateLimiter = {
  lastCall: 0,
  minDelay: 10, // Minimal delay to avoid overwhelming

  async checkLimit() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;

    if (timeSinceLastCall < this.minDelay) {
      await new Promise(resolve => setTimeout(resolve, this.minDelay - timeSinceLastCall));
    }

    this.lastCall = Date.now();
  },
};

// --- Helper Functions ---

// Function to determine the current season year for a league
function getCurrentSeasonYear(leagueId: number): number {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  // Norwegian leagues typically run within a calendar year
  if (norwegianLeagues.includes(leagueId)) {
    return currentYear;
  }
  // Most European leagues span two years, API usually uses the start year.
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
      } catch {
        console.error("Could not parse error body.");
      }
      return null; // Indicate failure
    }
    const data = await response.json();
    if (data.errors && (Object.keys(data.errors).length > 0 || (Array.isArray(data.errors) && data.errors.length > 0))) {
        console.warn(`API returned errors for ${url.toString()}:`, JSON.stringify(data.errors));
    }
    return data;
  } catch (error) {
    console.error(`Network or fetch error for ${url.toString()}:`, error);
    return null; // Indicate failure
  }
}

// Function to fetch all leagues from Supabase with pagination
async function fetchAllLeagues(supabase: SupabaseClient, options?: {
  types?: string[]; // Filter by league types (e.g., ['League', 'Cup'])
  countries?: string[]; // Filter by specific countries
  limit?: number; // Limit total number of leagues to process
}): Promise<League[]> {
  const allLeagues: League[] = [];
  let page = 0;
  const pageSize = 1000; // Supabase default limit
  
  while (true) {
    let query = supabase
      .from('leagues')
      .select('id, name, type, country, logo, flag')
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('id');

    // Apply filters if provided
    if (options?.types && options.types.length > 0) {
      query = query.in('type', options.types);
    }
    if (options?.countries && options.countries.length > 0) {
      query = query.in('country', options.countries);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching leagues:', error);
      break;
    }

    if (!data || data.length === 0) {
      break; // No more data
    }

    allLeagues.push(...data);
    console.log(`Fetched ${data.length} leagues (page ${page + 1})`);

    // Check if we've reached the limit
    if (options?.limit && allLeagues.length >= options.limit) {
      allLeagues.splice(options.limit); // Trim to exact limit
      console.log(`Reached specified limit of ${options.limit} leagues`);
      break;
    }

    if (data.length < pageSize) {
      break; // Last page
    }

    page++;
  }

  console.log(`Total leagues fetched: ${allLeagues.length}`);
  return allLeagues;
}

// Function to process leagues and upsert standings
async function processLeaguesAndUpsertStandings(supabase: SupabaseClient, batchStart: number = 0, batchSize: number = 100): Promise<{ successCount: number; failCount: number }> {
  let successCount = 0;
  let failCount = 0;
  
  // Fetch all leagues from Supabase
  // Fetch ALL leagues - no limits
  const allLeagues = await fetchAllLeagues(supabase, {
    // types: ['League'], // Only process regular leagues (uncomment to filter)
    // countries: ['England', 'Spain', 'Germany'], // Only specific countries (uncomment to filter)
    // No limit - fetch all leagues
  });
  
  // Get the batch of leagues to process
  const leagues = allLeagues.slice(batchStart, batchStart + batchSize);
  console.log(`Processing batch ${batchStart}-${batchStart + batchSize}: ${leagues.length} leagues (out of ${allLeagues.length} total)`);

  for (const league of leagues) {
    let season = getCurrentSeasonYear(league.id);
    
    // Check if standings were updated in the last 3 hours
    const { data: existingData } = await supabase
      .from('fotball_standings')
      .select('last_updated')
      .eq('league_id', league.id)
      .eq('season', season)
      .single();

    if (existingData) {
      const lastUpdated = new Date(existingData.last_updated);
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      
      if (lastUpdated > threeHoursAgo) {
        console.log(`Skipping ${league.name} - updated ${lastUpdated.toISOString()}, less than 3 hours ago`);
        continue;
      }
    }

    console.log(`Processing standings for ${league.name} (League ID: ${league.id}, Season: ${season})...`);

    // Fetch standings data
    let apiResponse = await fetchApi('/standings', { league: league.id.toString(), season: season.toString() });

    // Fallback: If no standings found for the current season, try the previous season
    if (apiResponse && apiResponse.results === 0) {
      const previousSeason = season - 1;
      console.log(`Found 0 standings in ${league.name} for season ${season}. Trying previous season ${previousSeason}...`);
      apiResponse = await fetchApi('/standings', { league: league.id.toString(), season: previousSeason.toString() });
      if (apiResponse && apiResponse.results > 0) {
         season = previousSeason; // Use the previous season for logging if it yielded results
         console.log(`Found ${apiResponse.results} standings in ${league.name} for fallback season ${season}.`);
      } else {
         console.log(`Still found 0 standings in ${league.name} for fallback season ${previousSeason}.`);
      }
    }

    if (apiResponse && apiResponse.response && apiResponse.results > 0) {
      console.log(`Found standings data for ${league.name} (Season: ${season})`);
      
      // Store the complete raw response
      const standingData = {
        league_id: league.id,
        season: season,
        raw_data: apiResponse,
        last_updated: new Date().toISOString(),
      };

      // Upsert the raw standings data
      const { error: upsertError } = await supabase
        .from('fotball_standings')
        .upsert(standingData)
        .select();

      if (upsertError) {
        console.error(`Failed to upsert standings for ${league.name}:`, upsertError.message);
        failCount++;
      } else {
        console.log(`Successfully upserted standings for ${league.name}`);
        successCount++;
      }
    } else if (apiResponse && apiResponse.results === 0) {
       // Logged above during fallback check
    } else {
      console.warn(`Could not fetch standings for ${league.name} (League ID: ${league.id}, Season: ${season}) or response was invalid.`);
    }
  }

  console.log(`Finished processing league standings. Total successful upserts: ${successCount}, Total failures: ${failCount}`);
  return { successCount, failCount };
}

// Function to process ALL leagues in batches automatically
async function processAllLeaguesInBatches(supabase: SupabaseClient, batchSize: number = 50): Promise<{ successCount: number; failCount: number }> {
  let totalSuccessCount = 0;
  let totalFailCount = 0;
  
  // Get total number of leagues
  const allLeagues = await fetchAllLeagues(supabase);
  const totalLeagues = allLeagues.length;
  const totalBatches = Math.ceil(totalLeagues / batchSize);
  
  console.log(`Processing ALL ${totalLeagues} leagues in ${totalBatches} batches of ${batchSize}...`);
  
  // Process each batch sequentially
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const batchStart = batchIndex * batchSize;
    console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (leagues ${batchStart}-${batchStart + batchSize - 1})`);
    
    const { successCount, failCount } = await processLeaguesAndUpsertStandings(supabase, batchStart, batchSize);
    
    totalSuccessCount += successCount;
    totalFailCount += failCount;
    
    console.log(`Batch ${batchIndex + 1}/${totalBatches} complete: ${successCount} success, ${failCount} failed`);
  }
  
  console.log(`ALL BATCHES COMPLETE! Total: ${totalSuccessCount} success, ${totalFailCount} failed`);
  return { successCount: totalSuccessCount, failCount: totalFailCount };
}

// --- Main Request Handler ---

Deno.serve(async (req) => {
  try {
    // This will be set below in the batch processing section

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

        // Get batch parameters
    let batchStart = 0;
    let batchSize = 30; // Smaller batches for faster processing
    let triggerNext = false;
    
    try {
      const body = await req.json();
      if (body.batchStart !== undefined) batchStart = body.batchStart;
      if (body.batchSize !== undefined) batchSize = body.batchSize;
      if (body.triggerNext !== undefined) triggerNext = body.triggerNext;
    } catch {
      // No body, this is the first call - start the chain
      triggerNext = true;
    }

    console.log(`Processing batch starting at ${batchStart} (${batchSize} leagues)`);
    
    // Process current batch
    const { successCount, failCount } = await processLeaguesAndUpsertStandings(supabase, batchStart, batchSize);
    
    // Check if we need to trigger the next batch
    if (triggerNext) {
      // Get total leagues to know when to stop
      const allLeagues = await fetchAllLeagues(supabase);
      const nextBatchStart = batchStart + batchSize;
      
      if (nextBatchStart < allLeagues.length) {
        // Trigger next batch
        const nextBatchBody = {
          batchStart: nextBatchStart,
          batchSize: batchSize,
          triggerNext: true
        };
        
        console.log(`Triggering next batch: ${nextBatchStart}-${nextBatchStart + batchSize}`);
        
        // Trigger the next batch (fire and forget)
        fetch(`${supabaseUrl}/functions/v1/fetch-football-standings`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(nextBatchBody)
        }).catch(err => console.error('Failed to trigger next batch:', err));
        
        return new Response(JSON.stringify({ 
          message: `Batch ${batchStart}-${batchStart + batchSize} complete. Triggered next batch.`,
          successCount,
          failCount,
          batchStart,
          nextBatchStart: nextBatchStart < allLeagues.length ? nextBatchStart : null,
          totalLeagues: allLeagues.length
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      } else {
        return new Response(JSON.stringify({ 
          message: `FINAL BATCH COMPLETE! All ${allLeagues.length} leagues processed.`,
          successCount,
          failCount,
          batchStart,
          totalLeagues: allLeagues.length,
          completed: true
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    } else {
      return new Response(JSON.stringify({ 
        message: `Single batch complete.`,
        successCount,
        failCount,
        batchStart
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

  } catch (error: any) {
    console.error('Critical error in Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

/*
Usage Instructions:

1. **Create the Table:**
   Run the SQL in `standings-table.sql` in your Supabase SQL Editor or via migrations.

2. **Ensure Leagues Table:**
   Make sure you have a `leagues` table with league data populated.

3. **Deploy the Function:**
   ```bash
   supabase functions deploy fetch-football-standings
   ```

4. **Test the Function:**
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/fetch-football-standings \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```

5. **Schedule Regular Updates:**
   Set up a cron job or use Supabase's scheduled functions to run this regularly.

Important Notes:
- The function dynamically fetches all leagues from your `leagues` table
- Supports pagination for 1000+ leagues
- Optional filtering by league type, country, or limiting count
- Rate limiting is implemented to respect RapidAPI limits
- Season fallback logic tries previous season if current season has no data
- All data is stored with proper indexing for efficient querying
- RLS is enabled with public read access and service role full access

Customization Options:
- Filter by league types: types: ['League', 'Cup']
- Filter by countries: countries: ['England', 'Spain', 'Germany']
- Limit processing: limit: 100
- Modify these in the fetchAllLeagues() call in processLeaguesAndUpsertStandings()
*/ 