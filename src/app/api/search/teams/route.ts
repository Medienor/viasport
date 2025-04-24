import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
// Ensure environment variables are set!
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Add these constants at the top of the file
const CDN_BASE_URL = {
  TEAMS: 'https://viasport.b-cdn.net/football/teams',
  PLAYERS: 'https://viasport.b-cdn.net/football/players',
  LEAGUES: 'https://viasport.b-cdn.net/football/leagues'
};

// Define a type for the player data we expect (optional but good practice)
interface PlayerSearchResult {
  player_id: number;
  player_name: string | null;
  player_photo: string | null;
  teamName: string | null; // Add teamName
}

// Helper function to find team with most appearances from stats array
function getPrimaryTeamFromStats(stats: any): string | null {
  if (!Array.isArray(stats) || stats.length === 0) {
    return null;
  }

  let primaryTeamName: string | null = null;
  let maxAppearances = -1; // Initialize with -1 to handle 0 appearances correctly

  for (const statEntry of stats) {
    const appearances = statEntry?.games?.appearences ?? 0; // Default to 0 if null/undefined
    const teamName = statEntry?.team?.name;

    if (appearances >= maxAppearances && teamName) {
      // Prioritize higher appearances, or keep the first one found if appearances are equal
      if (appearances > maxAppearances) {
          maxAppearances = appearances;
          primaryTeamName = teamName;
      } else if (maxAppearances === -1) { // Handle case where first entry has 0 appearances
          maxAppearances = appearances; // Should be 0
          primaryTeamName = teamName;
      }
    }
  }

  // Fallback if no valid team/appearances found (e.g., all appearances are null)
  if (!primaryTeamName && stats[0]?.team?.name) {
      primaryTeamName = stats[0].team.name;
  }


  return primaryTeamName;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const normalizedQuery = query?.toLowerCase() ?? ''; // Normalize query for local search
  console.log(`[Search API] Received query: "${query}"`); // Log query

  if (!normalizedQuery || normalizedQuery.length < 2) {
    console.log('[Search API] Query too short, returning empty results.'); // Log short query case
    // Return all types empty
    return NextResponse.json({ teams: [], leagues: [], players: [], matches: [] });
  }

  try {
    // --- Local File Search (Teams/Leagues) ---
    // Consider removing this if all data is in Supabase eventually
    const dataDir = path.join(process.cwd(), 'data', 'teams');
    const files = await fs.readdir(dataDir);

    const matchingTeamsLocal: any[] = []; // Use specific type if available
    const uniqueLeaguesLocal = new Map();

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await fs.readFile(path.join(dataDir, file), 'utf-8');
          const data = JSON.parse(content);

          // Check for matching team name (local)
          if (data.team?.team?.name?.toLowerCase().includes(normalizedQuery)) {
            // Basic structure expected by frontend
             matchingTeamsLocal.push({
                id: data.team.team.id, // Assuming ID exists here
                name: data.team.team.name,
                type: 'team',
                logo: data.team.team.logo || '/placeholder-team.png',
                // country: data.team.country?.name // Add country if available/needed
             });
          }

          // Check for matching leagues (local) - This might be redundant if searching Supabase leagues
          data.leagues?.forEach((leagueData: any) => {
            if (leagueData.league?.name?.toLowerCase().includes(normalizedQuery)) {
              if (!uniqueLeaguesLocal.has(leagueData.league.id)) {
                 uniqueLeaguesLocal.set(leagueData.league.id, {
                    id: leagueData.league.id,
                    name: leagueData.league.name,
                    type: 'league',
                    logo: leagueData.league.logo || '/placeholder-league.png',
                    country: leagueData.country?.name || 'Unknown'
                 });
              }
            }
          });
        } catch (parseError) {
            console.error(`[Search API] Error parsing local file ${file}:`, parseError);
            // Continue to next file
        }
      }
    }
    const matchingLeaguesLocal = Array.from(uniqueLeaguesLocal.values());
    console.log(`[Search API] Found ${matchingTeamsLocal.length} teams and ${matchingLeaguesLocal.length} leagues locally.`);


    // --- Fetch Leagues from Supabase ---
    const { data: supabaseLeagues, error: leagueError } = await supabase
      .from('leagues') // Your table name
      .select('id, name, logo, country') // Select necessary columns
      .ilike('name', `%${normalizedQuery}%`) // Case-insensitive search on the name
      .limit(10); // Limit the number of results

    if (leagueError) {
      console.error('[Search API] Supabase league query error:', leagueError);
      // Return empty for this type, but continue fetching others
      // return NextResponse.json({ teams: matchingTeams.slice(0, 10), leagues: [] }, { status: 500 }); // Old behavior
    } else {
      console.log(`[Search API] Found ${supabaseLeagues?.length ?? 0} leagues from Supabase.`); // Log league count
    }

    // --- Fetch Players from Supabase ---
    console.log(`[Search API] Querying players with name, firstname, or lastname like: %${normalizedQuery}%`); // Updated log
    const { data: supabasePlayersRaw, error: playerError } = await supabase
      .from('player_season_stats')
      // Select the statistics column as well
      .select('player_id, player_name, player_photo, api_raw_statistics') 
      .or(`player_name.ilike.%${normalizedQuery}%,player_firstname.ilike.%${normalizedQuery}%,player_lastname.ilike.%${normalizedQuery}%`)
      .order('season', { ascending: false })
      .limit(50); // Fetch more to increase chances of finding unique players with stats

    if (playerError) {
      console.error('[Search API] Supabase player query error:', playerError); // Log player error
    } else {
      console.log(`[Search API] Raw players found from Supabase: ${supabasePlayersRaw?.length ?? 0}`); // Log raw player count
      // Optional: Log the raw data itself (can be verbose)
      // console.log('[Search API] Raw player data:', JSON.stringify(supabasePlayersRaw, null, 2)); 
    }

    // --- Process and Deduplicate Players ---
    const uniquePlayersMap = new Map<number, PlayerSearchResult>();

    if (supabasePlayersRaw) {
      for (const player of supabasePlayersRaw) {
        if (player.player_id != null) {
          // Find the primary team name from the stats
          const primaryTeamName = getPrimaryTeamFromStats(player.api_raw_statistics);

          // If player not seen yet, add them
          if (!uniquePlayersMap.has(player.player_id)) {
             uniquePlayersMap.set(player.player_id, {
               player_id: player.player_id,
               player_name: player.player_name ?? 'Unknown Player',
               player_photo: player.player_photo,
               teamName: primaryTeamName ?? 'Unknown Team' // Use found name or fallback
             });
          }
          // Optional: Could add logic here to update if a later entry for the same player
          // has more appearances, but ordering by season descending helps mitigate this.
        }

        // Limit the number of *unique* players processed
        if (uniquePlayersMap.size >= 10) break;
      }
    }
    
    // Convert Map values to array
    const uniquePlayers = Array.from(uniquePlayersMap.values());
    console.log(`[Search API] Unique players after processing: ${uniquePlayers.length}`);


    // --- Fetch Fixtures (Matches) from Supabase ---
    console.log(`[Search API] Querying fixtures where home or away team name like: %${normalizedQuery}%`);
    // Adjust 'teams!foreign_key_constraint_name' if your FK constraints have different names
    // Assumes FKs: fixtures_home_team_id_fkey -> teams(id), fixtures_away_team_id_fkey -> teams(id)
    const { data: supabaseFixtures, error: fixtureError } = await supabase
      .from('fixtures')
      .select(`
        id,
        date,
        status,
        home_team:teams!fixtures_home_team_id_fkey ( id, name, logo ),
        away_team:teams!fixtures_away_team_id_fkey ( id, name, logo )
      `)
      // Use .or() to search in both related team names
      .or(`home_team.name.ilike.%${normalizedQuery}%,away_team.name.ilike.%${normalizedQuery}%`)
      // Optional: Order by date (e.g., upcoming first)
      // .order('date', { ascending: true })
      .limit(10); // Limit the number of match results

    if (fixtureError) {
      console.error('[Search API] Supabase fixture query error:', fixtureError);
      // Log the error but continue, returning empty matches
    } else {
      console.log(`[Search API] Found ${supabaseFixtures?.length ?? 0} fixtures from Supabase.`);
    }

    // --- Format Results ---

    // Combine local and Supabase results if needed, or prioritize Supabase
    // For simplicity, let's prioritize Supabase leagues if found, else use local
    const combinedLeagues = (supabaseLeagues && supabaseLeagues.length > 0)
        ? supabaseLeagues
        : matchingLeaguesLocal;

    const formattedLeagues = (combinedLeagues || []).map((league: any) => ({
      id: league.id,
      name: league.name,
      type: 'league',
      logo: `${CDN_BASE_URL.LEAGUES}/${league.id}.png`,
      country: league.country || 'Unknown'
    }));

    // Use local teams for now (can be replaced/merged with Supabase teams later)
    const formattedTeams = matchingTeamsLocal.map((team: any) => ({
        id: team.id,
        name: team.name,
        type: 'team',
        logo: `${CDN_BASE_URL.TEAMS}/${team.id}.png`,
    }));


    // Map unique players directly (teamName is already included)
    const formattedPlayers = uniquePlayers.map(player => ({
      id: player.player_id,
      name: player.player_name,
      type: 'player',
      logo: `${CDN_BASE_URL.PLAYERS}/${player.player_id}.png`,
      teamName: player.teamName // Use the teamName determined earlier
    }));
    console.log(`[Search API] Formatted players being sent: ${formattedPlayers.length}`); // Log final player count

    // Format Fixtures (Matches)
    const formattedMatches = (supabaseFixtures || [])
      // Add validation to ensure necessary data exists
      .filter(fixture => fixture.id && fixture.date && fixture.home_team && fixture.away_team)
      .map(fixture => ({
        id: fixture.id,
        type: 'match', // Ensure type is 'match' for the frontend
        date: fixture.date, // Keep as ISO string, frontend can format
        homeTeam: {
          id: fixture.home_team.id,
          name: fixture.home_team.name || 'Unknown Team',
          logo: fixture.home_team.logo || '/placeholder-team.png'
        },
        awayTeam: {
          id: fixture.away_team.id,
          name: fixture.away_team.name || 'Unknown Team',
          logo: fixture.away_team.logo || '/placeholder-team.png'
        },
        status: fixture.status // Pass the whole status object or specific parts like status.short
      }));
    console.log(`[Search API] Formatted matches being sent: ${formattedMatches.length}`);


    // --- Combine and Return ---
    // Return all types, sliced to limits
    return NextResponse.json({
      // Using local teams for now
      teams: formattedTeams.slice(0, 10),
      // Using combined/Supabase leagues
      leagues: formattedLeagues.slice(0, 10),
      players: formattedPlayers.slice(0, 10),
      // Add the formatted matches
      matches: formattedMatches.slice(0, 10)
    });

  } catch (error) {
    console.error('[Search API] General error in search API:', error); // Log general errors
    // Check if the error is related to JSON parsing
    if (error instanceof SyntaxError) {
        console.error("[Search API] Potential JSON parsing error in api_raw_statistics for a player.");
    }
    // Return all types empty on general error
    return NextResponse.json({ error: 'Failed to fetch search results', teams: [], leagues: [], players: [], matches: [] }, { status: 500 });
  }
} 