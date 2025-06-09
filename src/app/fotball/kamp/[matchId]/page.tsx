import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import type { Fixture } from '@/types/fixtures';
import MatchCalendar from '@/app/components/MatchCalendar';
import PreventAutoScroll from '@/app/components/PreventAutoScroll';
import HeadToHeadFixtures from '@/app/components/HeadToHeadFixtures';
import { formatMatchDateTime } from '@/utils/dateUtils';
import { getStreamingProviders } from '@/utils/channelUtils';
import LeagueChannels from '@/app/components/LeagueChannels';
import MatchHighlights from '@/app/components/MatchHighlights';
import MatchTabs from '@/app/components/MatchTabs';
import TeamColorExtractor from '@/app/components/TeamColorExtractor';
import MatchCountdown from '@/app/components/MatchCountdown';
import FollowButton from '@/app/components/FollowButton';
import TeamForm from '@/app/components/TeamForm';
import LiveMatchTimer from '@/app/components/LiveMatchTimer';
import LiveMatchEvents from '@/app/components/LiveMatchEvents';
import TopScorersComparison from '@/app/components/TopScorersComparison';
import MatchStatsSnippet from '@/app/components/MatchStatsSnippet';
import HorizontalLineupComponent from '@/app/components/HorizontalLineupComponent';
import FixtureNews from '@/app/components/FixtureNews';
import TopSectionTabs from '@/app/components/TopSectionTabs';
import TeamStandings from '@/app/components/TeamStandingsFixed';
import MatchStats from '@/app/components/MatchStats';
import HeadToHeadTab from '@/app/components/HeadToHeadTab';
import MatchCommentary from '@/app/components/MatchCommentary';
import MatchSummaryCard from '@/app/components/MatchSummaryCard';
import LiveCommentaryPreview from '@/app/components/LiveCommentaryPreview';

export const dynamic = "force-dynamic";

// Initialize Supabase client with the working configuration LOL FUCK YOU
const supabase = createClient(
  'https://cdynfbwdwdfsiwkgixua.supabase.co',
  process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkeW5mYndkd2Rmc2l3a2dpeHVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjU3ODQwMSwiZXhwIjoyMDU4MTU0NDAxfQ.5V7CbSCE4lb3FbJUa3kgipRPWXG4LeVRCf7eeLSrSoI',
  {
    global: {
      fetch: fetch as any
    }
  }
);

async function fetchMatchById(matchId: string): Promise<Fixture | null> {
  try {
    const { data: match, error } = await supabase
      .from('fixtures')
      .select(`
        id,
        date,
        league_id,
        home_team_id,
        away_team_id,
        status,
        score,
        league,
        teams,
        match_status,
        venue,
        goals,
        referee,
        event_data,
        event_goals,
        event_cards_yellow,
        event_cards_red,
        event_substitutions,
        fixture_statistics,
        head_to_head,
        player_statistics,
        lineups,
        fixture,
        commentary_path,
        season_year,
        details_last_updated_at,
        ball_possession,
        youtube_highlight_id
      `)
      .eq('id', matchId)
      .single();

    if (error) throw error;
    return match as Fixture | null;
  } catch (error) {
    console.error('🔴 Error fetching match by ID:', error);
    return null;
  }
}

async function fetchAllMatches(): Promise<Fixture[]> {
  try {
    const { data: matches, error } = await supabase
      .from('fixtures')
      .select(`
        id,
        fixture,
        league,
        teams,
        goals,
        match_status
      `);

    if (error) throw error;
    return matches || [];
  } catch (error) {
    console.error('🔴 Error:', error);
    return [];
  }
}

export async function generateStaticParams() {
  try {
    const matches = await fetchAllMatches();
    
    if (!matches || matches.length === 0) {
      console.log('No matches found for static generation');
      return [];
    }
    
    return matches.map((match) => ({
      matchId: match.id.toString(),
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

function generateMatchSummary(match: any) {
  if (!match) return ''; // Add early return if match is undefined
  
  // Add null checks for events
  const events = match.event_data || [];
  const goals = (events || []).filter(e => e?.type === 'Goal') || [];
  const cards = (events || []).filter(e => e?.type === 'Card') || [];
  const redCards = (cards || []).filter(e => e?.detail === 'Red Card') || [];
  
  let summary = '';
  
  // Basic result - Add null checks for goals
  const homeGoals = match.goals?.home ?? 0;
  const awayGoals = match.goals?.away ?? 0;
  
  if (homeGoals === awayGoals) {
    summary = `${match.teams?.home?.name || 'Hjemmelag'} og ${match.teams?.away?.name || 'Bortelag'} spilte ${homeGoals}-${awayGoals}. `;
  } else if (homeGoals > awayGoals) {
    summary = `${match.teams?.home?.name || 'Hjemmelag'} vant ${homeGoals}-${awayGoals} mot ${match.teams?.away?.name || 'Bortelag'}. `;
  } else {
    summary = `${match.teams?.away?.name || 'Bortelag'} vant ${awayGoals}-${homeGoals} mot ${match.teams?.home?.name || 'Hjemmelag'}. `;
  }

  // Goal scorers - Add null checks
  if (goals && goals.length > 0) {
    const scorers = goals.map(g => g.player?.name || 'Ukjent spiller');
    if (goals.length === 1) {
      summary += `Kampens eneste scoring kom fra ${scorers[0]}`;
      if (goals[0]?.time?.elapsed) summary += ` etter ${goals[0].time.elapsed} minutter.`;
    } else {
      const lastScorer = scorers.pop();
      summary += `Målscorere var ${scorers.join(', ')} og ${lastScorer}.`;
    }
  }

  // Drama indicators - Add null checks
  if (goals?.some(g => g?.time?.elapsed >= 85)) {
    summary += ' Det ble drama på tampen med scoring i sluttminuttene!';
  }

  if (redCards?.length > 0) {
    summary += ` ${redCards.length === 1 ? 'Ett rødt kort' : `${redCards.length} røde kort`} ble vist i kampen.`;
  }

  // Late goals - Add null checks
  const lateGoals = goals?.filter(g => g?.time?.elapsed >= 85) || [];
  if (lateGoals.length > 0) {
    const latestGoal = lateGoals[lateGoals.length - 1];
    if (latestGoal?.player?.name && latestGoal?.time?.elapsed) {
      summary += ` ${latestGoal.player.name} satte inn kampens siste mål ${latestGoal.time.elapsed}. minutt.`;
    }
  }

  return summary;
}

// Add this function to check if match is finished
const isMatchFinished = (status: string) => ['FT', 'AET', 'PEN'].includes(status);

// Keep the helper function
const getTopScorer = (events: any[] = []) => {
  const scorers = (events || [])
    .filter(e => e?.type === 'Goal')
    .reduce((acc: any, goal: any) => {
      const playerName = goal?.player?.name || 'Unknown';
      acc[playerName] = (acc[playerName] || 0) + 1;
      return acc;
    }, {});
  
  const entries = Object.entries(scorers);
  return entries.length > 0 
    ? entries.sort(([,a]: any, [,b]: any) => b - a)[0]
    : ['No scorer', 0];
};

async function fetchTeamColors(homeTeamId: number, awayTeamId: number) {
  try {
    const { data: teamColorsData } = await supabase
      .from('team_colors')
      .select('team_id, primary_color')
      .in('team_id', [homeTeamId, awayTeamId]);

    return {
      home: teamColorsData?.find(t => t.team_id === homeTeamId)?.primary_color || '#0d47a1',
      away: teamColorsData?.find(t => t.team_id === awayTeamId)?.primary_color || '#d32f2f'
    };
  } catch (error) {
    console.error('Error fetching team colors:', error);
    return {
      home: '#0d47a1',
      away: '#d32f2f'
    };
  }
}

// Type for the data structure expected by TeamForm component
interface FormFixture {
  id: number;
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

// --- Function to fetch team form (last 5 finished matches) ---
async function fetchTeamForm(teamId: number, limit: number = 5): Promise<FormFixture[]> {
  if (!teamId) return []; // Add early return if teamId is invalid

  // Define finished statuses (adjust based on your actual data)
  const finishedStatuses = ['FT', 'AET', 'PEN'];

  try {
    const { data, error } = await supabase
      .from('fixtures') // Use your actual table name
      .select('id, date, teams, score, status') // Select only needed fields for form
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`) // Team played home OR away
      .in('status->>short', finishedStatuses) // Match status is one of the finished ones
      .order('date', { ascending: false }) // Most recent first
      .limit(limit);

    if (error) {
      console.error(`Error fetching form for team ${teamId}:`, error);
      return [];
    }

    // Adapt the data structure for the TeamForm component
    const formattedData: FormFixture[] = (data || []).map((fixture: any) => ({
      id: fixture.id,
      teams: { // Assuming 'teams' column has this structure
        home: { id: fixture.teams?.home?.id, name: fixture.teams?.home?.name },
        away: { id: fixture.teams?.away?.id, name: fixture.teams?.away?.name }
      },
      goals: { // Extract fulltime score from 'score' column
        home: fixture.score?.fulltime?.home ?? null,
        away: fixture.score?.fulltime?.away ?? null
      }
    }));

    return formattedData;

  } catch (err) {
    console.error(`Unexpected error fetching form for team ${teamId}:`, err);
    return [];
  }
}

export default async function MatchPage({ params }: { params: { matchId: string } }) {
  const match = await fetchMatchById(params.matchId);

  if (!match) {
    return (
      <div className="max-w-7xl mx-auto px-0 sm:px-0 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Match ID</h1>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  // --- Determine match status ---
  const matchDateString = match.fixture?.date || match.date;
  const matchDate = matchDateString ? new Date(matchDateString) : null;
  const now = new Date();

  const isLive = ['1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE', 'INT', 'SUSP'].includes(match.status?.short || '');
  const isFinished = ['FT', 'AET', 'PEN', 'ABD', 'AWD', 'WO', 'CANC'].includes(match.status?.short || '');
  const isUpcoming = !isLive && !isFinished && matchDate && matchDate > now;
  const matchStatus = match.match_status;
  
  // Fetch team colors
  const teamColors = await fetchTeamColors(match.teams.home.id, match.teams.away.id);
  
  // Fetch Team Form Data only if match is upcoming and team IDs exist
  let homeTeamForm: FormFixture[] = [];
  let awayTeamForm: FormFixture[] = [];
  if (isUpcoming && match.teams?.home?.id && match.teams?.away?.id) {
    console.log(`Match is upcoming (NS). Fetching form for Home: ${match.teams.home.id} and Away: ${match.teams.away.id}`);
    [homeTeamForm, awayTeamForm] = await Promise.all([
      fetchTeamForm(match.teams.home.id),
      fetchTeamForm(match.teams.away.id)
    ]);
     console.log("Fetched Home Form:", homeTeamForm);
     console.log("Fetched Away Form:", awayTeamForm);
  }

  // --- Prepare props for TopScorersComparison ---
  const homeTeamIdForScorers = match?.teams?.home?.id;
  const awayTeamIdForScorers = match?.teams?.away?.id;
  const seasonForScorers = match?.season_year;
  const leagueNameForScorers = match?.league?.name;
  const leagueIdForScorers = match?.league?.id;
  const initialStatusShort = match?.status?.short ?? null;

  // Add a more detailed log BEFORE the conditional rendering
  console.log("DEBUG: [MatchPage] Data for Scorer Comp:", {
      homeTeamId: homeTeamIdForScorers,
      awayTeamId: awayTeamIdForScorers,
      season: seasonForScorers,
      leagueName: leagueNameForScorers,
      leagueId: leagueIdForScorers,
      leagueIdType: typeof leagueIdForScorers,
      initialStatusShort: initialStatusShort
  });

  // Determine if we have enough data to render the component's core data
  const canRenderScorers =
    typeof homeTeamIdForScorers === 'number' &&
    typeof awayTeamIdForScorers === 'number' &&
    typeof seasonForScorers === 'number' &&
    typeof leagueIdForScorers === 'number';

  // --- Parse matchId (fixtureId) ---
  const fixtureId = parseInt(params.matchId, 10); // Use this parsed ID

  try {
    if (!matchDateString) {
      console.error("Match date string is missing or invalid for match ID:", match.id);
    }

    // Ensure team IDs exist before rendering
    if (!match?.teams?.home?.id || !match?.teams?.away?.id) {
       console.error("Missing team IDs in match data");
       // Handle appropriately, maybe return an error or don't render LiveMatchEvents
       return <div>Error: Missing team data for events.</div>;
    }

    // The console.log you added previously should now show season_year
    console.log('DEBUG: TopScorers Props Check:', {
      homeId: match?.teams?.home?.id,
      awayId: match?.teams?.away?.id,
      season: match?.season_year, // <-- Check this value in the console
      shouldRender: !!(match?.teams?.home?.id && match?.teams?.away?.id && match?.season_year)
    });

    // --- Add this log ---
    console.log('DEBUG: [MatchPage] Checking leagueId before passing to MatchCalendar:', match?.league?.id);
    // --- End log ---

    // Determine winner team ID
    const winnerTeamId = isFinished ? (match.goals.home > match.goals.away ? match.teams.home.id : (match.goals.away > match.goals.home ? match.teams.away.id : 0)) : 0;

    return (
      <div className="max-w-7xl mx-auto px-0 sm:px-0 lg:px-8 py-8">
        <PreventAutoScroll />
        
        {/* SEO-friendly heading - visually hidden but accessible */}
        <h1 className="sr-only">
          {match.teams.home.name} mot {match.teams.away.name} - {match.league.name} {formatMatchDateTime(match.date).fullDate}
        </h1>
        
        <div className="flex flex-col md:flex-row gap-8">
          {/* Right column - Match details (now first on mobile) */}
          <div className="w-full md:w-3/4 order-first md:order-last space-y-6">
            {/* Match header - Now with navigation bar */}
            <div className="bg-white dark:bg-[#181818] rounded-none lg:rounded-lg overflow-hidden border-l-0 border-r-0 border-t-0 lg:border-l lg:border-r lg:border-t border-b lg:border border-[#f3f4f6] dark:border-[#232323] w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] -mt-8 lg:w-auto lg:left-auto lg:right-auto lg:ml-0 lg:mr-0 lg:mt-0">
              {/* Navigation bar */}
              <div className="relative flex items-center justify-between px-4 py-4 border-b border-[#f3f4f6] dark:border-[#232323]">
                <Link
                  href="/"
                  className="flex items-center text-sm text-gray-800 dark:text-gray-200 hover:decoration-black dark:hover:decoration-white hover:underline px-2"
                >
                  <div className="bg-gray-100 dark:bg-[#222] p-1.5 rounded-full mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="hidden sm:inline">Kamper</span>
                </Link>

                <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center text-center">
                  <div className="flex items-center whitespace-nowrap">
                    <Image
                      src={`https://media.api-sports.io/football/leagues/${match.league.id}.png`}
                      alt={match.league.name}
                      width={40}
                      height={40}
                      className="mr-2 sm:mr-4"
                    />
                    <Link
                      href={`/fotball/liga/${match.league.name.toLowerCase().replace(/\s+/g, '-')}-${match.league.id}`}
                      className="text-gray-900 dark:text-gray-100 hover:decoration-black dark:hover:decoration-white hover:underline transition-all"
                    >
                      <span className="hidden sm:inline">{match.league.name} {match.league.round}</span>
                    </Link>
                  </div>
                </div>

                <div className="flex items-center">
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors group">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-5 w-5 text-gray-400 group-hover:text-yellow-500 transition-colors" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.519-4.674z" 
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Existing match header content */}
              <div className="p-4 md:p-6">
                {/* Top section: Date, Venue */}
                {/* Center items on mobile, justify-center on sm and up */}
                <div className="flex flex-col sm:flex-row justify-center items-center text-xs text-gray-600 dark:text-gray-400 mb-4 pb-4 space-y-1 sm:space-y-0 sm:space-x-3">
                  {/* Hide Date/Time on mobile */}
                  <span className="hidden sm:flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 opacity-70" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    {formatMatchDateTime(match.date).fullDate} {isUpcoming ? `kl. ${formatMatchDateTime(match.date).time}` : ''}
                  </span>
                  {/* Hide Venue on mobile */}
                  {match.venue?.name && (
                    <span className="hidden sm:flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 opacity-70" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      {match.venue.name}
                    </span>
                  )}
                  {/* Hide Referee on mobile */}
                  {match.referee && (
                    <span className="hidden sm:flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 opacity-70" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      {match.referee}
                    </span>
                  )}
                </div>

                {/* Middle section: Teams and Score */}
                <div className="grid grid-cols-3 items-center gap-4 mb-4">
                  {/* Home team */}
                  <Link
                    href={`/lag/${match.teams.home.name.toLowerCase().replace(/\s+/g, '-')}-${match.teams.home.id}`}
                    className="flex flex-col items-center group hover:opacity-80 transition-opacity text-center"
                  >
                    <div className="relative h-12 w-12 md:h-16 md:w-16 mb-2">
                      <Image
                        src={match.teams.home.logo}
                        alt={match.teams.home.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <span className="font-semibold text-sm md:text-base text-gray-800 dark:text-[#AAAAAA] group-hover:underline line-clamp-2">
                      {match.teams.home.name}
                    </span>
                  </Link>

                  {/* Score/Time section */}
                  <div className="flex flex-col items-center text-center">
                    {isUpcoming ? (
                      <MatchCountdown matchDate={match.date} />
                    ) : isFinished ? ( // Show final score first if finished
                      <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1">
                        {match.goals.home ?? 0} - {match.goals.away ?? 0}
                      </div>
                    ) : ( // Show score for live matches too
                      <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1">
                        {match.goals?.home ?? 0} - {match.goals?.away ?? 0}
                      </div>
                    )}

                    {/* --- Live Timer --- */}
                    {isLive && match.status && match.details_last_updated_at && (
                      <LiveMatchTimer
                        matchId={fixtureId}
                        initialStatus={match.status}
                        initialLastUpdatedAt={match.details_last_updated_at}
                      />
                    )}
                    {/* --- End Live Timer --- */}

                    {isFinished && (
                      <span className="text-gray-500 dark:text-gray-300 text-xs font-medium px-2 py-0.5 rounded-full uppercase">
                        Fulltid
                      </span>
                    )}
                    {match.status?.short === 'PEN' && (
                      <span className="text-gray-500 dark:text-gray-300 text-xs font-medium mt-1">
                        (Straffer)
                      </span>
                    )}
                    {match.status?.short === 'AET' && (
                      <span className="text-gray-500 dark:text-gray-300 text-xs font-medium mt-1">
                        (Ekstraomg.)
                      </span>
                    )}
                  </div>

                  {/* Away team */}
                  <Link
                    href={`/lag/${match.teams.away.name.toLowerCase().replace(/\s+/g, '-')}-${match.teams.away.id}`}
                    className="flex flex-col items-center group hover:opacity-80 transition-opacity text-center"
                  >
                    <div className="relative h-12 w-12 md:h-16 md:w-16 mb-2">
                      <Image
                        src={match.teams.away.logo}
                        alt={match.teams.away.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <span className="font-semibold text-sm md:text-base text-gray-800 dark:text-[#AAAAAA] group-hover:underline line-clamp-2">
                      {match.teams.away.name}
                    </span>
                  </Link>
                </div>

                {/* --- Goal Events (Live & Finished) --- */}
                {(isLive || isFinished) && match.event_data && match.event_data.some(event => event?.type === 'Goal') && (
                  <div className="grid grid-cols-3 gap-4 w-full max-w-md mt-4 text-xs mx-auto">
                    {/* Home Team Events */}
                    <div className="space-y-2.5 text-right">
                      {(match.event_data || [])
                        .filter(event =>
                          event?.team?.id === match.teams?.home?.id &&
                          event?.type === 'Goal'
                        )
                        .sort((a, b) => ((a?.time?.elapsed || 0) + (a?.time?.extra || 0)) - ((b?.time?.elapsed || 0) + (b?.time?.extra || 0)))
                        .map((event, index) => (
                          <div key={`home-${index}`} className="flex items-center justify-end h-5">
                            <span className="truncate dark:text-gray-200">{event.player?.name}</span>
                            <span className="text-gray-700 dark:text-gray-400 font-semibold whitespace-nowrap ml-1">
                              {event.time?.elapsed}'
                              {event.time?.extra && `+${event.time.extra}`}
                            </span>
                          </div>
                        ))}
                    </div>

                    {/* Goal Icon Column */}
                    <div className="flex flex-col items-center">
                      {match.event_data.some(event => event.type === 'Goal') && (
                        <>
                          <Image
                            src="/images/channels/ball.svg"
                            alt="Goal"
                            width={14}
                            height={14}
                            className="opacity-75 dark:hidden"
                          />
                          <Image
                            src="/images/whiteball.svg"
                            alt="Goal"
                            width={14}
                            height={14}
                            className="opacity-75 hidden dark:block"
                          />
                        </>
                      )}
                    </div>

                    {/* Away Team Events */}
                    <div className="space-y-2.5 text-left">
                      {(match.event_data || [])
                        .filter(event =>
                          event?.team?.id === match.teams?.away?.id &&
                          event?.type === 'Goal'
                        )
                        .sort((a, b) => ((a?.time?.elapsed || 0) + (a?.time?.extra || 0)) - ((b?.time?.elapsed || 0) + (b?.time?.extra || 0)))
                        .map((event, index) => (
                          <div key={`away-${index}`} className="flex items-center h-5">
                            <span className="text-gray-700 dark:text-gray-400 font-semibold whitespace-nowrap mr-1">
                              {event.time?.elapsed}'
                              {event.time?.extra && `+${event.time.extra}`}
                            </span>
                            <span className="truncate dark:text-gray-200">{event.player?.name}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                {/* --- End Goal Events --- */}
              </div>

              {/* Add the new TopSectionTabs component */}
              <TopSectionTabs match={match} />
            </div>

            {/* Match details card - Only show for upcoming or finished matches */}
            {(isUpcoming || (isFinished && !isLive)) && (
              <div className="bg-white dark:bg-[#181818] rounded-lg border border-[#f3f4f6] dark:border-[#232323] p-6" data-tab-content="fakta">
                {/* Only include the non-table content here */}
                {isUpcoming && (
                  <>
                    <h3 className="text-lg font-semibold mb-4 text-[#1f2937] dark:text-gray-100 pb-2 border-b border-[#f3f4f6] dark:border-[#2c2c2c]">
                      Kampinformasjon
                    </h3>
                    <p className="text-sm text-[#656565] dark:text-gray-300 leading-relaxed">
                      <span className="dark:text-gray-100">{match.teams?.home?.name || 'Hjemmelag'}</span> møter{' '}
                      <span className="dark:text-gray-100">{match.teams?.away?.name || 'Bortelag'}</span>
                      {match.league?.round && ` i ${match.league.round}`}
                      {match.league?.name && ` av ${match.league.name}`}.
                      Kampen spilles
                      {match.venue?.name && <> på <span className="dark:text-gray-100">{match.venue.name}</span></>}
                      {' '}{formatMatchDateTime(match.date).dayName}
                      {' '}{formatMatchDateTime(match.date).fullDate}
                      {isUpcoming ? ` kl. ${formatMatchDateTime(match.date).time}` : ''}.
                    </p>
                  </>
                )}
                
                {isFinished && !isLive && (
                  <MatchSummaryCard
                    match={match}
                  />
                )}
              </div>
            )}
            
            {/* === Live Commentary Preview === */}
            {isLive && (
              <div data-tab-content="fakta">
                <LiveCommentaryPreview
                  matchId={fixtureId}
                  isLive={isLive}
                />
              </div>
            )}

            {/* === Match Stats Snippet === */}
            {!isUpcoming && (match.fixture_statistics != null || match.ball_possession != null) && (
              <div data-tab-content="fakta">
                <MatchStatsSnippet
                  matchId={fixtureId}
                  fixtureStatistics={match.fixture_statistics}
                  teamColors={teamColors}
                  initialEvents={match.event_data || []}
                  matchStatusShort={match.status?.short}
                  matchStartDate={match.date}
                  lastUpdatedAt={match.details_last_updated_at}
                  ballPossession={match.ball_possession ?? undefined}
                />
              </div>
            )}

            {/* Show FixtureNews after MatchStatsSnippet for finished matches */}
            {isFinished && (
              <div data-tab-content="fakta">
                <FixtureNews leagueId={match.league.id} leagueName={match.league.name} isFinished={isFinished} />
              </div>
            )}

            {/* Live Match Events - Only visible on Fakta tab */}
            {(isLive || isFinished) && (
              <div data-tab-content="fakta" className="border border-[#f3f4f6] dark:border-[#232323] rounded-lg overflow-hidden">
                <LiveMatchEvents
                  matchId={match.id}
                  initialEvents={match.event_data || []}
                  homeTeamId={match.teams?.home?.id || 0}
                  awayTeamId={match.teams?.away?.id || 0}
                  isLive={isLive}
                />
              </div>
            )}

            {/* === Horizontal Lineup Component === */}
            {match.lineups && Array.isArray(match.lineups) && match.lineups.length >= 2 && (
              <div data-tab-content="fakta">
                <HorizontalLineupComponent
                  lineups={match.lineups}
                  playerStats={match.player_statistics || []}
                  eventData={match.event_data || []}
                />
              </div>
            )}

            {/* Conditionally render TeamForm if match is upcoming */}
            {isUpcoming && (
              <div data-tab-content="fakta">
                <TeamForm
                  homeForm={homeTeamForm}
                  awayForm={awayTeamForm}
                  homeTeamId={match.teams.home.id}
                  awayTeamId={match.teams.away.id}
                />
              </div>
            )}

            {/* TeamStandings for tabell tab */}
            <div data-tab-content="tabell" className="bg-white dark:bg-[#181818] rounded-lg p-6 border border-[#f3f4f6] dark:border-[#232323]">
              <TeamStandings
                teamId={match.teams.home.id}
                teamName={match.teams.home.name}
                seasons={[seasonForScorers]}
                hideSeasonSelector={true}
                highlightTeams={[match.teams.home.id, match.teams.away.id]}
                leagueId={match.league.id}
                embedded={true}
                forcedLeagueDetails={{
                  id: match.league.id,
                  name: match.league.name || 'Ukjent Liga',
                  logo: match.league.logo || '/images/league-placeholder.png'
                }}
              />
            </div>

            {/* MatchStats for statistikk tab */}
            {match.player_statistics && Array.isArray(match.player_statistics) && match.player_statistics.length > 0 && (
              <div data-tab-content="statistikk" className="bg-white dark:bg-[#181818] rounded-lg p-6 border border-[#f3f4f6] dark:border-[#232323]">
                <MatchStats match={match} teamColors={teamColors} />
              </div>
            )}

            {/* HeadToHeadTab for lag-vs-lag tab */}
            <div data-tab-content="lag-vs-lag" className="bg-white dark:bg-[#181818] rounded-lg p-6 border border-[#f3f4f6] dark:border-[#232323]">
              <HeadToHeadTab match={match} teamColors={teamColors} />
            </div>

            {/* MatchCommentary for referat tab */}
            <div data-tab-content="referat" className="bg-white dark:bg-[#181818] rounded-lg p-6 border border-[#f3f4f6] dark:border-[#232323]">
              <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Kampreferat</h2>
              <MatchCommentary match={match} />
            </div>

            {/* HorizontalLineupComponent for lag tab */}
            {match.lineups && Array.isArray(match.lineups) && match.lineups.length >= 2 && (
              <div data-tab-content="lag">
                <HorizontalLineupComponent 
                  lineups={match.lineups}
                  playerStats={match.player_statistics || []}
                  eventData={match.event_data || []}
                  teamColors={teamColors}
                />
              </div>
            )}

          </div>

          
          
          {/* Left column - Sidebar (now second on mobile) */}
          <div className="w-full md:w-1/4 order-last md:order-first space-y-6">

            {/* === MatchHighlights component === */}
            {isFinished && match.teams?.home?.name && match.teams?.away?.name && match.league?.id && match.date && (
              <MatchHighlights
                matchId={fixtureId}
                initialYoutubeHighlightId={match.youtube_highlight_id || null}
                homeTeamName={match.teams.home.name}
                awayTeamName={match.teams.away.name}
                homeTeamId={match.teams.home.id}
                awayTeamId={match.teams.away.id}
                leagueId={match.league.id}
                matchDate={match.date}
                isFinished={isFinished}
                winnerTeamId={winnerTeamId}
              />
            )}
            {/* === End MatchHighlights component === */}

            {/* === Top Scorers Component === */}
            {canRenderScorers ? (
              <div>
                <TopScorersComparison
                  homeTeamId={homeTeamIdForScorers}
                  awayTeamId={awayTeamIdForScorers}
                  season={seasonForScorers}
                  leagueName={leagueNameForScorers}
                  leagueId={leagueIdForScorers}
                  initialFixtureStatusShort={initialStatusShort}
                  isFinished={isFinished}
                  matchId={fixtureId}
                />
              </div>
            ) : (
              () => {
                console.log("DEBUG: [MatchPage] Skipping TopScorersComparison render because required data is missing or invalid.", {
                  homeTeamIdForScorers, awayTeamIdForScorers, seasonForScorers, leagueIdForScorers
                });
                return null;
              }
            )()}
            {/* ========================================== */}

            {/* === LeagueChannels - Conditionally Rendered === */}
            {/* Only show if the match is NOT finished */}
            {!isFinished && <LeagueChannels leagueId={leagueIdForScorers} />}
            {/* ============================================ */}

            {/* Match Calendar - Pass whether TopScorers is rendered */}
            <MatchCalendar
              leagueId={match.league.id}
              currentMatchId={params.matchId}
              hasTopScorersAbove={canRenderScorers}
            />
          </div>
        </div>
        <TeamColorExtractor 
          homeTeamLogo={match.teams.home.logo}
          awayTeamLogo={match.teams.away.logo}
          homeTeamId={match.teams.home.id}
          awayTeamId={match.teams.away.id}
        />
      </div>
    );
  } catch (error) {
    console.error('🔴 Detailed error in MatchPage:', error);
    return (
      <div className="max-w-7xl mx-auto px-0 sm:px-0 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Match</h1>
          <p className="text-gray-700">We couldn&apos;t load the match details. Please try again later.</p>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }
}