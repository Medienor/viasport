import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- Interfaces (Optional but good practice) ---
interface PlayerInfo {
  id: number;
  name: string;
  firstname: string;
  lastname: string;
  age: number | null;
  birth: {
    date: string | null;
    place: string | null;
    country: string | null;
  };
  nationality: string | null;
  height: string | null;
  weight: string | null;
  injured: boolean | null;
  photo: string | null;
}

interface StatisticInfo {
  team: {
    id: number;
    name: string;
    logo: string | null;
  };
  league: {
    id: number | null;
    name: string | null;
    country: string | null;
    logo: string | null;
    flag: string | null;
    season: number | null;
  };
  games: {
    appearences: number | null; // Note: Typo in API is 'appearences'
    lineups: number | null;
    minutes: number | null;
    number: number | null;
    position: string | null;
    rating: string | null; // Often a string like "7.1"
    captain: boolean | null;
  };
  substitutes: {
    in: number | null;
    out: number | null;
    bench: number | null;
  };
  shots: {
    total: number | null;
    on: number | null;
  };
  goals: {
    total: number | null;
    conceded: number | null; // Typically for goalkeepers
    assists: number | null;
    saves: number | null; // Typically for goalkeepers
  };
  passes: {
    total: number | null;
    key: number | null;
    accuracy: number | null; // Percentage as a number
  };
  tackles: {
    total: number | null;
    blocks: number | null;
    interceptions: number | null;
  };
  duels: {
    total: number | null;
    won: number | null;
  };
  dribbles: {
    attempts: number | null;
    success: number | null;
    past: number | null;
  };
  fouls: {
    drawn: number | null;
    committed: number | null;
  };
  cards: {
    yellow: number | null;
    yellowred: number | null;
    red: number | null;
  };
  penalty: {
    won: number | null;
    commited: number | null; // Note: Typo in API is 'commited'
    scored: number | null;
    missed: number | null;
    saved: number | null; // Typically for goalkeepers
  };
}

interface PlayerApiResponse {
  player: PlayerInfo;
  statistics: StatisticInfo[];
}

// --- Configuration ---
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY')

const API_CALL_DELAY_MS = 120; // Delay between API calls

// --- Utility Functions ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Define CORS Headers Locally ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow requests from any origin
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', // Include methods used
};

// --- Reusable Core Logic ---

// Function to fetch player stats for a single team/season (handles pagination)
async function fetchPlayerStatsForTeam(teamId: number, season: number, apiKey: string): Promise<PlayerApiResponse[]> {
    let allPlayersData: PlayerApiResponse[] = [];
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
                console.error(`   API Error for team ${teamId}, season ${season}, page ${currentPage}: ${response.status} ${response.statusText}`);
                // Consider logging the response body for more details if possible
                // const errorBody = await response.text();
                // console.error(`   Error Body: ${errorBody}`);
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
                await delay(API_CALL_DELAY_MS);
            }

        } catch (error) {
            console.error(`   Network or parsing error fetching stats for team ${teamId}, season ${season}, page ${currentPage}:`, error);
            break; // Exit loop for this team/season on network error
        }
    } while (currentPage <= totalPages); // Continue while there are more pages

    console.log(`   Finished fetching for Team ${teamId}, Season ${season}. Total players found: ${allPlayersData.length}`);
    return allPlayersData;
}

// Function to store player stats in Supabase
async function storePlayerStats(supabase: SupabaseClient, teamIdInput: number, seasonInput: number, playersData: PlayerApiResponse[]) {
    if (!playersData || playersData.length === 0) {
        console.log(`No player data provided for Team ${teamIdInput}, Season ${seasonInput}. Skipping storage.`);
        return;
    }

    console.log(`Preparing to store/update ${playersData.length} player stats records for Team ${teamIdInput}, Season ${seasonInput}...`);

    const recordsToUpsert = [];

    for (const item of playersData) {
        const player = item.player;
        // IMPORTANT: The API returns an array of statistics, usually just one per player per team/season.
        // We need to handle the case where it might be empty or have multiple (though unlikely for this endpoint).
        // We'll process the *first* statistic entry if it exists and matches the requested season.
        const stats = item.statistics.find(s => s.league.season === seasonInput && s.team.id === teamIdInput);

        if (!player || !stats) {
            // console.warn(`Skipping player ID ${player?.id} due to missing player or relevant statistic info for season ${seasonInput}.`);
            continue; // Skip if essential data is missing or doesn't match
        }

        // Safely convert rating string to float, handle null or invalid formats
        let ratingFloat: number | null = null;
        if (stats.games.rating) {
            const parsedRating = parseFloat(stats.games.rating);
            if (!isNaN(parsedRating)) {
                ratingFloat = parsedRating;
            }
        }

        // Safely convert pass accuracy string/number to float
        let passAccuracyFloat: number | null = null;
        if (stats.passes.accuracy !== null) {
             // Check if it's already a number or needs parsing (API might return string "85%")
             if (typeof stats.passes.accuracy === 'number') {
                 passAccuracyFloat = stats.passes.accuracy;
             } else if (typeof stats.passes.accuracy === 'string') {
                 const parsedAcc = parseFloat(stats.passes.accuracy.replace('%', ''));
                 if (!isNaN(parsedAcc)) {
                     passAccuracyFloat = parsedAcc;
                 }
             }
        }


        const record = {
            // Composite Key Fields
            player_id: player.id,
            team_id: stats.team.id, // Use team ID from the statistics block
            league_id: stats.league.id,
            season: stats.league.season,

            // Player Information (denormalized for easier access)
            player_name: player.name,
            player_firstname: player.firstname,
            player_lastname: player.lastname,
            player_age: player.age,
            player_birth_date: player.birth?.date,
            player_birth_place: player.birth?.place,
            player_birth_country: player.birth?.country,
            player_nationality: player.nationality,
            player_height: player.height,
            player_weight: player.weight,
            player_injured: player.injured,
            player_photo: player.photo,

            // Statistics - Games
            games_appearences: stats.games.appearences,
            games_lineups: stats.games.lineups,
            games_minutes: stats.games.minutes,
            games_number: stats.games.number,
            games_position: stats.games.position,
            games_rating: ratingFloat, // Store as float
            games_captain: stats.games.captain,

            // Statistics - Substitutes
            substitutes_in: stats.substitutes.in,
            substitutes_out: stats.substitutes.out,
            substitutes_bench: stats.substitutes.bench,

            // Statistics - Shots
            shots_total: stats.shots.total,
            shots_on: stats.shots.on,

            // Statistics - Goals
            goals_total: stats.goals.total,
            goals_conceded: stats.goals.conceded,
            goals_assists: stats.goals.assists,
            goals_saves: stats.goals.saves,

            // Statistics - Passes
            passes_total: stats.passes.total,
            passes_key: stats.passes.key,
            passes_accuracy: passAccuracyFloat, // Store as float

            // Statistics - Tackles
            tackles_total: stats.tackles.total,
            tackles_blocks: stats.tackles.blocks,
            tackles_interceptions: stats.tackles.interceptions,

            // Statistics - Duels
            duels_total: stats.duels.total,
            duels_won: stats.duels.won,

            // Statistics - Dribbles
            dribbles_attempts: stats.dribbles.attempts,
            dribbles_success: stats.dribbles.success,
            dribbles_past: stats.dribbles.past,

            // Statistics - Fouls
            fouls_drawn: stats.fouls.drawn,
            fouls_committed: stats.fouls.committed,

            // Statistics - Cards
            cards_yellow: stats.cards.yellow,
            cards_yellowred: stats.cards.yellowred,
            cards_red: stats.cards.red,

            // Statistics - Penalty
            penalty_won: stats.penalty.won,
            penalty_commited: stats.penalty.commited,
            penalty_scored: stats.penalty.scored,
            penalty_missed: stats.penalty.missed,
            penalty_saved: stats.penalty.saved,

            // Metadata
            last_updated_api: new Date().toISOString(), // Timestamp of when the API data was fetched/processed
        };
        recordsToUpsert.push(record);
    }

    if (recordsToUpsert.length > 0) {
        console.log(`Upserting ${recordsToUpsert.length} records into player_statistics...`);
        const { error: upsertError } = await supabase
            .from('player_statistics')
            .upsert(recordsToUpsert, {
                // Use the composite primary key columns for conflict resolution
                onConflict: 'player_id, team_id, league_id, season',
                // ignoreDuplicates: false // Default is false, ensures updates happen
            });

        if (upsertError) {
            console.error(`Error upserting player statistics for Team ${teamIdInput}, Season ${seasonInput}:`, upsertError);
            // Depending on the error, you might want to throw it or just log it
            // throw new Error(`Supabase upsert failed: ${upsertError.message}`);
        } else {
            console.log(`Successfully upserted ${recordsToUpsert.length} records for Team ${teamIdInput}, Season ${seasonInput}.`);
        }
    } else {
        console.log(`No valid records to upsert for Team ${teamIdInput}, Season ${seasonInput} after processing.`);
    }
}


// --- Main Function Handler (for Daily Update) ---
serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    console.log("Starting daily player stats update...");

    try {
        // Ensure environment variables are loaded
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RAPIDAPI_KEY) {
            console.error('FATAL: Missing required environment variables.');
            throw new Error('Missing required environment variables.');
        }

        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 1. Determine the date range for relevant fixtures
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const formatDate = (date: Date): string => {
            // Format date as YYYY-MM-DD for Supabase query
            return date.toISOString().split('T')[0];
        };

        const startDate = formatDate(yesterday); // Check from yesterday...
        const endDate = formatDate(today);     // ...to today (inclusive)

        console.log(`Checking for fixtures between ${startDate} and ${endDate}...`);

        // 2. Query fixtures within the date range
        // Select only necessary fields to minimize data transfer
        const { data: recentFixtures, error: fixtureError } = await supabaseAdmin
            .from('fixtures')
            .select('home_team_id, away_team_id, season_year, fixture_date')
            .gte('fixture_date', startDate)
            .lte('fixture_date', endDate)
            // Optional: Filter by status if you only want stats after a match is finished
            // .in('status_short', ['FT', 'AET', 'PEN'])

        if (fixtureError) {
            console.error('Error fetching recent fixtures:', fixtureError);
            throw new Error(`Failed to fetch fixtures: ${fixtureError.message}`);
        }

        if (!recentFixtures || recentFixtures.length === 0) {
            console.log("No recent fixtures found for the specified date range. Nothing to update.");
            return new Response(JSON.stringify({ message: "No recent fixtures found." }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        console.log(`Found ${recentFixtures.length} fixtures. Identifying unique teams and seasons...`);

        // 3. Identify unique team/season pairs to update using a Map to avoid duplicates
        const teamsToUpdate = new Map<string, { teamId: number; season: number }>();
        recentFixtures.forEach((fixture: any) => {
            const season = fixture.season_year;
            // Ensure season is a valid number before proceeding
            if (typeof season !== 'number') {
                // console.warn(`Fixture found with invalid season_year: ${season}. Skipping team/season entry.`);
                return;
            }

            const addTeam = (teamId: number | null) => {
                // Ensure teamId is a valid number
                if (teamId !== null && typeof teamId === 'number') {
                    const key = `${teamId}-${season}`; // Create a unique key: "teamId-season"
                    if (!teamsToUpdate.has(key)) {
                        teamsToUpdate.set(key, { teamId, season });
                    }
                } else {
                    // console.warn(`Fixture found with invalid home/away team_id. Skipping team entry.`);
                }
            };

            addTeam(fixture.home_team_id);
            addTeam(fixture.away_team_id);
        });

        const updateTasks = Array.from(teamsToUpdate.values()); // Convert Map values to an array of tasks
        console.log(`Identified ${updateTasks.length} unique team/season pairs to update.`);

        if (updateTasks.length === 0) {
             console.log("No valid team/season pairs identified from fixtures. Nothing to update.");
             return new Response(JSON.stringify({ message: "No valid team/season pairs identified." }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
             });
        }

        // 4. Process updates for each identified team/season
        let processedCount = 0;
        let successCount = 0;
        let errorCount = 0;
        for (const task of updateTasks) {
            processedCount++;
            const { teamId, season } = task;
            console.log(`(${processedCount}/${updateTasks.length}) Processing Team ID: ${teamId}, Season: ${season}`);

            try {
                // Fetch potentially updated player stats (handles pagination internally)
                const playersData = await fetchPlayerStatsForTeam(teamId, season, RAPIDAPI_KEY);

                if (playersData && playersData.length > 0) {
                    // Store the fetched data (handles upsert internally)
                    await storePlayerStats(supabaseAdmin, teamId, season, playersData);
                    successCount++;
                } else {
                    // This is not necessarily an error, just means no players found/returned by API
                    console.log(`No player data returned or stored for Team ${teamId}, Season ${season}.`);
                    // You might count this differently if needed
                }
            } catch (teamError) {
                console.error(`Error processing team ${teamId}, season ${season}:`, teamError);
                errorCount++;
                // Continue with the next team even if one fails
            }

            // No delay needed between different teams here unless you hit rate limits
            // The primary delay is within fetchPlayerStatsForTeam for pagination
        }

        console.log(`Daily player stats update completed. Processed: ${processedCount}, Succeeded: ${successCount}, Failed: ${errorCount}.`);
        return new Response(JSON.stringify({
             message: `Daily update complete. Processed ${processedCount} team/season pairs. Succeeded: ${successCount}, Failed: ${errorCount}.`
            }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200, // Return 200 even if some teams failed, check logs for details
        });

    } catch (error) {
        console.error("FATAL Error during daily player stats update:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500, // Indicate a server-level error occurred
        });
    }
})