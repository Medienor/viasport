import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import type { Fixture } from '@/types/fixtures';
import MatchCalendar from '@/app/components/MatchCalendar';
import PreventAutoScroll from '@/app/components/PreventAutoScroll';
import HeadToHeadFixtures from '@/app/components/HeadToHeadFixtures';
import MatchHighlights from '@/app/components/MatchHighlights';
import { formatMatchDateTime } from '@/utils/dateUtils';

export const revalidate = 86400; // 24 hours cache

// Initialize Supabase client with the working configuration
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
        event_data,
        event_goals,
        event_cards_yellow,
        event_cards_red,
        event_substitutions,
        fixture_statistics,
        head_to_head
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

export default async function MatchPage({ params }: { params: { matchId: string } }) {
  // Await the params
  const resolvedParams = await params;
  console.log('🔵 Rendering MatchPage with params:', resolvedParams);
  
  if (!resolvedParams?.matchId) {
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

  try {
    console.log('🔵 Fetching match data...');
    const match = await fetchMatchById(resolvedParams.matchId);
    console.log('✅ Match data received:', match);
    
    if (!match) {
      throw new Error('Match not found');
    }

    const isUpcoming = match.match_status === 'NS' || match.match_status === 'TBD';
    const isLive = ['LIVE', '1H', '2H', 'HT'].includes(match.match_status);
    const isFinished = ['FT', 'AET', 'PEN'].includes(match.match_status);
    const matchStatus = match.match_status;
    
    return (
      <div className="max-w-7xl mx-auto px-0 sm:px-0 lg:px-8 py-8">
        <PreventAutoScroll />
        <div className="flex flex-col md:flex-row gap-8">
          {/* Right column - Match details (now first on mobile) */}
          <div className="w-full md:w-2/3 order-first md:order-last space-y-6">
            {/* Match header with background image */}
            <div 
              className="bg-white rounded-lg shadow-md overflow-hidden"
              style={{ 
                backgroundImage: "url('/bg-fotball.jpg')",
                backgroundSize: "cover",
                backgroundPosition: "center"
              }}
            >
              {/* League info */}
              <div className="p-4">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center text-white">
                  {/* League on left for desktop, centered for mobile */}
                  <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left">
                    <div className="flex items-center mb-1 md:mb-0">
                      <div className="relative h-6 w-6 mr-2">
                        <Image 
                          src={match.league.logo}
                          alt={match.league.name}
                          fill
                          className="object-contain"
                        />
                      </div>
                      <span className="font-medium text-sm">{match.league.name}</span>
                    </div>
                  </div>

                  {/* Venue on right for desktop, below league for mobile */}
                  <span className="text-sm truncate opacity-90 text-center md:text-right">
                    {match.venue?.name}, {match.venue?.city}
                  </span>
                </div>
              </div>
              
              {/* Teams and score */}
              <div className="p-6 text-white">
                <div className="grid grid-cols-7 items-center gap-4">
                  {/* Home team */}
                  <div className="col-span-2">
                    <Link 
                      href={`/lag/${match.teams.home.name.toLowerCase().replace(/\s+/g, '-')}-${match.teams.home.id}`}
                      className="flex flex-col items-center group hover:opacity-90 transition-opacity"
                    >
                      <div className="relative h-12 w-12 md:h-16 md:w-16 mb-2">
                        <Image 
                          src={match.teams.home.logo}
                          alt={match.teams.home.name}
                          fill
                          className="object-contain"
                        />
                      </div>
                      <span className="font-bold text-base md:text-lg text-center line-clamp-2 group-hover:underline">
                        {match.teams.home.name}
                      </span>
                    </Link>
                  </div>
                  
                  {/* Score/Time section */}
                  <div className="col-span-3 flex justify-center">
                    {isUpcoming ? (
                      <div className="flex flex-col items-center">
                        <div className="text-2xl md:text-4xl font-bold mb-1">
                          {formatMatchDateTime(match.date).time}
                        </div>
                        <div className="text-xs md:text-sm opacity-90 whitespace-nowrap">
                          {formatMatchDateTime(match.date).fullDate}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="text-2xl md:text-4xl font-bold mb-2 whitespace-nowrap">
                          {match.goals.home ?? 0} - {match.goals.away ?? 0}
                        </div>
                        {isLive && (
                          <span className="bg-red-600 text-white text-xs font-medium px-3 py-0.5 rounded-full flex items-center justify-center whitespace-nowrap">
                            <span className="inline-block w-1.5 h-1.5 bg-white bg-opacity-70 rounded-full animate-pulse mr-1.5"></span>
                            {match.status?.elapsed || '0'}&apos;
                          </span>
                        )}
                        {isFinished && (
                          <span className="text-white text-xs font-medium px-3 py-0.5 rounded-full">
                            FERDIG
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Away team */}
                  <div className="col-span-2">
                    <Link 
                      href={`/lag/${match.teams.away.name.toLowerCase().replace(/\s+/g, '-')}-${match.teams.away.id}`}
                      className="flex flex-col items-center group hover:opacity-90 transition-opacity"
                    >
                      <div className="relative h-12 w-12 md:h-16 md:w-16 mb-2">
                        <Image 
                          src={match.teams.away.logo}
                          alt={match.teams.away.name}
                          fill
                          className="object-contain"
                        />
                      </div>
                      <span className="font-bold text-base md:text-lg text-center line-clamp-2 group-hover:underline">
                        {match.teams.away.name}
                      </span>
                    </Link>
                  </div>
                </div>

                {/* Match events timeline for finished matches */}
                {isFinished && match.event_data && match.event_data.length > 0 && (
                  <div className="mt-6 space-y-2 max-w-lg mx-auto text-sm">
                    {match.event_data
                      .filter(event => 
                        (event.type === 'Goal' || event.type === 'Card') && 
                        event.player?.name && 
                        event.time?.elapsed
                      )
                      .sort((a, b) => (a.time.elapsed + (a.time.extra || 0)) - (b.time.elapsed + (b.time.extra || 0)))
                      .map((event, index) => (
                        <div key={index} className="flex items-center justify-center gap-2">
                          {/* Time */}
                          <span className="text-white/80">
                            {event.time.elapsed}'
                            {event.time.extra && `+${event.time.extra}`}
                          </span>

                          {/* Player name */}
                          <span className="font-medium">
                            {event.player.name}
                          </span>

                          {/* Score or card indicator */}
                          {event.type === 'Goal' && event.goals && (
                            <span className="text-white/90">
                              {event.goals.home}-{event.goals.away}
                            </span>
                          )}
                          
                          {event.type === 'Card' && (
                            <div className={`w-3 h-4 rounded-sm ${
                              event.detail === 'Yellow Card' ? 'bg-yellow-400' : 'bg-red-600'
                            }`} />
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Add MatchHighlights component here */}
            <MatchHighlights 
              homeTeam={match.teams.home.name}
              awayTeam={match.teams.away.name}
              matchDate={match.date}
              matchStatus={match.status.short}
              maxResults={5}
              match={match}
            />

            {/* Match details */}
            <div className="bg-white rounded-lg shadow-md p-6">
              {isUpcoming && (
                <>
                  <h1 className="text-lg font-semibold text-gray-800 pb-2 mb-3 border-b">
                    {match.teams.home.name} mot {match.teams.away.name} {formatMatchDateTime(match.date).date}
                  </h1>
                  <p className="text-lg text-gray-800">
                    <span className="font-semibold">{match.teams.home.name}</span> møter{' '}
                    <span className="font-semibold">{match.teams.away.name}</span> i{' '}
                    {match.league.round ? `${match.league.round} av ` : ''}{match.league.name}. 
                    Kampen spilles på{' '}
                    <span className="font-semibold">
                      {match.venue?.name || 'ukjent arena'}
                    </span>{' '}
                    {formatMatchDateTime(match.date).dayName}{' '}
                    {formatMatchDateTime(match.date).fullDate} kl.{' '}
                    {formatMatchDateTime(match.date).time}.
                  </p>
                </>
              )}
              
              {isLive && (
                <div>Live Match Details</div>
              )}
              
              {isFinished && (
                <>
                  <h1 className="text-lg font-semibold text-gray-800 pb-2 mb-3 border-b">
                    {match.teams.home.name} mot {match.teams.away.name} {formatMatchDateTime(match.date).date}
                  </h1>
                  
                  {/* Match summary */}
                  <p className="text-lg text-gray-800 mb-6">
                    {generateMatchSummary(match)}
                  </p>
                  
                  {/* Match events section */}
                  {match.event_data && match.event_data.length > 0 && (
                    <div className="mt-6">
                      <h2 className="text-lg font-semibold mb-4">Kampens hendelser</h2>
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
                                  {event.type === 'subst' && (
                                    <Image
                                      src="/images/channels/sub.svg"
                                      alt="Substitution"
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

                  {/* Add this after your events section */}
                  {isMatchFinished(match.status.short) && match.fixture_statistics && (
                    <div className="mt-8 bg-white rounded-lg">
                      <h2 className="text-lg font-semibold mb-6">Kampstatistikk</h2>
                      
                      {/* Teams header */}
                      <div className="flex items-center justify-between mb-6">
                        {match.fixture_statistics.map((team) => (
                          <div key={team.team.id} className="flex items-center">
                            <Image
                              src={team.team.logo}
                              alt={team.team.name}
                              width={24}
                              height={24}
                              className="object-contain"
                            />
                            <span className="ml-2 font-medium text-sm md:text-base">{team.team.name}</span>
                          </div>
                        ))}
                      </div>

                      {/* Main stats */}
                      <div className="space-y-6">
                        {/* Possession bar */}
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{match.fixture_statistics[0].statistics.find(s => s.type === 'Ball Possession')?.value}</span>
                            <span className="text-gray-600 text-xs md:text-sm">Ballbesittelse</span>
                            <span className="font-medium">{match.fixture_statistics[1].statistics.find(s => s.type === 'Ball Possession')?.value}</span>
                          </div>
                          <div className="h-2 flex rounded-full overflow-hidden bg-gray-100">
                            <div 
                              className="bg-blue-500"
                              style={{ 
                                width: match.fixture_statistics[0].statistics.find(s => s.type === 'Ball Possession')?.value.replace('%', '') + '%' 
                              }}
                            />
                            <div 
                              className="bg-red-500"
                              style={{ 
                                width: match.fixture_statistics[1].statistics.find(s => s.type === 'Ball Possession')?.value.replace('%', '') + '%' 
                              }}
                            />
                          </div>
                        </div>

                        {/* Key stats */}
                        <div className="space-y-4">
                          {[
                            { label: 'Forventet mål', type: 'expected_goals' },
                            { label: 'Skudd på mål', type: 'Shots on Goal' },
                            { label: 'Totale skudd', type: 'Total Shots' },
                          ].map((stat) => (
                            <div key={stat.type} className="flex items-center justify-between">
                              <span className="font-medium w-8 text-right">
                                {match.fixture_statistics[0].statistics.find(s => s.type === stat.type)?.value}
                              </span>
                              <span className="text-xs md:text-sm text-gray-600 text-center flex-1 mx-4">
                                {stat.label}
                              </span>
                              <span className="font-medium w-8">
                                {match.fixture_statistics[1].statistics.find(s => s.type === stat.type)?.value}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Detailed stats */}
                        <div className="space-y-3">
                          {[
                            { label: 'Skudd utenfor mål', type: 'Shots off Goal' },
                            { label: 'Skudd blokkert', type: 'Blocked Shots' },
                            { label: 'Skudd innenfor 16m', type: 'Shots insidebox' },
                            { label: 'Skudd utenfor 16m', type: 'Shots outsidebox' },
                            { label: 'Frispark', type: 'Fouls' },
                            { label: 'Hjørnespark', type: 'Corner Kicks' },
                            { label: 'Offside', type: 'Offsides' },
                            { label: 'Redninger', type: 'Goalkeeper Saves' },
                            { label: 'Pasninger', type: 'Total passes' },
                            { label: 'Vellykkede pasninger', type: 'Passes accurate' },
                            { label: 'Pasningsprosent', type: 'Passes %' },
                          ].map((stat) => (
                            <div key={stat.type} className="flex items-center justify-between">
                              <span className="w-8 text-right font-medium">
                                {match.fixture_statistics[0].statistics.find(s => s.type === stat.type)?.value}
                              </span>
                              <span className="flex-1 mx-3 md:mx-4 text-center text-xs md:text-sm text-gray-600">
                                {stat.label}
                              </span>
                              <span className="w-8 font-medium">
                                {match.fixture_statistics[1].statistics.find(s => s.type === stat.type)?.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Head to head section - moved outside of isFinished */}
              {match.head_to_head && match.head_to_head.length > 0 && (
                <div className="bg-white rounded-lg mt-6">
                  <h2 className="text-lg font-semibold mb-4">Tidligere kamper</h2>
                  
                  {/* Summary stats */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="flex justify-between items-center">
                      <div className="text-center flex-1">
                        <Image
                          src={match.teams.home.logo}
                          alt={match.teams.home.name}
                          width={40}
                          height={40}
                          className="mx-auto mb-2"
                        />
                        <div className="text-2xl font-semibold">
                          {match.head_to_head.filter(m => 
                            (m.teams.home.id === match.teams.home.id && m.goals.home > m.goals.away) ||
                            (m.teams.away.id === match.teams.home.id && m.goals.away > m.goals.home)
                          ).length}
                        </div>
                        <div className="text-sm text-gray-600">seire</div>
                      </div>

                      <div className="text-center flex-1">
                        <div className="text-2xl font-semibold mt-8">
                          {match.head_to_head.filter(m => m.goals.home === m.goals.away).length}
                        </div>
                        <div className="text-sm text-gray-600">uavgjort</div>
                      </div>

                      <div className="text-center flex-1">
                        <Image
                          src={match.teams.away.logo}
                          alt={match.teams.away.name}
                          width={40}
                          height={40}
                          className="mx-auto mb-2"
                        />
                        <div className="text-2xl font-semibold">
                          {match.head_to_head.filter(m => 
                            (m.teams.home.id === match.teams.away.id && m.goals.home > m.goals.away) ||
                            (m.teams.away.id === match.teams.away.id && m.goals.away > m.goals.home)
                          ).length}
                        </div>
                        <div className="text-sm text-gray-600">seire</div>
                      </div>
                    </div>
                  </div>

                  {/* Head to head fixtures list */}
                  <HeadToHeadFixtures matches={match.head_to_head} />
                </div>
              )}
            </div>
          </div>
          
          {/* Left column - Calendar only (now second on mobile) */}
          <div className="w-full md:w-1/3 order-last md:order-first">
            <MatchCalendar currentMatchId={resolvedParams.matchId} />
          </div>
        </div>
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