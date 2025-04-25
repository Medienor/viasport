import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import TeamStandings from '@/app/components/TeamStandings';
import path from 'path';
import { readdir } from 'fs/promises';
import TeamStats from '@/app/components/TeamStats';
import TeamAnalysis from '@/app/components/TeamAnalysis';
import { extractTeamId } from '@/utils/helpers';
import { getTeamData } from '@/utils/api';
import TabNav from '@/app/components/TabNav';
import { calculateTeamStats } from '@/app/utils/statsCalculator';
import OtherTeamsInLeague from '@/app/components/OtherTeamsInLeague';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import TeamHeaderNav from '@/app/components/TeamHeaderNav';
import { supabase } from '@/lib/supabase';

// Define Season type if not already defined globally or imported
interface Season {
  year: number;
  // Add other properties if they exist, e.g., start, end
}

// Define LeagueData structure based on your actual API response
interface LeagueData {
  league: {
    id: number;
    name: string;
    logo: string;
    // other league props
  };
  country: {
    name: string;
    // other country props
  };
  seasons: Season[];
}

// Add this constant at the top level
const DATA_DIR = path.join(process.cwd(), 'data', 'teams');

// Helper function to create URL-friendly slug
function createTeamSlug(teamName: string, teamId: number) {
  return `${teamName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${teamId}`;
}

// Helper function to generate league slug (optional, can be inline)
const generateLeagueSlug = (name: string, id: number | string): string => {
  const baseSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return `/fotball/liga/${baseSlug}-${id}`;
};

// Update the generateStaticParams function
export async function generateStaticParams() {
  try {
    const files = await readdir(DATA_DIR);
    const params = await Promise.all(
      files
        .filter(file => file.endsWith('.json'))
        .map(async (file) => {
          const teamIdStr = file.replace('.json', '');
          const teamId = parseInt(teamIdStr);
          if (isNaN(teamId)) return null; // Skip if ID is not a number

          try {
            const data = await getTeamData(teamId);
            const teamName = data?.team?.team?.name || '';
            if (!teamName) return null; // Skip if no team name
            return {
              slug: createTeamSlug(teamName, teamId)
            };
          } catch (teamError) {
            console.error(`Error fetching team data for ID ${teamId} in generateStaticParams:`, teamError);
            return null; // Skip on error fetching specific team
          }
        })
    );
    return params.filter(p => p !== null); // Filter out any null results
  } catch (error) {
    console.error('Error reading data directory in generateStaticParams:', error);
    return [];
  }
}

// This enables static generation
export const dynamic = 'force-static';
export const revalidate = 86400; // 24 hours in seconds

// Interface for team details fetched from fotball_teams
interface TeamDetails {
  team_id: number;
  name: string | null;
  logo: string | null;
}

// Update SupabaseFixture interface for the score structure
interface SupabaseFixture {
  id: number;
  date: string;
  // Make status more specific based on potential API response structure
  status: {
    short?: string;
    long?: string;
    elapsed?: number | null; // Add elapsed time
    [key: string]: any; // Allow other properties
  };
  league_id: number;
  home_team_id: number;
  home_team: { name: string | null; logo: string | null } | null;
  away_team_id: number;
  away_team: { name: string | null; logo: string | null } | null;
  // Update score structure
  score?: {
    halftime?: { home: number | null; away: number | null };
    fulltime?: { home: number | null; away: number | null };
    extratime?: { home: number | null; away: number | null };
    penalty?: { home: number | null; away: number | null };
  } | null; // Make the whole score object potentially null
  round: string | null;
  venue: { id: number | null; name: string | null; city: string | null } | null;
  league: { id: number | null; name: string | null; logo: string | null; country: string | null; flag: string | null } | null;
}

// Define live statuses
const liveStatuses = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'];

export default async function TeamPage({ params }: { params: { slug: string } }) {
  // Wait for params - no need to await here, params is directly available
  const slug = params.slug;
  const teamId = extractTeamId(slug);

  if (!teamId) {
    console.error('[TeamPage] No team ID found in slug:', slug);
    return notFound();
  }

  console.log(`[TeamPage] Fetching data for team ID: ${teamId}`);
  const teamApiData = await getTeamData(teamId);

  const now = new Date().toISOString();

  // Define statuses that indicate a match is finished or otherwise not upcoming/live
  const terminalStatuses = ['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'AWD', 'WO'];

  // --- Fetch Upcoming & Live Fixtures ---
  console.log(`[TeamPage] Querying Supabase for upcoming and live fixtures for team ${teamId}`);
  const { data: upcomingFixtureData, error: upcomingFixtureError } = await supabase
    .from('fixtures')
    .select('id, date, status, league_id, home_team_id, away_team_id, score, round, venue, league')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    // Filter out matches with terminal statuses instead of filtering by date > now
    .not('status->>short', 'in', `(${terminalStatuses.join(',')})`)
    .order('date', { ascending: true }) // Keep ordering by date (live matches might appear first if their date is recent)
    .limit(20);

  // --- Fetch Past Fixtures ---
  console.log(`[TeamPage] Querying Supabase for past fixtures for team ${teamId} before ${now}`);
  const { data: pastFixtureData, error: pastFixtureError } = await supabase
    .from('fixtures')
    .select('id, date, status, league_id, home_team_id, away_team_id, score, round, venue, league')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    // Filter specifically for finished games using JSONB query
    // Note: Adjust 'FT' if your status short code is different
    .in('status->>short', ['FT', 'AET', 'PEN']) // Explicitly include all finished types
    .order('date', { ascending: false }) // Order recent first
    .limit(10); // Limit to last 10 finished games

  // --- Handle Errors ---
  if (upcomingFixtureError) {
    console.error('[TeamPage] 🚨 Error fetching upcoming fixture data from Supabase:', upcomingFixtureError);
    // Consider fallback or partial render
  }
  if (pastFixtureError) {
    console.error('[TeamPage] 🚨 Error fetching past fixture data from Supabase:', pastFixtureError);
    // Consider fallback or partial render
  }

  // Combine fixture data for team ID collection
  const allFixtureData = [
      ...(upcomingFixtureData || []),
      ...(pastFixtureData || [])
  ];

  let teamDetailsMap = new Map<number, { name: string | null; logo: string | null }>();

  // --- Fetch Team Details for ALL fixtures ---
  if (allFixtureData.length > 0) {
    const teamIds = new Set<number>();
    allFixtureData.forEach(f => {
      if (f.home_team_id) teamIds.add(f.home_team_id);
      if (f.away_team_id) teamIds.add(f.away_team_id);
    });

    if (teamIds.size > 0) {
      console.log(`[TeamPage] Fetching details for ${teamIds.size} unique teams from fotball_teams`);
      const { data: teamsData, error: teamsError } = await supabase
        .from('fotball_teams')
        .select('team_id, name, logo')
        .in('team_id', Array.from(teamIds));

      if (teamsError) {
        console.error('[TeamPage] 🚨 Error fetching team details from fotball_teams:', teamsError);
      } else if (teamsData) {
        teamsData.forEach((team: TeamDetails) => {
          teamDetailsMap.set(team.team_id, { name: team.name, logo: team.logo });
        });
        console.log(`[TeamPage] ✅ Successfully fetched and mapped details for ${teamDetailsMap.size} teams.`);
      }
    }
  }

  // --- Helper function to map raw fixture data ---
  const mapFixtureData = (f: any): SupabaseFixture => {
    const homeTeamDetails = teamDetailsMap.get(f.home_team_id) || null;
    const awayTeamDetails = teamDetailsMap.get(f.away_team_id) || null;
    const venueInfo = f.venue ? { id: f.venue.id || null, name: f.venue.name || null, city: f.venue.city || null } : null;
    const leagueInfo = f.league ? { id: f.league.id || null, name: f.league.name || null, logo: f.league.logo || null, country: f.league.country || null, flag: f.league.flag || null } : null;

    // Extract score, ensuring fulltime exists or is null
    const scoreInfo = f.score ? {
        halftime: f.score.halftime || null,
        fulltime: f.score.fulltime || null, // Ensure fulltime object is extracted
        extratime: f.score.extratime || null,
        penalty: f.score.penalty || null,
    } : null;

    // Ensure status is an object, even if null in DB
    const statusInfo = f.status && typeof f.status === 'object' ? f.status : {};

    return {
      id: f.id,
      date: f.date,
      status: statusInfo, // Use the validated status object
      league_id: f.league_id,
      home_team_id: f.home_team_id,
      home_team: homeTeamDetails,
      away_team_id: f.away_team_id,
      away_team: awayTeamDetails,
      score: scoreInfo, // Assign the potentially nested score object
      round: f.round || null,
      venue: venueInfo,
      league: leagueInfo,
    };
  };

  // --- Map Upcoming Fixtures ---
  const supabaseUpcomingFixtures: SupabaseFixture[] = (upcomingFixtureData || []).map(mapFixtureData);
  console.log(`[TeamPage] Mapped ${supabaseUpcomingFixtures.length} upcoming/live fixtures with details`);

  // --- Map Past Fixtures ---
  const supabasePastFixtures: SupabaseFixture[] = (pastFixtureData || []).map(mapFixtureData);
  console.log(`[TeamPage] Mapped ${supabasePastFixtures.length} past fixtures with details`);


  // --- Fallback/Error handling for teamApiData ---
  if (!teamApiData || !teamApiData.team?.team?.name) {
    console.error(`[TeamPage] ⚠️ Invalid team API data for ID: ${teamId}`, teamApiData);
    // Decide if page can render without API data but with Supabase data
    if (supabaseUpcomingFixtures.length === 0 && supabasePastFixtures.length === 0) {
       console.log(`[TeamPage] 🚫 No API data and no Supabase fixtures found for team ${teamId}. Rendering notFound.`);
       return notFound();
    }
    // Potentially set team info from Supabase data if available
     console.log(`[TeamPage] 🤔 Missing API data, but proceeding with Supabase data for team ${teamId}.`);
  }

  const {
    team, // Use team info primarily from API data if available
    leagues = [],
    // fixtures: apiFixtures = { upcoming: [], past: [] }, // No longer needed for past/upcoming
  } = teamApiData || {}; // Still useful for league memberships, maybe team info fallback

  const calculatedStats = teamApiData ? calculateTeamStats(teamApiData) : null;

  // Log the raw leagues data received from the API
  // Use console.log on the server-side; it will appear in your terminal
  // console.log(`[TeamPage] Raw leagues data for team ${teamId}:`, JSON.stringify(leagues, null, 2)); // Less verbose logging

  // Robustly aggregate all unique season years from ALL leagues
  const allSeasonYears = leagues.reduce((acc: Set<number>, leagueData: LeagueData) => {
    // Check if leagueData and leagueData.seasons exist and is an array
    if (leagueData && leagueData.seasons && Array.isArray(leagueData.seasons)) {
      leagueData.seasons.forEach((season: Season | any) => { // Use 'any' for safety if Season type isn't strict
        // Check if season object and season.year exist and are numbers
        if (season && typeof season.year === 'number') {
          acc.add(season.year); // Use a Set to handle uniqueness automatically
        } else {
          // Log potential issues on the server
           // console.warn(`[TeamPage] Invalid season format in league ${leagueData?.league?.id} for team ${teamId}:`, season);
        }
      });
    } else {
       // Log potential issues on the server
       // console.warn(`[TeamPage] Missing or invalid seasons array in league data for team ${teamId}:`, leagueData);
    }
    return acc;
  }, new Set<number>()); // Initialize with an empty Set

  // Convert Set to array and sort descending
  const sortedSeasonYears = Array.from(allSeasonYears).sort((a, b) => b - a);

  // Log the calculated seasons on the server
  // console.log(`[TeamPage] Calculated seasonYears for team ${teamId}:`, sortedSeasonYears);

  // Handle case where no seasons are found at all - Fallback to current year
  const seasonYears = sortedSeasonYears.length > 0 ? sortedSeasonYears : [new Date().getFullYear()];
  // console.log(`[TeamPage] Final seasonYears prop being passed to TeamStandings for team ${teamId}:`, seasonYears);

  // More debug logging
  console.log('[TeamPage] ✅ Render Data Summary:', {
    teamName: team?.team?.name ?? 'N/A (API data missing)',
    hasLeagues: leagues.length > 0,
    upcomingCount: supabaseUpcomingFixtures.length,
    pastCount: supabasePastFixtures.length,
    hasStats: !!calculatedStats
  });

  const tabs = [
    { name: 'Oversikt', href: `/lag/${slug}` },
    { name: 'Tropp', href: `/lag/${slug}/tropp` },
    { name: 'Resultater', href: `/lag/${slug}/resultater` },
    { name: 'Kamper', href: `/lag/${slug}/kamper` },
    { name: 'Tabell', href: `/lag/${slug}/tabell` },
  ];

  const currentTeamId = team?.team?.id ?? teamId; // Use teamId as fallback if API data is missing

  // --- Calculate Form based on Supabase Past Fixtures ---
  const formFixtures = supabasePastFixtures.slice(0, 5);

  const nextMatchFixture = supabaseUpcomingFixtures[0];

  // Helper function to format date (ensure it's defined or imported)
  const formatMatchDate = (dateString: string): string => {
    try {
      return format(parseISO(dateString), "EEEE d. MMMM, HH:mm", { locale: nb });
    } catch (e) {
      console.error("🚨 Error formatting date:", e);
      return dateString; // Fallback
    }
  };

  try {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Render TeamHeaderNav only if team data is available */}
        {team && team.team && (
          <TeamHeaderNav
            teamLogo={team.team.logo}
            teamName={`${team.team.name} på TV og Live Stream`}
            tabs={tabs}
          />
        )}

        {/* Main Content - Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Standings, Form, Next Match (40%) */}
          <div className="lg:w-[40%] space-y-8">
            {/* Render TeamStandings only if team data is available */}
            {team && team.team && (
              <TeamStandings
                teamId={team.team.id}
                teamName={team.team.name}
                seasons={seasonYears}
                hideSeasonSelector={true}
              />
            )}

            {/* --- NEW: Team Form Section --- */}
            {formFixtures.length > 0 && currentTeamId && (
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Lagform (Siste 5)</h3>
                <div className="flex justify-around items-start space-x-1">
                  {formFixtures.map((fixture: SupabaseFixture) => { // Use SupabaseFixture type
                    // --- Corrected Form Logic ---
                    let result = 'U'; // Use 'U' for Undecided/Draw initially
                    let bgColor = 'bg-gray-400';
                    const homeScore = fixture.score?.fulltime?.home;
                    const awayScore = fixture.score?.fulltime?.away;

                    // Check if scores are valid numbers and we have the current team's ID
                    if (typeof homeScore === 'number' && typeof awayScore === 'number' && currentTeamId) {
                      if (fixture.home_team_id === currentTeamId) { // Current team is home
                        if (homeScore > awayScore) { result = 'V'; bgColor = 'bg-green-500'; } // V for Vinn (Win)
                        else if (homeScore < awayScore) { result = 'T'; bgColor = 'bg-red-500'; } // T for Tap (Loss)
                        // If scores are equal, result remains 'U' (Uavgjort - Draw)
                      } else if (fixture.away_team_id === currentTeamId) { // Current team is away
                        if (awayScore > homeScore) { result = 'V'; bgColor = 'bg-green-500'; }
                        else if (awayScore < homeScore) { result = 'T'; bgColor = 'bg-red-500'; }
                        // If scores are equal, result remains 'U'
                      } else {
                        // Should not happen if fixtures are filtered correctly, but handle defensively
                        console.warn(`[TeamPage] 🤔 Current team (${currentTeamId}) not found in past fixture ${fixture.id}`);
                        result = '?'; // Indicate unknown result if current team wasn't involved
                        bgColor = 'bg-yellow-400';
                      }
                    } else {
                       // Handle cases with missing scores or missing currentTeamId
                       console.warn(`[TeamPage] 🤔 Missing score or team ID for past fixture ${fixture.id}. Scores: H${homeScore}-A${awayScore}, CurrentTeam: ${currentTeamId}`);
                       result = '?';
                       bgColor = 'bg-yellow-400';
                    }
                    // --- End Corrected Form Logic ---

                    // Determine opponent
                    const opponent = fixture.home_team_id === currentTeamId ? fixture.away_team : fixture.home_team;
                    const opponentName = opponent?.name ?? (fixture.home_team_id === currentTeamId ? `Team ${fixture.away_team_id}` : `Team ${fixture.home_team_id}`);
                    const opponentLogo = opponent?.logo?.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net');
                    const scoreDisplay = `${homeScore ?? '?'} - ${awayScore ?? '?'}`;

                    // --- CREATE TOOLTIP TEXT ---
                    const tooltipText = `${fixture.home_team?.name ?? 'Ukjent'} ${scoreDisplay} ${fixture.away_team?.name ?? 'Ukjent'} (${format(parseISO(fixture.date), "d. MMM", { locale: nb })})`;
                    // --- END TOOLTIP TEXT ---

                    return (
                      <Link
                        key={fixture.id}
                        href={`/fotball/kamp/${fixture.id}`}
                        className="flex flex-col items-center space-y-1.5 text-center hover:opacity-80 transition-opacity group relative"
                        title={tooltipText} // Use title for basic tooltip
                      >
                        {/* Result Badge */}
                        <span className={`w-6 h-6 flex items-center justify-center rounded-full text-white text-xs font-bold ${bgColor}`}>
                          {result}
                        </span>
                        {/* Opponent Logo */}
                        {opponentLogo ? (
                          <img
                            src={opponentLogo}
                            alt={opponentName}
                            className="h-6 w-6 object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-6 w-6 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xs">?</div>
                        )}
                        {/* Tooltip (alternative, more styled) - requires CSS for visibility on hover */}
                        {/* <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                          {tooltipText}
                        </span> */}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
            {/* --- END: Team Form Section --- */}

            {/* --- NEW: Next Match Section - Enhanced --- */}
            {nextMatchFixture && (
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Neste kamp</h3>
                <Link href={`/fotball/kamp/${nextMatchFixture.id}`} className="block hover:bg-gray-50 rounded-md -m-2 p-2 transition-colors">
                  <div className="flex items-center justify-between text-center mb-3">
                     {/* Home Team */}
                     <div className="flex flex-col items-center space-y-1 w-[35%]">
                       {nextMatchFixture.home_team?.logo && (
                         <img
                           src={nextMatchFixture.home_team.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')}
                           alt={nextMatchFixture.home_team.name || ''}
                           className="h-8 w-8 object-contain"
                           loading="lazy"
                         />
                       )}
                       <span className="text-xs font-medium text-gray-800 truncate w-full">
                         {nextMatchFixture.home_team?.name ?? `Team ${nextMatchFixture.home_team_id}`}
                       </span>
                     </div>
                     {/* Time/Date or Live Status */}
                     <div className="flex flex-col items-center w-[30%]">
                       <span className="text-sm font-semibold text-gray-900">
                         {(() => {
                            const statusShort = nextMatchFixture.status?.short;
                            const elapsed = nextMatchFixture.status?.elapsed;
                            console.log(`[TeamPage] ⏱️ Next Match (ID: ${nextMatchFixture.id}) Status: ${statusShort}, Elapsed: ${elapsed}`); // Log status

                            if (statusShort && liveStatuses.includes(statusShort)) {
                               // Use the new green color for live indicators
                               if (statusShort === 'HT') return <span className="text-[#00985f] animate-pulse">HT</span>;
                               if (typeof elapsed === 'number') return <span className="text-[#00985f] animate-pulse">{elapsed}'</span>;
                               return <span className="text-[#00985f] animate-pulse">Live</span>;
                            }
                            // Default to scheduled time if not live
                            try {
                               return format(parseISO(nextMatchFixture.date), "HH:mm", { locale: nb });
                            } catch {
                               return '--:--'; // Fallback for invalid date
                            }
                         })()}
                       </span>
                       <span className="text-xs text-gray-500">
                         {format(parseISO(nextMatchFixture.date), "d. MMM", { locale: nb })}
                       </span>
                     </div>
                     {/* Away Team */}
                     <div className="flex flex-col items-center space-y-1 w-[35%]">
                       {nextMatchFixture.away_team?.logo && (
                         <img
                           src={nextMatchFixture.away_team.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')}
                           alt={nextMatchFixture.away_team.name || ''}
                           className="h-8 w-8 object-contain"
                           loading="lazy"
                         />
                       )}
                       <span className="text-xs font-medium text-gray-800 truncate w-full">
                         {nextMatchFixture.away_team?.name ?? `Team ${nextMatchFixture.away_team_id}`}
                       </span>
                     </div>
                  </div>
                  {/* League and Venue Info */}
                  <div className="text-center text-xs text-gray-500 border-t border-gray-100 pt-2 mt-2 space-y-0.5">
                    {nextMatchFixture.league && (
                      <div className="flex items-center justify-center space-x-1.5">
                        {nextMatchFixture.league.logo && (
                          <img src={nextMatchFixture.league.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')} alt={nextMatchFixture.league.name || ''} className="h-3 w-3 object-contain"/>
                        )}
                        <span>{nextMatchFixture.league.name}</span>
                        {nextMatchFixture.round && <span className="text-gray-400">({nextMatchFixture.round.split(' - ')[1] || nextMatchFixture.round})</span>}
                      </div>
                    )}
                    {nextMatchFixture.venue && (
                      <div>
                        <span>{nextMatchFixture.venue.name}</span>
                        {nextMatchFixture.venue.city && <span className="text-gray-400">, {nextMatchFixture.venue.city}</span>}
                      </div>
                    )}
                  </div>
                </Link>
              </div>
            )}
            {/* --- END: Next Match Section --- */}

          </div>

          {/* Right Column - Main Content (60%) */}
          <div className="lg:w-[60%] space-y-8">
            {/* Upcoming Matches - Enhanced */}
            {supabaseUpcomingFixtures.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Kommende kamper</h2>
                <div className="space-y-4">
                  {supabaseUpcomingFixtures.map((fixture: SupabaseFixture) => {
                    const isHomeTeamCurrent = fixture.home_team_id === currentTeamId;
                    const isAwayTeamCurrent = fixture.away_team_id === currentTeamId;
                    const statusShort = fixture.status?.short;
                    const elapsed = fixture.status?.elapsed;
                    const isLive = statusShort && liveStatuses.includes(statusShort);

                    console.log(`[TeamPage] ⏱️ Upcoming Fixture List (ID: ${fixture.id}) Status: ${statusShort}, Elapsed: ${elapsed}, IsLive: ${isLive}`); // Log status

                    return (
                      <div key={fixture.id} className="bg-white rounded-lg border border-gray-200 shadow-sm relative overflow-hidden">
                        {/* Date Badge */}
                        <div className="absolute top-2 left-2 bg-gray-100 text-gray-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full z-10">
                          {format(parseISO(fixture.date), "d. MMM", { locale: nb })}
                        </div>
                        <Link href={`/fotball/kamp/${fixture.id}`} className="block p-4 pt-8 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            {/* Home Team */}
                            <div className="flex items-center space-x-3 w-2/5">
                              <div className="relative h-8 w-8 flex-shrink-0">
                                <Image
                                  src={fixture.home_team?.logo?.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net') || '/images/team-placeholder.png'} // Use nested logo
                                  alt={fixture.home_team?.name || ''} // Use nested name
                                  fill
                                  className="object-contain"
                                  loading="lazy"
                                />
                              </div>
                              <span className={`font-medium truncate ${isHomeTeamCurrent ? 'font-bold' : ''}`}>
                                {fixture.home_team?.name ?? `Team ${fixture.home_team_id}`} {/* Use nested name */}
                              </span>
                            </div>

                            {/* Middle Section: Time/Live Status, League, Venue */}
                            <div className="text-center w-1/5 flex flex-col items-center text-xs">
                               {/* Use the new green color for live indicators */}
                               <span className={`font-semibold text-sm mb-1 ${isLive ? 'text-[#00985f] animate-pulse' : 'text-gray-900'}`}>
                                 {(() => {
                                    if (isLive) {
                                      if (statusShort === 'HT') return 'HT';
                                      if (typeof elapsed === 'number') return `${elapsed}'`;
                                      return 'Live';
                                    }
                                    // Default to scheduled time
                                    try {
                                      return format(parseISO(fixture.date), "HH:mm", { locale: nb });
                                    } catch {
                                      return '--:--';
                                    }
                                 })()}
                               </span>
                               {fixture.league && (
                                 <div className="flex items-center justify-center space-x-1 text-gray-600 mb-0.5">
                                   {fixture.league.logo && (
                                     <img src={fixture.league.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')} alt="" className="h-3 w-3 object-contain"/>
                                   )}
                                   <span className="truncate" title={fixture.league.name || ''}>{fixture.league.name}</span>
                                 </div>
                               )}
                               {fixture.venue && (
                                 <span className="text-gray-400 truncate" title={`${fixture.venue?.name ?? ''}, ${fixture.venue?.city ?? ''}`}>
                                    {fixture.venue.name}
                                 </span>
                               )}
                            </div>

                            {/* Away Team */}
                            <div className="flex items-center justify-end space-x-3 w-2/5">
                              <span className={`font-medium text-right truncate ${isAwayTeamCurrent ? 'font-bold' : ''}`}>
                                {fixture.away_team?.name ?? `Team ${fixture.away_team_id}`} {/* Use nested name */}
                              </span>
                              <div className="relative h-8 w-8 flex-shrink-0">
                                <Image
                                  src={fixture.away_team?.logo?.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net') || '/images/team-placeholder.png'} // Use nested logo
                                  alt={fixture.away_team?.name || ''} // Use nested name
                                  fill
                                  className="object-contain"
                                  loading="lazy"
                                />
                              </div>
                            </div>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Siste Kamper Section (uses Supabase past) */}
            {supabasePastFixtures.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Siste kamper</h2>
                <div className="space-y-4">
                  {supabasePastFixtures.map((fixture: SupabaseFixture) => {
                    const isHomeTeamCurrent = fixture.home_team_id === currentTeamId;
                    const isAwayTeamCurrent = fixture.away_team_id === currentTeamId;
                    // Extract fulltime scores for display
                    const homeScore = fixture.score?.fulltime?.home;
                    const awayScore = fixture.score?.fulltime?.away;
                    const statusShort = fixture.status?.short; // Get status short code

                    return (
                      <div key={fixture.id} className="bg-white rounded-lg border border-gray-200 shadow-sm relative overflow-hidden">
                        {/* Date Badge */}
                        <div className="absolute top-2 left-2 bg-gray-100 text-gray-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full z-10">
                          {format(parseISO(fixture.date), "d. MMM yyyy", { locale: nb })}
                        </div>
                        <Link href={`/fotball/kamp/${fixture.id}`} className="block p-4 pt-8 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            {/* Home Team */}
                            <div className="flex items-center space-x-3 w-2/5">
                              <div className="relative h-8 w-8 flex-shrink-0">
                                <Image
                                  src={fixture.home_team?.logo?.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net') || '/images/team-placeholder.png'}
                                  alt={fixture.home_team?.name || ''}
                                  fill className="object-contain"
                                  loading="lazy"
                                />
                              </div>
                              <span className={`font-medium truncate ${isHomeTeamCurrent ? 'font-bold' : ''}`}>
                                {fixture.home_team?.name ?? `Team ${fixture.home_team_id}`}
                              </span>
                            </div>

                            {/* Middle Section: Score, League */}
                            <div className="text-center w-1/5 flex flex-col items-center text-xs">
                               {/* Display fulltime score */}
                               <span className="font-bold text-lg text-gray-900 mb-1">
                                 {typeof homeScore === 'number' && typeof awayScore === 'number'
                                   ? `${homeScore} - ${awayScore}`
                                   : ['FT', 'AET', 'PEN'].includes(statusShort || '') ? '0 - 0' // Show 0-0 if finished but no score
                                   : statusShort || 'vs' // Show status if available and not finished, else 'vs'
                                 }
                               </span>
                               {fixture.league && (
                                 <div className="flex items-center justify-center space-x-1 text-gray-600 mb-0.5">
                                   {fixture.league.logo && (
                                     <img src={fixture.league.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')} alt="" className="h-3 w-3 object-contain"/>
                                   )}
                                   <span className="truncate" title={fixture.league.name || ''}>{fixture.league.name}</span>
                                 </div>
                               )}
                            </div>

                            {/* Away Team */}
                            <div className="flex items-center justify-end space-x-3 w-2/5">
                              <span className={`font-medium text-right truncate ${isAwayTeamCurrent ? 'font-bold' : ''}`}>
                                {fixture.away_team?.name ?? `Team ${fixture.away_team_id}`}
                              </span>
                              <div className="relative h-8 w-8 flex-shrink-0">
                                <Image
                                  src={fixture.away_team?.logo?.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net') || '/images/team-placeholder.png'}
                                  alt={fixture.away_team?.name || ''}
                                  fill className="object-contain"
                                  loading="lazy"
                                />
                              </div>
                            </div>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Team Statistics */}
            {calculatedStats && <TeamStats statistics={calculatedStats} />}

            {/* Team Standing Analysis Section */}
            {leagues.length > 0 && team && team.team && (
              <TeamAnalysis
                team={team}
                leagues={leagues}
              />
            )}

            {/* Next Match Information Section - Enhanced */}
            {supabaseUpcomingFixtures.length > 0 && team && team.team && (
              <div className="mt-12">
                <h2 className="text-xl font-semibold mb-4">
                  Når spiller {team.team.name} sin neste kamp?
                </h2>
                <div className="prose prose-lg max-w-none">
                  {(() => {
                    const nextMatch = supabaseUpcomingFixtures[0];
                    const secondMatch = supabaseUpcomingFixtures[1];
                    const thirdMatch = supabaseUpcomingFixtures[2];

                    let text = `${team.team.name} spiller sin neste kamp `;

                    if (nextMatch) {
                      const isHome = nextMatch.home_team_id === teamId;
                      const opponent = isHome ? nextMatch.away_team : nextMatch.home_team;
                      const opponentName = opponent?.name ?? `Team ${isHome ? nextMatch.away_team_id : nextMatch.home_team_id}`;
                      const venue = isHome ? 'hjemme' : 'borte';
                      const venueName = nextMatch.venue?.name ? ` på ${nextMatch.venue.name}` : '';
                      const leagueName = nextMatch.league?.name ? ` i ${nextMatch.league.name}` : '';

                      // --- Determine Time/Status String ---
                      let timeStatusString = '';
                      const statusShort = nextMatch.status?.short;
                      const elapsed = nextMatch.status?.elapsed;
                      const isLive = statusShort && liveStatuses.includes(statusShort);

                      if (isLive) {
                          if (statusShort === 'HT') timeStatusString = ' (Pause)';
                          else if (typeof elapsed === 'number') timeStatusString = ` (Live ${elapsed}')`;
                          else timeStatusString = ' (Live)';
                      }
                      const formattedDate = formatMatchDate(nextMatch.date);
                      // --- End Determine Time/Status String ---


                      text += `${venue} mot ${opponentName}${venueName} ${formattedDate}${timeStatusString}${leagueName}`;

                      if (secondMatch) {
                        const secondIsHome = secondMatch.home_team_id === teamId;
                        const secondOpponent = secondIsHome ? secondMatch.away_team : secondMatch.home_team;
                        const secondOpponentName = secondOpponent?.name ?? `Team ${secondIsHome ? secondMatch.away_team_id : secondMatch.home_team_id}`;
                        const secondVenueName = secondMatch.venue?.name ? ` på ${secondMatch.venue.name}` : '';
                        const secondLeagueName = secondMatch.league?.name ? ` i ${secondMatch.league.name}` : '';
                        const secondFormattedDate = formatMatchDate(secondMatch.date);
                        text += `. Deretter venter ${secondOpponentName}${secondVenueName} ${secondFormattedDate}${secondLeagueName}`;

                        if (thirdMatch) {
                          const thirdIsHome = thirdMatch.home_team_id === teamId;
                          const thirdOpponent = thirdIsHome ? thirdMatch.away_team : thirdMatch.home_team;
                          const thirdOpponentName = thirdOpponent?.name ?? `Team ${thirdIsHome ? thirdMatch.away_team_id : thirdMatch.home_team_id}`;
                          const thirdVenueName = thirdMatch.venue?.name ? ` på ${thirdMatch.venue.name}` : '';
                          const thirdLeagueName = thirdMatch.league?.name ? ` i ${thirdMatch.league.name}` : '';
                          const thirdFormattedDate = formatMatchDate(thirdMatch.date);
                          text += `, før de møter ${thirdOpponentName}${thirdVenueName} ${thirdFormattedDate}${thirdLeagueName}`;
                        }
                      }
                      text += '.';
                    } else {
                       text = `Ingen kommende kamper funnet for ${team.team.name}.`;
                    }
                    return <p>{text}</p>;
                  })()}
                </div>
              </div>
            )}

            {/* --- NEW: Turneringer List Section --- */}
            {leagues.length > 0 && team && team.team && (
              <div className="mt-12">
                <h2 className="text-xl font-semibold mb-4">
                  Turneringer for {team.team.name}
                </h2>
                <div className="prose max-w-none">
                  <ul className="list-disc pl-5 space-y-1">
                    {leagues.map((leagueData: LeagueData) => ( // Use LeagueData type
                      <li key={leagueData.league.id}>
                        <Link
                          href={generateLeagueSlug(leagueData.league.name, leagueData.league.id)}
                          className="text-blue-600 hover:underline"
                        >
                          {leagueData.league.name} ({leagueData.country.name})
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {/* --- END: Turneringer List Section --- */}

            {/* Add the new component */}
            <OtherTeamsInLeague currentTeamId={teamId} leagues={leagues} />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('[TeamPage] 🚨🚨🚨 CRITICAL ERROR rendering page:', error);
    // Provide a user-friendly error message
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Oops! Noe gikk galt.</h1>
            <p className="text-gray-700">Kunne ikke laste inn laginformasjonen. Vennligst prøv igjen senere.</p>
            {/* Optionally show error details in development */}
            {process.env.NODE_ENV === 'development' && (
                <pre className="mt-4 text-left text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {error instanceof Error ? error.stack : String(error)}
                </pre>
            )}
        </div>
    );
  }
} 