import { createClient } from 'npm:@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// --- Interfaces based on API Response ---

interface ApiPlayerInfo {
  id: number
  name: string
  firstname: string
  lastname: string
  age: number | null
  birth: {
    date: string | null
    place: string | null
    country: string | null
  }
  nationality: string | null
  height: string | null
  weight: string | null
  injured: boolean | null
  photo: string | null
}

interface ApiLeagueInfo {
  id: number | null // League ID can be null (e.g., Club Friendlies)
  name: string | null
  country: string | null
  logo: string | null
  flag: string | null
  season: number | null
}

interface ApiTeamInfo {
  id: number
  name: string
  logo: string
}

interface ApiGameStats {
  appearences: number | null
  lineups: number | null
  minutes: number | null
  number: number | null // Jersey number? Usually null in this response
  position: string | null // e.g., "Goalkeeper", "Defender"
  rating: string | null // Often a string representation of a float, or null
  captain: boolean | null
}

interface ApiSubstituteStats {
  in: number | null
  out: number | null
  bench: number | null
}

interface ApiShotStats {
  total: number | null
  on: number | null
}

interface ApiGoalStats {
  total: number | null
  conceded: number | null // Use 0 if null for aggregation
  assists: number | null
  saves: number | null // Use 0 if null for aggregation
}

interface ApiPassStats {
  total: number | null
  key: number | null
  accuracy: number | null // Percentage, can be null
}

interface ApiTackleStats {
  total: number | null
  blocks: number | null
  interceptions: number | null
}

interface ApiDuelStats {
  total: number | null
  won: number | null
}

interface ApiDribbleStats {
  attempts: number | null
  success: number | null
  past: number | null // Usually null in this response
}

interface ApiFoulStats {
  drawn: number | null
  committed: number | null
}

interface ApiCardStats {
  yellow: number | null
  yellowred: number | null
  red: number | null
}

interface ApiPenaltyStats {
  won: number | null
  commited: number | null // Typo in API? 'committed'
  scored: number | null
  missed: number | null
  saved: number | null // Use 0 if null for aggregation
}

// Represents one element within the top-level "statistics" array
interface ApiPlayerStatisticEntry {
  team: ApiTeamInfo
  league: ApiLeagueInfo
  games: ApiGameStats
  substitutes: ApiSubstituteStats
  shots: ApiShotStats
  goals: ApiGoalStats
  passes: ApiPassStats
  tackles: ApiTackleStats
  duels: ApiDuelStats
  dribbles: ApiDribbleStats
  fouls: ApiFoulStats
  cards: ApiCardStats
  penalty: ApiPenaltyStats
}

// Represents one element in the main response array from the API
interface ApiPlayerResponseItem {
  player: ApiPlayerInfo
  statistics: ApiPlayerStatisticEntry[] // Array of stats per league
}

// Represents the overall structure of the API response
type ApiResponse = ApiPlayerResponseItem[]

// --- Configuration ---

const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY')
const API_HOST = 'api-football-v1.p.rapidapi.com'
const API_BASE_URL = `https://${API_HOST}/v3`
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const FIXTURES_PAGE_SIZE = 100 // How many fixtures to fetch per Supabase query
const API_CALL_DELAY_MS = 120 // Delay between RapidAPI calls (Adjusted for ~500 calls/min)

// --- Utility Functions ---

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Helper to safely get a number or return 0 if null/undefined
const num = (val: number | null | undefined): number => val ?? 0

// --- Core Logic ---

// MODIFIED: Return an array of objects instead of a Map
async function getAllTeamSeasonPairs(supabase: any): Promise<{ teamId: number; season: number }[]> {
  console.log(`Fetching ALL unique team IDs and their relevant seasons from fixtures...`)
  const teamSeasonMap = new Map<number, Set<number>>()
  let offset = 0
  let hasMore = true
  const BATCH_SIZE = 1000; // How many fixtures to fetch per Supabase query

  // No date filter here - we want all for the initial load
  while (hasMore) {
    const { data: fixtures, error } = await supabase
      .from('fixtures')
      .select('home_team_id, away_team_id, season_year') // No fixture_date needed here
      .range(offset, offset + BATCH_SIZE - 1)

    if (error) {
      console.error('Error fetching fixtures:', error)
      throw new Error(`Failed to fetch fixtures: ${error.message}`)
    }

    if (!fixtures || fixtures.length === 0) {
      hasMore = false
    } else {
      console.log(`Processing ${fixtures.length} fixtures from offset ${offset}...`)
      fixtures.forEach((fixture: any) => {
        // Ensure season_year is a valid number before adding
        const season = typeof fixture.season_year === 'number' ? fixture.season_year : null;

        if (season === null) {
            // console.warn(`Fixture found with null or invalid season_year. Skipping team/season entry for this fixture part.`);
            return; // Skip if season is not valid
        }

        // Add home team and season
        if (fixture.home_team_id) {
            if (!teamSeasonMap.has(fixture.home_team_id)) {
                teamSeasonMap.set(fixture.home_team_id, new Set<number>())
            }
            teamSeasonMap.get(fixture.home_team_id)!.add(season)
        }

        // Add away team and season
        if (fixture.away_team_id) {
            if (!teamSeasonMap.has(fixture.away_team_id)) {
                teamSeasonMap.set(fixture.away_team_id, new Set<number>())
            }
            teamSeasonMap.get(fixture.away_team_id)!.add(season)
        }
      })
      offset += fixtures.length
      if (fixtures.length < BATCH_SIZE) {
          hasMore = false;
      }
       // Add a small delay to avoid overwhelming the database if there are many pages
       await delay(50); // Reduced delay slightly
    }
  }

  // *** CONVERT THE MAP TO AN ARRAY OF TASKS ***
  const taskList: { teamId: number; season: number }[] = [];
  teamSeasonMap.forEach((seasons, teamId) => {
    seasons.forEach(season => {
      taskList.push({ teamId, season });
    });
  });

  console.log(`Found ${taskList.length} unique team-season combinations from all fixtures.`);
  return taskList; // *** RETURN THE ARRAY ***
}

// *** MODIFIED function to handle pagination ***
async function fetchPlayerStatsForTeam(teamId: number, season: number, apiKey: string): Promise<any[]> {
  let allPlayersData: any[] = [];
  let currentPage = 1;
  let totalPages = 1; // Assume 1 page initially

  console.log(`   Fetching page ${currentPage} for Team ${teamId}, Season ${season}...`);

  do {
    const url = `https://api-football-v1.p.rapidapi.com/v3/players?team=${teamId}&season=${season}&page=${currentPage}`;
    const options = {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com',
      },
    };

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        // Log API errors but try to continue if possible (maybe just one page failed)
        console.error(`   API Error for team ${teamId}, season ${season}, page ${currentPage}: ${response.status} ${response.statusText}`);
        // Optionally: break the loop if a specific error occurs (e.g., 404 on page 1)
        // For now, we'll just log and potentially miss data from this page onwards for this team/season
        break; // Exit the loop for this team/season if a page fetch fails
      }

      const data = await response.json();

      // Check if response structure is valid and contains player data
      if (data && data.response && Array.isArray(data.response)) {
         allPlayersData = allPlayersData.concat(data.response); // Add players from current page
         console.log(`   -> Fetched ${data.response.length} players from page ${currentPage}.`);
      } else {
          console.warn(`   Unexpected API response structure or empty response for team ${teamId}, season ${season}, page ${currentPage}.`);
          // If page 1 has no data.response, stop trying further pages
          if (currentPage === 1) {
              break;
          }
      }


      // Update total pages ONLY on the first successful request
      if (currentPage === 1 && data.paging && data.paging.total) {
        totalPages = data.paging.total;
        console.log(`   Total pages for Team ${teamId}, Season ${season}: ${totalPages}`);
      }

      currentPage++; // Move to the next page

      // Add a delay between paginated calls for the *same* team/season
      if (currentPage <= totalPages) {
          console.log(`   Waiting ${API_CALL_DELAY_MS}ms before fetching next page...`);
          await delay(API_CALL_DELAY_MS); // Use the existing delay
      }

    } catch (error) {
      console.error(`   Network or parsing error fetching stats for team ${teamId}, season ${season}, page ${currentPage}:`, error);
      // Decide if you want to break or continue after a network error
      break; // Exit loop for this team/season on network error
    }
  } while (currentPage <= totalPages); // Continue while there are more pages

  console.log(`   Finished fetching for Team ${teamId}, Season ${season}. Total players found: ${allPlayersData.length}`);
  return allPlayersData;
}

async function storePlayerStats(supabase: any, playersData: ApiResponse, season: number) {
  if (!playersData || playersData.length === 0) {
    console.log('No player data received to store.')
    return
  }

  const recordsToUpsert = []

  for (const item of playersData) {
    const playerInfo = item.player
    const statsEntries = item.statistics

    if (!playerInfo || !playerInfo.id || !statsEntries || statsEntries.length === 0) {
      console.warn('Skipping player due to missing info or stats:', playerInfo?.id)
      continue
    }

    // --- Aggregate Stats ---
    let aggregated = {
      appearences: 0, lineups: 0, minutes: 0, goals_total: 0, goals_assists: 0,
      goals_conceded: 0, goals_saves: 0, passes_total: 0, passes_key: 0,
      passes_accuracy_sum: 0, passes_accuracy_count: 0, // For averaging accuracy
      tackles_total: 0, tackles_blocks: 0, tackles_interceptions: 0,
      duels_total: 0, duels_won: 0, dribbles_attempts: 0, dribbles_success: 0,
      fouls_drawn: 0, fouls_committed: 0, cards_yellow: 0, cards_red: 0,
      penalty_scored: 0, penalty_missed: 0, penalty_saved: 0,
      penalty_committed: 0, penalty_won: 0,
      positionCounts: new Map<string, number>(), // To find primary position
    }

    let primaryTeamId: number | null = null; // Get team ID from stats

    for (const stat of statsEntries) {
        if (!primaryTeamId && stat.team?.id) {
            primaryTeamId = stat.team.id; // Assume all stats entries are for the same queried team
        }
        aggregated.appearences += num(stat.games?.appearences)
        aggregated.lineups += num(stat.games?.lineups)
        aggregated.minutes += num(stat.games?.minutes)
        aggregated.goals_total += num(stat.goals?.total)
        aggregated.goals_assists += num(stat.goals?.assists)
        aggregated.goals_conceded += num(stat.goals?.conceded) // Important for GKs
        aggregated.goals_saves += num(stat.goals?.saves)       // Important for GKs
        aggregated.passes_total += num(stat.passes?.total)
        aggregated.passes_key += num(stat.passes?.key)
        if (stat.passes?.accuracy !== null && stat.passes?.accuracy !== undefined) {
            aggregated.passes_accuracy_sum += stat.passes.accuracy;
            aggregated.passes_accuracy_count++;
        }
        aggregated.tackles_total += num(stat.tackles?.total)
        aggregated.tackles_blocks += num(stat.tackles?.blocks)
        aggregated.tackles_interceptions += num(stat.tackles?.interceptions)
        aggregated.duels_total += num(stat.duels?.total)
        aggregated.duels_won += num(stat.duels?.won)
        aggregated.dribbles_attempts += num(stat.dribbles?.attempts)
        aggregated.dribbles_success += num(stat.dribbles?.success)
        aggregated.fouls_drawn += num(stat.fouls?.drawn)
        aggregated.fouls_committed += num(stat.fouls?.committed)
        aggregated.cards_yellow += num(stat.cards?.yellow)
        // Combine yellowred and red into 'red' for simplicity, or keep separate if needed
        aggregated.cards_red += num(stat.cards?.red) + num(stat.cards?.yellowred)
        aggregated.penalty_scored += num(stat.penalty?.scored)
        aggregated.penalty_missed += num(stat.penalty?.missed)
        aggregated.penalty_saved += num(stat.penalty?.saved)     // Important for GKs
        aggregated.penalty_committed += num(stat.penalty?.commited) // Typo 'commited' in API?
        aggregated.penalty_won += num(stat.penalty?.won)

        // Count position occurrences
        if (stat.games?.position) {
            const count = aggregated.positionCounts.get(stat.games.position) || 0;
            // Weight by minutes played in that position for better accuracy
            aggregated.positionCounts.set(stat.games.position, count + num(stat.games?.minutes));
        }
    }

     if (!primaryTeamId) {
        console.warn(`Could not determine team ID for player ${playerInfo.id}. Skipping.`);
        continue; // Skip if we couldn't get a team ID from the stats entries
    }


    // Determine primary position (most minutes played)
    let primary_position: string | null = null;
    let maxMinutes = 0;
    for (const [pos, minutes] of aggregated.positionCounts.entries()) {
        if (minutes > maxMinutes) {
            maxMinutes = minutes;
            primary_position = pos;
        }
    }
     // Fallback if no position info found
     if (!primary_position && statsEntries[0]?.games?.position) {
        primary_position = statsEntries[0].games.position;
     }


    // Calculate average accuracy if possible
    const avg_passes_accuracy = aggregated.passes_accuracy_count > 0
        ? Math.round(aggregated.passes_accuracy_sum / aggregated.passes_accuracy_count)
        : 0; // Or null if preferred

    // Prepare the record for Supabase upsert
    const record = {
      player_id: playerInfo.id,
      team_id: primaryTeamId, // Use the team ID found in the statistics array
      season: season,
      player_name: playerInfo.name,
      player_firstname: playerInfo.firstname,
      player_lastname: playerInfo.lastname,
      player_age: playerInfo.age,
      player_nationality: playerInfo.nationality,
      player_height: playerInfo.height,
      player_weight: playerInfo.weight,
      player_injured: playerInfo.injured,
      player_photo: playerInfo.photo,

      // Aggregated stats
      primary_position: primary_position,
      appearences: aggregated.appearences,
      lineups: aggregated.lineups,
      minutes: aggregated.minutes,
      goals_total: aggregated.goals_total,
      goals_assists: aggregated.goals_assists,
      goals_conceded: aggregated.goals_conceded,
      goals_saves: aggregated.goals_saves,
      passes_total: aggregated.passes_total,
      passes_key: aggregated.passes_key,
      passes_accuracy: avg_passes_accuracy,
      tackles_total: aggregated.tackles_total,
      tackles_blocks: aggregated.tackles_blocks,
      tackles_interceptions: aggregated.tackles_interceptions,
      duels_total: aggregated.duels_total,
      duels_won: aggregated.duels_won,
      dribbles_attempts: aggregated.dribbles_attempts,
      dribbles_success: aggregated.dribbles_success,
      fouls_drawn: aggregated.fouls_drawn,
      fouls_committed: aggregated.fouls_committed,
      cards_yellow: aggregated.cards_yellow,
      cards_red: aggregated.cards_red,
      penalty_scored: aggregated.penalty_scored,
      penalty_missed: aggregated.penalty_missed,
      penalty_saved: aggregated.penalty_saved,
      penalty_committed: aggregated.penalty_committed,
      penalty_won: aggregated.penalty_won,

      // Raw API data
      api_raw_statistics: statsEntries, // Store the original array
      last_updated: new Date().toISOString(),
    }
    recordsToUpsert.push(record)
  }

  if (recordsToUpsert.length > 0) {
    console.log(`Upserting ${recordsToUpsert.length} player season stat records...`)
    const { error } = await supabase
        .from('player_season_stats')
        .upsert(recordsToUpsert, {
            onConflict: 'player_id, team_id, season', // Specify conflict columns
            // ignoreDuplicates: false, // Default is false, ensures updates happen
        });


    if (error) {
      console.error('Error upserting player stats:', error)
      // Decide if you want to throw the error or just log it
      // throw error;
    } else {
      console.log(`Successfully upserted ${recordsToUpsert.length} records.`)
    }
  } else {
      console.log("No valid records constructed for upserting.");
  }
}

// --- Main Function Handler (FOR BULK LOAD) ---
serve(async (req) => {
  try {
    // Validate environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY')
    if (!RAPIDAPI_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables (RAPIDAPI_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)')
    }

    // --- Batch Processing Logic ---
    let batch = 1;
    let batchSize = 50; // Use 50 as the safer batch size
    try {
      const payload = await req.json();
      if (payload && typeof payload.batch === 'number' && payload.batch > 0) {
        batch = payload.batch;
      }
      // Allow overriding via payload, but 50 is the default
      if (payload && typeof payload.batchSize === 'number' && payload.batchSize > 0) {
        batchSize = payload.batchSize;
      }
      console.log(`Received request for Batch: ${batch}, Size: ${batchSize}`);
    } catch (e) {
      if (e instanceof SyntaxError || (e instanceof TypeError && e.message.includes("missing"))) { // Handle cases where body is empty or not JSON
        console.log("No valid JSON payload received or body empty, using default Batch 1, Size 50.");
      } else {
        console.warn("Error parsing request body:", e.message);
        // Decide if you want to proceed with defaults or throw error
        // For bulk load, proceeding with defaults might be okay if first run
      }
    }
    // --- End Batch Processing Logic ---


    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Get ALL potential tasks (array version)
    const allTasks = await getAllTeamSeasonPairs(supabaseAdmin);
    const totalTasks = allTasks.length;

    if (totalTasks === 0) {
        console.log("No team-season pairs found to process.");
        return new Response(JSON.stringify({ message: 'No tasks found.' }), {
            headers: { 'Content-Type': 'application/json' }, status: 200,
        });
    }

    // 2. Calculate the slice for the current batch
    const startIndex = (batch - 1) * batchSize;
    const endIndex = startIndex + batchSize;
    const tasksForThisRun = allTasks.slice(startIndex, endIndex);
    const batchTaskCount = tasksForThisRun.length;

    console.log(`Processing Batch ${batch}: Tasks ${startIndex + 1} to ${Math.min(endIndex, totalTasks)} (out of ${totalTasks} total). Batch size: ${batchTaskCount}`);

    if (batchTaskCount === 0 && totalTasks > 0) {
         console.log(`Batch ${batch} is beyond the total number of tasks (${totalTasks}). Nothing to process.`);
         return new Response(JSON.stringify({ message: `Batch ${batch} is empty.` }), {
            headers: { 'Content-Type': 'application/json' }, status: 200,
         });
    }

    // 3. Process only the tasks in the current batch slice
    let processedCount = 0;
    for (const task of tasksForThisRun) {
      processedCount++;
      const { teamId, season } = task;
      console.log(`(Task ${processedCount}/${batchTaskCount} in Batch ${batch} | Overall ${startIndex + processedCount}/${totalTasks}) Processing Team ID: ${teamId}, Season: ${season}`);

      // Calls the function that handles pagination (which has its own internal delay)
      const playersData = await fetchPlayerStatsForTeam(teamId, season, RAPIDAPI_KEY!);

      if (playersData && playersData.length > 0) {
        await storePlayerStats(supabaseAdmin, playersData, season);
      } else {
        console.log(`No player data returned or stored for Team ${teamId}, Season ${season}.`);
      }

      // Delay between processing DIFFERENT team/season pairs is included
      if (processedCount < batchTaskCount) {
           console.log(`Waiting ${API_CALL_DELAY_MS}ms before next team/season task...`)
           await delay(API_CALL_DELAY_MS)
      }
    } // End of loop for tasks within the batch

    console.log(`Successfully processed Batch ${batch} (${batchTaskCount} tasks).`);
    return new Response(JSON.stringify({ message: `Batch ${batch} processed successfully! (${batchTaskCount} tasks)` }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error(`Error processing Batch (details above may indicate which batch):`, error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

/*
To schedule this function using pg_cron:

1. Enable pg_cron extension in Supabase (SQL Editor -> Extensions -> search for cron -> Enable).
2. Run the following SQL command in the Supabase SQL Editor:

SELECT cron.schedule(
    'fetch-player-stats-daily', -- Name of the cron job (can be anything)
    '0 3 * * *',                -- Cron schedule (e.g., '0 3 * * *' for 3:00 AM UTC daily)
                                -- Use https://crontab.guru to build your schedule
    $$
    SELECT net.http_post(
        url:='<YOUR_SUPABASE_PROJECT_URL>/functions/v1/fetch-player-stats', -- Replace with your function URL
        headers:='{"Authorization": "Bearer <YOUR_SUPABASE_SERVICE_ROLE_KEY>", "Content-Type": "application/json"}'::jsonb,
        body:='{}'::jsonb -- Add body if your function expects one, otherwise empty JSON object
    ) AS request_id;
    $$
);

-- To unschedule:
-- SELECT cron.unschedule('fetch-player-stats-daily');

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To view run history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC;

Replace <YOUR_SUPABASE_PROJECT_URL> (e.g., https://xyz.supabase.co) and <YOUR_SUPABASE_SERVICE_ROLE_KEY>.
Use the Service Role Key for authorization as the function likely requires elevated privileges to write data.
Adjust the schedule ('0 3 * * *') as needed.
*/