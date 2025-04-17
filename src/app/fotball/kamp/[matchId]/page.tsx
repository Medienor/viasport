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

export const revalidate = 86400;

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
        commentary_path
      `)
      .eq('id', matchId)
      .single();

    if (error) throw error;
    return match;
  } catch (error) {
    console.error('🔴 Error:', error);
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
  const events = match.event_data;
  const goals = events.filter(e => e.type === 'Goal');
  const cards = events.filter(e => e.type === 'Card');
  const redCards = cards.filter(e => e.detail === 'Red Card');
  
  let summary = '';
  
  // Basic result
  summary = `${match.teams.home.name} vant ${match.goals.home}-${match.goals.away} mot ${match.teams.away.name}. `;
  
  if (match.goals.home === match.goals.away) {
    summary = `${match.teams.home.name} og ${match.teams.away.name} spilte ${match.goals.home}-${match.goals.away}. `;
  } else if (match.goals.home < match.goals.away) {
    summary = `${match.teams.away.name} vant ${match.goals.away}-${match.goals.home} mot ${match.teams.home.name}. `;
  }

  // Goal scorers
  if (goals.length > 0) {
    const scorers = goals.map(g => g.player.name);
    if (goals.length === 1) {
      summary += `Kampens eneste scoring kom fra ${scorers[0]}`;
      if (goals[0].time.elapsed) summary += ` etter ${goals[0].time.elapsed} minutter.`;
    } else {
      const lastScorer = scorers.pop();
      summary += `Målscorere var ${scorers.join(', ')} og ${lastScorer}.`;
    }
  }

  // Drama indicators
  if (goals.some(g => g.time.elapsed >= 85)) {
    summary += ' Det ble drama på tampen med scoring i sluttminuttene!';
  }

  if (redCards.length > 0) {
    summary += ` ${redCards.length === 1 ? 'Ett rødt kort' : `${redCards.length} røde kort`} ble vist i kampen.`;
  }

  // Late goals
  const lateGoals = goals.filter(g => g.time.elapsed >= 85);
  if (lateGoals.length > 0) {
    const latestGoal = lateGoals[lateGoals.length - 1];
    summary += ` ${latestGoal.player.name} satte inn kampens siste mål ${latestGoal.time.elapsed}. minutt.`;
  }

  return summary;
}

// Add this function to check if match is finished
const isMatchFinished = (status: string) => ['FT', 'AET', 'PEN'].includes(status);

// Keep the helper function
const getTopScorer = (events: any[]) => {
  const scorers = events
    .filter(e => e.type === 'Goal')
    .reduce((acc: any, goal: any) => {
      acc[goal.player.name] = (acc[goal.player.name] || 0) + 1;
      return acc;
    }, {});
  
  return Object.entries(scorers)
    .sort(([,a]: any, [,b]: any) => b - a)[0];
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

  try {
    if (!matchDateString) {
      console.error("Match date string is missing or invalid for match ID:", match.id);
    }

    return (
      <div className="max-w-7xl mx-auto px-0 sm:px-0 lg:px-8 py-8">
        <PreventAutoScroll />
        <div className="flex flex-col md:flex-row gap-8">
          {/* Right column - Match details (now first on mobile) */}
          <div className="w-full md:w-3/4 order-first md:order-last space-y-6">
            {/* Match header - Now with navigation bar */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Navigation bar */}
              <div className="relative flex items-center justify-between px-4 py-4 border-b border-gray-200">
                <Link
                  href="/"
                  className="flex items-center text-sm text-gray-800 hover:decoration-black hover:underline px-2"
                >
                  <div className="bg-gray-100 p-1.5 rounded-full mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  {/* Hide "Kamper" text on mobile */}
                  <span className="hidden sm:inline">Kamper</span>
                </Link>

                <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center text-center">
                  <div className="flex items-center whitespace-nowrap">
                    <Image
                      src={`https://media.api-sports.io/football/leagues/${match.league.id}.png`}
                      alt={match.league.name}
                      width={40}
                      height={40}
                      className="mr-2 sm:mr-4" // Adjusted margin for mobile
                    />
                    <Link
                      href={`/fotball/liga/${match.league.name.toLowerCase().replace(/\s+/g, '-')}-${match.league.id}`}
                      className="text-gray-900 hover:decoration-black hover:underline transition-all"
                    >
                      {/* Hide League Name and Round on mobile */}
                      <span className="hidden sm:inline">{match.league.name} {match.league.round}</span>
                      {/* Show only League Name on mobile if needed, or nothing */}
                      {/* <span className="sm:hidden">{match.league.name}</span> */}
                    </Link>
                  </div>
                </div>

                {/* Hide FollowButton on mobile */}
                <div className="hidden sm:block">
                  <FollowButton />
                </div>
              </div>

              {/* Existing match header content */}
              <div className="p-4 md:p-6">
                {/* Top section: Date, Venue */}
                {/* Center items on mobile, justify-center on sm and up */}
                <div className="flex flex-col sm:flex-row justify-center items-center text-xs text-gray-600 mb-4 pb-4 space-y-1 sm:space-y-0 sm:space-x-3">
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
                    <span className="font-semibold text-sm md:text-base text-gray-800 group-hover:underline line-clamp-2">
                      {match.teams.home.name}
                    </span>
                  </Link>

                  {/* Score/Time section */}
                  <div className="flex flex-col items-center text-center">
                    {isUpcoming ? (
                      <MatchCountdown matchDate={match.date} />
                    ) : isFinished ? ( // Show final score first if finished
                       <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">
                         {match.goals.home ?? 0} - {match.goals.away ?? 0}
                       </div>
                    ) : ( // Show score for live matches too
                       <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">
                         {match.goals?.home ?? 0} - {match.goals?.away ?? 0}
                       </div>
                    )}

                    {/* --- Live Timer --- */}
                    {isLive && matchDateString && (
                      <LiveMatchTimer
                        matchStatusShort={match.status?.short}
                        matchStartDate={matchDateString}
                      />
                    )}
                    {/* --- End Live Timer --- */}

                    {isFinished && (
                      <span className="text-gray-500 text-xs font-medium px-2 py-0.5 rounded-full uppercase">
                        Fulltid
                      </span>
                    )}
                     {match.status?.short === 'PEN' && (
                       <span className="text-gray-500 text-xs font-medium mt-1">
                         (Straffer)
                       </span>
                     )}
                     {match.status?.short === 'AET' && (
                       <span className="text-gray-500 text-xs font-medium mt-1">
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
                    <span className="font-semibold text-sm md:text-base text-gray-800 group-hover:underline line-clamp-2">
                      {match.teams.away.name}
                    </span>
                  </Link>
                </div>

                {/* Bottom section: Events (only for finished matches) */}
                {isFinished && match.event_data && match.event_data.length > 0 && (
                  <div className="grid grid-cols-[1fr_40px_1fr] items-start gap-4 text-xs md:text-sm text-gray-700 pt-4">
                    {/* Home Team Events */}
                    <div className="space-y-2.5 text-right">
                      {match.event_data
                        .filter(event => 
                          event.team.id === match.teams.home.id && 
                          event.type === 'Goal'
                        )
                        .sort((a, b) => (a.time.elapsed + (a.time.extra || 0)) - (b.time.elapsed + (b.time.extra || 0)))
                        .map((event, index) => (
                          <div key={`home-${index}`} className="flex items-center justify-end h-5">
                            <span className="truncate">{event.player.name}</span>
                            <span className="text-gray-700 font-semibold whitespace-nowrap ml-1">
                              {event.time.elapsed}'
                              {event.time.extra ? `+${event.time.extra}` : ''}
                            </span>
                          </div>
                        ))}
                    </div>

                    {/* Center Icons Column */}
                    <div className="flex flex-col items-center">
                      {match.event_data.some(event => event.type === 'Goal') && (
                        <Image
                          src="/images/channels/ball.svg"
                          alt="Goal"
                          width={14}
                          height={14}
                          className="opacity-75"
                        />
                      )}
                    </div>

                    {/* Away Team Events */}
                    <div className="space-y-2.5 text-left">
                      {match.event_data
                        .filter(event => 
                          event.team.id === match.teams.away.id && 
                          event.type === 'Goal'
                        )
                        .sort((a, b) => (a.time.elapsed + (a.time.extra || 0)) - (b.time.elapsed + (b.time.extra || 0)))
                        .map((event, index) => (
                          <div key={`away-${index}`} className="flex items-center h-5">
                            <span className="text-gray-700 font-semibold whitespace-nowrap mr-1">
                              {event.time.elapsed}'
                              {event.time.extra ? `+${event.time.extra}` : ''}
                            </span>
                            <span className="truncate">{event.player.name}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            

            
            
            
            {/* Match details card with tabs */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <MatchTabs 
                match={match}
                activeTab="facts"
                teamColors={teamColors}
              >
                {/* Only include the non-table content here */}
                {isUpcoming && (
                  <>
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 pb-2 border-b border-gray-200">
                      Kampinformasjon
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      <span className="font-semibold">{match.teams?.home?.name || 'Hjemmelag'}</span> møter{' '}
                      <span className="font-semibold">{match.teams?.away?.name || 'Bortelag'}</span>
                      {match.league?.round && ` i ${match.league.round}`}
                      {match.league?.name && ` av ${match.league.name}`}.
                      Kampen spilles
                      {match.venue?.name && <> på <span className="font-semibold">{match.venue.name}</span></>}
                      {' '}{formatMatchDateTime(match.date).dayName}
                      {' '}{formatMatchDateTime(match.date).fullDate}
                      {isUpcoming ? ` kl. ${formatMatchDateTime(match.date).time}` : ''}.
                    </p>
                  </>
                )}
                
                {isLive && (
                  <div>Live Match Details</div>
                )}
                
                {isFinished && (
                  <>
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 pb-2 border-b border-gray-200">
                      Kampens hendelser
                    </h3>
                    
                    {/* Match summary */}
                    <p className="text-lg text-gray-800 mb-6">
                      {generateMatchSummary(match)}
                    </p>
                    
                    {/* Match events section */}
                    {match.event_data && match.event_data.length > 0 && (
                      <div className="mt-6">
                        <div className="relative">
                          {/* Timeline line */}
                          <div className="absolute left-[60px] md:left-[100px] w-px h-full bg-gray-200" />
                          
                          <div className="space-y-2">
                            {/* Kickoff event */}
                            <div className="grid grid-cols-[60px_24px_1fr] md:grid-cols-[100px_24px_1fr] items-center gap-2 bg-white rounded-lg p-2">
                              <div className="text-sm text-gray-500">0'</div>
                              <div className="flex justify-center">
                                <Image
                                  src="/images/channels/whistle.svg"
                                  alt="Kickoff"
                                  width={14}
                                  height={14}
                                  className="opacity-75"
                                />
                              </div>
                              <span className="text-sm text-gray-500">Avspark</span>
                            </div>

                            {/* Match events */}
                            {match.event_data
                              .sort((a, b) => (a.time.elapsed + (a.time.extra || 0)) - (b.time.elapsed + (b.time.extra || 0)))
                              .map((event, index) => (
                                <div 
                                  key={index} 
                                  className="grid grid-cols-[60px_24px_1fr] md:grid-cols-[100px_24px_1fr] items-center gap-2 bg-white hover:bg-gray-50 rounded-lg p-2"
                                >
                                  {/* Time column */}
                                  <div className="text-sm text-gray-500">
                                    {event.time.elapsed}'
                                    {event.time.extra && `+${event.time.extra}`}
                                  </div>

                                  {/* Icon column */}
                                  <div className="flex justify-center">
                                    {event.type === 'Goal' && (
                                      <Image
                                        src="/images/channels/ball.svg"
                                        alt="Goal"
                                        width={14}
                                        height={14}
                                        className="opacity-75"
                                      />
                                    )}
                                    {event.type === 'Card' && (
                                      <Image
                                        src={event.detail === 'Yellow Card' 
                                          ? "/images/channels/yellow-card.svg" 
                                          : "/images/channels/red.svg"}
                                        alt={event.detail}
                                        width={14}
                                        height={14}
                                        className="opacity-75"
                                      />
                                    )}
                                  </div>

                                  {/* Event details column */}
                                  <div className="min-w-0">
                                    {event.type === 'Goal' && (
                                      <div className="flex flex-col md:flex-row md:items-center gap-2">
                                        <div className="flex items-center gap-2">
                                          {event.player.id && (
                                            <div className="relative w-5 h-5 flex-shrink-0">
                                              <Image
                                                src={`https://media.api-sports.io/football/players/${event.player.id}.png`}
                                                alt={event.player.name}
                                                fill
                                                className="object-cover rounded-full"
                                              />
                                            </div>
                                          )}
                                          <Link 
                                            href={`/spillerprofil/${event.player.id}`}
                                            className="text-sm font-medium hover:text-blue-600 transition-colors"
                                          >
                                            {event.player.name}
                                          </Link>
                                        </div>
                                        {event.assist?.name && (
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-400 hidden md:inline">•</span>
                                            <Link 
                                              href={`/spillerprofil/${event.assist.id}`}
                                              className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                                            >
                                              {event.assist.name}
                                            </Link>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {event.type === 'subst' && (
                                      <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                          <div className="relative w-5 h-5 flex-shrink-0">
                                            <Image
                                              src={`https://media.api-sports.io/football/players/${event.assist.id}.png`}
                                              alt={event.assist.name}
                                              fill
                                              className="object-cover rounded-full"
                                            />
                                          </div>
                                          <Link 
                                            href={`/spillerprofil/${event.assist.id}`}
                                            className="text-sm text-green-600 hover:text-green-700 transition-colors"
                                          >
                                            {event.assist.name}
                                          </Link>
                                          <span className="text-xs text-green-600">(inn)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div className="relative w-5 h-5 flex-shrink-0">
                                            <Image
                                              src={`https://media.api-sports.io/football/players/${event.player.id}.png`}
                                              alt={event.player.name}
                                              fill
                                              className="object-cover rounded-full"
                                            />
                                          </div>
                                          <Link 
                                            href={`/spillerprofil/${event.player.id}`}
                                            className="text-sm text-red-600 hover:text-red-700 transition-colors"
                                          >
                                            {event.player.name}
                                          </Link>
                                          <span className="text-xs text-red-600">(ut)</span>
                                        </div>
                                      </div>
                                    )}

                                    {event.type === 'Card' && (
                                      <div className="flex flex-col md:flex-row gap-2">
                                        <div className="flex items-center gap-2">
                                          {event.player.id && (
                                            <div className="relative w-5 h-5 flex-shrink-0">
                                              <Image
                                                src={`https://media.api-sports.io/football/players/${event.player.id}.png`}
                                                alt={event.player.name}
                                                fill
                                                className="object-cover rounded-full"
                                              />
                                            </div>
                                          )}
                                          <Link 
                                            href={`/spillerprofil/${event.player.id}`}
                                            className="text-sm font-medium hover:text-blue-600 transition-colors"
                                          >
                                            {event.player.name}
                                          </Link>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className={`text-sm ${
                                            event.detail === 'Yellow Card' ? 'text-yellow-600' : 'text-red-600'
                                          }`}>
                                            {event.detail === 'Yellow Card' ? 'Gult kort' : 'Rødt kort'}
                                          </span>
                                          {event.comments && (
                                            <span className="text-sm text-gray-500 italic">
                                              {event.comments}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}

                            {/* Final whistle */}
                            <div className="grid grid-cols-[60px_24px_1fr] md:grid-cols-[100px_24px_1fr] items-center gap-2 bg-white rounded-lg p-2">
                              <div className="text-sm text-gray-500">90'</div>
                              <div className="flex justify-center">
                                <Image
                                  src="/images/channels/whistle.svg"
                                  alt="Final whistle"
                                  width={14}
                                  height={14}
                                  className="opacity-75"
                                />
                              </div>
                              <span className="text-sm text-gray-500">Kampslutt</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* About the match */}
                    <div className="bg-white rounded-lg mt-6">
                      <h2 className="text-lg font-semibold mb-4">Om kampen</h2>
                      
                      <div className="space-y-4 text-gray-700">
                        {/* Match info paragraph */}
                        <p>
                          {match.teams.home.name} spiller hjemme mot {match.teams.away.name} på{' '}
                          {match.venue?.name || 'ukjent arena'} {formatMatchDateTime(match.date).dayName}{' '}
                          {formatMatchDateTime(match.date).fullDate} kl.{' '}
                          {formatMatchDateTime(match.date).time}. 
                          {match.league.round && (
                            <> Dette er {match.league.round} av {match.league.name}.</>
                          )}
                        </p>

                        {/* Lineups info */}
                        <p>
                          Forventet lagoppstilling blir tilgjengelig noen dager før kampstart, 
                          mens den faktiske lagoppstillingen blir publisert cirka én time før avspark.
                        </p>

                        {/* Streaming info */}
                        {getStreamingProviders(match.league.id).length > 0 && (
                          <p>
                            Se kampen på{' '}
                            {getStreamingProviders(match.league.id)
                              .map(provider => provider.name)
                              .join(' / ')}.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Q&A accordion */}
                    {match.match_status === 'FT' && (
                      <div className="bg-white rounded-lg mt-6">
                        <h2 className="text-lg font-semibold mb-4">Spørsmål og svar</h2>
                        
                        <div className="divide-y">
                          {/* Winner Question */}
                          <details className="group">
                            <summary className="flex justify-between items-center cursor-pointer p-4 hover:bg-gray-50">
                              <span className="font-medium">
                                Hvem vant mellom {match.teams.home.name} og {match.teams.away.name} {formatMatchDateTime(match.date).fullDate}?
                              </span>
                              <svg className="w-5 h-5 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </summary>
                            <div className="p-4 bg-gray-50">
                              {match.goals.home > match.goals.away ? (
                                <p>{match.teams.home.name} vant {match.goals.home}-{match.goals.away} mot {match.teams.away.name}.</p>
                              ) : match.goals.home < match.goals.away ? (
                                <p>{match.teams.away.name} vant {match.goals.away}-{match.goals.home} mot {match.teams.home.name}.</p>
                              ) : (
                                <p>Kampen endte uavgjort {match.goals.home}-{match.goals.away}.</p>
                              )}
                            </div>
                          </details>

                          {/* Top Scorer Question */}
                          {match.event_data && match.event_data.some(e => e.type === 'Goal') && (
                            <details className="group">
                              <summary className="flex justify-between items-center cursor-pointer p-4 hover:bg-gray-50">
                                <span className="font-medium">Hvilken spiller scoret flest mål i kampen?</span>
                                <svg className="w-5 h-5 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </summary>
                              <div className="p-4 bg-gray-50">
                                {(() => {
                                  const [topScorer, goals] = getTopScorer(match.event_data);
                                  return (
                                    <p>
                                      {topScorer} scoret {goals} {goals === 1 ? 'mål' : 'mål'} i kampen.
                                    </p>
                                  );
                                })()}
                              </div>
                            </details>
                          )}

                          {/* All Scorers Question */}
                          {match.event_data && match.event_data.some(e => e.type === 'Goal') && (
                            <details className="group">
                              <summary className="flex justify-between items-center cursor-pointer p-4 hover:bg-gray-50">
                                <span className="font-medium">Hvem scoret målene i denne kampen?</span>
                                <svg className="w-5 h-5 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </summary>
                              <div className="p-4 bg-gray-50">
                                <div className="space-y-2">
                                  {match.event_data
                                    .filter(e => e.type === 'Goal')
                                    .sort((a, b) => a.time.elapsed - b.time.elapsed)
                                    .map((goal, index) => (
                                      <p key={index}>
                                        {goal.time.elapsed}' - {goal.player.name}
                                        {goal.assist && ` (Assist: ${goal.assist.name})`}
                                      </p>
                                    ))}
                                </div>
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </MatchTabs>
            </div>

            {/* Conditionally render TeamForm if match is upcoming - MOVED HERE */}
            {isUpcoming && (
              <TeamForm
                homeForm={homeTeamForm}
                awayForm={awayTeamForm}
                homeTeamId={match.teams.home.id}
                awayTeamId={match.teams.away.id}
              />
            )}
            
          </div>

          
          
          {/* Left column - Calendar only (now second on mobile) */}
          <div className="w-full md:w-1/4 order-last md:order-first space-y-6">
            {/* === Add MatchHighlights component here === */}
            {/* It will only render content if isFinished is true and a video is found */}
            <MatchHighlights
              homeTeamName={match.teams.home.name}
              awayTeamName={match.teams.away.name}
              homeTeamId={match.teams.home.id} // Pass IDs for potential future use
              awayTeamId={match.teams.away.id}
              leagueId={match.league.id}
              matchDate={match.date} // Pass the ISO date string
              isFinished={isFinished} // Pass the flag
            />
            {/* === End MatchHighlights component === */}
            <MatchCalendar currentMatchId={params.matchId} />
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