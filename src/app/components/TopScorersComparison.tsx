import Image from 'next/image';
import Link from 'next/link';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import TopScorersDisplay from './TopScorersDisplay'; // <<< Import the new Client Component

// Interface for the top scorer data, including requested stats AND average rating
interface TopScorerData {
  player_id: number;
  player_name: string | null;
  player_photo: string | null; // From player_photo column
  team_logo: string | null;    // Extracted from JSONB
  goals_total: number;
  appearances: number | null; // Changed from appearences
  minutes: number | null;
  assists: number | null;     // Changed from goals_assists
  tackles: number | null;     // Changed from tackles_total
  penalties_scored: number | null; // Changed from penalty_scored
  average_rating?: number | null; // Add optional average rating
}

// Helper function to create URL-friendly slugs for player profiles
function createPlayerSlug(name: string | null, id: number): string {
  const baseName = name || 'ukjent-spiller';
  // Convert to lowercase, replace spaces/special chars with hyphens, remove consecutive hyphens
  const slugPart = baseName
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove invalid characters
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens

  return `/spillerprofil/${slugPart || 'spiller'}-${id}`; // Ensure some base slug exists
}

// Renamed and modified function to get the single top scorer with fallback
async function getTopScorerForTeam(
  supabaseClient: SupabaseClient,
  teamId: number,
  season: number // Fixture's season
): Promise<TopScorerData | null> { // Returns single object or null
  console.log(`DEBUG: [Comp - getTopScorerForTeam] Attempting fetch for Team ID: ${teamId}, Season: ${season}`);

  let topScorerData: any = null; // Use 'any' temporarily for Supabase result flexibility
  let error: any = null;
  let usedSeason = season; // Track which season succeeded

  // --- First Attempt: Use the provided season ---
  try {
    const { data, error: queryError } = await supabaseClient
      .from('player_season_stats')
      .select(`
        player_id,
        player_name,
        player_photo,
        goals_total,
        appearences,
        minutes,
        goals_assists,
        tackles_total,
        penalty_scored,
        api_raw_statistics
      `) // Select specified columns + JSONB for logo
      .eq('team_id', teamId)
      .eq('season', season)
      .gt('goals_total', 0) // Must have scored goals
      .order('goals_total', { ascending: false }) // Highest goals first
      .limit(1); // Only the top one

    if (queryError) throw queryError; // Throw to be caught below
    if (data && data.length > 0) {
      topScorerData = data[0]; // Get the first (top) player
      console.log(`DEBUG: [Comp - getTopScorerForTeam] Found top scorer using primary Season: ${season}`);
    }

  } catch (catchError) {
    console.error(`DEBUG: [Comp - getTopScorerForTeam] Error fetching top scorer (Season ${season}) for Team ID: ${teamId}:`, catchError);
    error = catchError; // Store error for fallback check
  }

  // --- Fallback Check: If no scorer found or error occurred, try previous season ---
  if (!topScorerData) {
    const previousSeason = season - 1;
    usedSeason = previousSeason; // Update tracked season
    console.log(`DEBUG: [Comp - getTopScorerForTeam] No scorer found for Season ${season} or initial query failed. Trying fallback Season: ${previousSeason} for Team ID: ${teamId}`);

    try {
      const { data: fallbackData, error: fallbackError } = await supabaseClient
        .from('player_season_stats')
        .select(`
          player_id,
          player_name,
          player_photo,
          goals_total,
          appearences,
          minutes,
          goals_assists,
          tackles_total,
          penalty_scored,
          api_raw_statistics
        `) // Select same columns
        .eq('team_id', teamId)
        .eq('season', previousSeason) // Use previous season
        .gt('goals_total', 0)
        .order('goals_total', { ascending: false })
        .limit(1);

      if (fallbackError) throw fallbackError; // Throw to be caught below

      if (fallbackData && fallbackData.length > 0) {
        topScorerData = fallbackData[0]; // Get the top scorer from fallback
        console.log(`DEBUG: [Comp - getTopScorerForTeam] Found top scorer using fallback Season: ${previousSeason}`);
      } else {
        console.log(`DEBUG: [Comp - getTopScorerForTeam] No scorer found in fallback Season: ${previousSeason} either.`);
      }
    } catch (catchFallbackError) {
      console.error(`DEBUG: [Comp - getTopScorerForTeam] Error fetching top scorer (Fallback Season ${previousSeason}) for Team ID: ${teamId}:`, catchFallbackError);
      // If fallback also fails, topScorerData remains null/undefined
    }
  }

  // --- Process the found top scorer (if any) ---
  if (!topScorerData) {
    console.log(`DEBUG: [Comp - getTopScorerForTeam] No top scorer found for Team ID: ${teamId} in relevant seasons.`);
    return null; // Return null if no scorer found
  }

  // Extract team logo from JSONB
  let teamLogo: string | null = null;
  if (topScorerData.api_raw_statistics && Array.isArray(topScorerData.api_raw_statistics) && topScorerData.api_raw_statistics.length > 0) {
    const rawInfo = topScorerData.api_raw_statistics[0];
    teamLogo = rawInfo?.team?.logo ?? null; // Safely access logo
  }

  // --- Calculate Average Rating ---
  let totalRatingSum = 0;
  let validRatingCount = 0;
  let averageRating: number | null = null;

  if (topScorerData.api_raw_statistics && Array.isArray(topScorerData.api_raw_statistics)) {
    topScorerData.api_raw_statistics.forEach((statEntry: any) => {
      const ratingStr = statEntry?.games?.rating;
      if (ratingStr !== null && ratingStr !== undefined) {
        const ratingNum = parseFloat(ratingStr);
        if (!isNaN(ratingNum)) {
          totalRatingSum += ratingNum;
          validRatingCount++;
        }
      }
    });

    if (validRatingCount > 0) {
      averageRating = totalRatingSum / validRatingCount;
      console.log(`DEBUG: [Comp - getTopScorerForTeam] Calculated average rating for ${topScorerData.player_name}: ${averageRating.toFixed(1)} from ${validRatingCount} entries.`);
    } else {
       console.log(`DEBUG: [Comp - getTopScorerForTeam] No valid ratings found for ${topScorerData.player_name} in api_raw_statistics.`);
    }
  }
  // --- End Calculate Average Rating ---

  // Map to the final interface structure
  const processedScorer: TopScorerData = {
    player_id: topScorerData.player_id,
    player_name: topScorerData.player_name,
    player_photo: topScorerData.player_photo, // Use direct column value
    team_logo: teamLogo, // Use extracted logo
    goals_total: topScorerData.goals_total ?? 0,
    appearances: topScorerData.appearences, // Correct column name from DB
    minutes: topScorerData.minutes,
    assists: topScorerData.goals_assists, // Correct column name from DB
    tackles: topScorerData.tackles_total, // Correct column name from DB
    penalties_scored: topScorerData.penalty_scored, // Correct column name from DB
    average_rating: averageRating, // Assign calculated average rating
  };

  console.log(`DEBUG: [Comp - getTopScorerForTeam] Returning top scorer (data from Season ${usedSeason}) for Team ID: ${teamId}:`, processedScorer.player_name);
  return processedScorer;
}


// Props interface for the Server Component itself
interface TopScorersComparisonProps {
  homeTeamId: number;
  awayTeamId: number;
  season: number;
  leagueName?: string;
  leagueId?: number;
  initialFixtureStatusShort: string | null | undefined;
  isFinished: boolean;
  matchId: number;
}

// Server Component definition
export default async function TopScorersComparison({
  homeTeamId,
  awayTeamId,
  season,
  leagueName,
  leagueId,
  initialFixtureStatusShort,
  isFinished,
  matchId
}: TopScorersComparisonProps) {

  console.log("DEBUG: [TopScorersComparison Server] Received props:", { leagueId, initialFixtureStatusShort, matchId }); // Log matchId

  // --- Initialize Supabase Client (User specified method) ---
  const supabase = createClient(
    'https://cdynfbwdwdfsiwkgixua.supabase.co', // Hardcoded URL
    process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkeW5mYndkd2Rmc2l3a2dpeHVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjU3ODQwMSwiZXhwIjoyMDU4MTU0NDAxfQ.5V7CbSCE4lb3FbJUa3kgipRPWXG4LeVRCf7eeLSrSoI', // Service Key with fallback
    {
      global: {
        fetch: fetch as any // Ensure fetch is available globally
      }
    }
  );
  // --- End Supabase Client Initialization ---


  // --- Fetch top scorers ---
  let homeTopScorer: TopScorerData | null = null;
  let awayTopScorer: TopScorerData | null = null;

  try {
    console.log(`DEBUG: [TopScorersComparison Server] Fetching top scorers via Promise.all...`);
    // Pass the created supabase client to the fetching function
    [homeTopScorer, awayTopScorer] = await Promise.all([
      getTopScorerForTeam(supabase, homeTeamId, season),
      getTopScorerForTeam(supabase, awayTeamId, season)
    ]);
    console.log(`DEBUG: [TopScorersComparison Server] Fetched scorers: Home: ${homeTopScorer?.player_name ?? 'None'}, Away: ${awayTopScorer?.player_name ?? 'None'}`);
  } catch (error) {
      console.error("🔴 Error fetching top scorers in Promise.all:", error);
      // Optionally return an error display component here too
  }
  // --- End Fetching ---


  // --- Render the Client Component, passing data down ---
  // Render null if no scorers found for either team (optional, could let Display handle it)
   if (!homeTopScorer && !awayTopScorer) {
      console.log(`DEBUG: [TopScorersComparison Server] No top scorers found for either team. Rendering null.`);
      return null;
   }

  // Pass all necessary data and config as props to the client component
  return (
    <TopScorersDisplay
      homeTopScorer={homeTopScorer}
      awayTopScorer={awayTopScorer}
      leagueName={leagueName}
      leagueId={leagueId}
      season={season}
      initialFixtureStatusShort={initialFixtureStatusShort}
      isFinished={isFinished}
      matchId={matchId}
      homeTeamId={homeTeamId}
      awayTeamId={awayTeamId}
    />
  );
  // --- NO MORE UI RENDERING LOGIC HERE ---
}