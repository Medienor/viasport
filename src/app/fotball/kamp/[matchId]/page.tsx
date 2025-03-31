import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import type { Fixture } from '@/types/fixtures';
import MatchCalendar from '@/app/components/MatchCalendar';
import PreventAutoScroll from '@/app/components/PreventAutoScroll';

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
        fixture_statistics
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

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ matchId: string }> 
}): Promise<Metadata> {
  const resolvedParams = await params;
  try {
    const match = await fetchMatchById(resolvedParams.matchId);
    
    if (!match) {
      return {
        title: 'Match Details | ViaSport',
        description: 'Follow football matches live on ViaSport.',
      };
    }

    return {
      title: `${match.teams.home.name} vs ${match.teams.away.name} | ViaSport`,
      description: `Follow the match between ${match.teams.home.name} and ${match.teams.away.name} live on ViaSport.`,
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Match Details | ViaSport',
      description: 'Follow football matches live on ViaSport.',
    };
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

export default async function MatchPage({ 
  params 
}: { 
  params: Promise<{ matchId: string }> 
}) {
  // Await the params
  const resolvedParams = await params;
  console.log('🔵 Rendering MatchPage with params:', resolvedParams);
  
  if (!resolvedParams?.matchId) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                <div className="flex justify-between items-center text-white">
                  <div className="flex items-center">
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
                  <span className="text-sm truncate ml-2">
                    {match.venue?.name}, {match.venue?.city}
                  </span>
                </div>
              </div>
              
              {/* Teams and score */}
              <div className="p-6 text-white">
                <div className="grid grid-cols-7 items-center gap-4">
                  {/* Home team */}
                  <div className="col-span-2">
                    <div className="flex flex-col items-center">
                      <div className="relative h-16 w-16 mb-2">
                        <Image 
                          src={match.teams.home.logo}
                          alt={match.teams.home.name}
                          fill
                          className="object-contain"
                        />
                      </div>
                      <span className="font-bold text-lg text-center line-clamp-2">{match.teams.home.name}</span>
                    </div>
                  </div>
                  
                  {/* Score/Time section */}
                  <div className="col-span-3 flex justify-center">
                    {isUpcoming ? (
                      <div className="flex flex-col items-center">
                        <div className="text-4xl font-bold mb-1">
                          {formatMatchDateTime(match.date).time}
                        </div>
                        <div className="text-sm opacity-90 whitespace-nowrap">
                          {formatMatchDateTime(match.date).date}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="text-4xl font-bold mb-2 whitespace-nowrap">
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
                    <div className="flex flex-col items-center">
                      <div className="relative h-16 w-16 mb-2">
                        <Image 
                          src={match.teams.away.logo}
                          alt={match.teams.away.name}
                          fill
                          className="object-contain"
                        />
                      </div>
                      <span className="font-bold text-lg text-center line-clamp-2">{match.teams.away.name}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
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
                        {/* Timeline line - adjusted for mobile */}
                        <div className="absolute left-12 md:left-24 w-px h-full bg-gray-200" />
                        
                        <div className="space-y-4">
                          {/* Kickoff event - mobile optimized */}
                          <div className="relative flex items-start -mb-2">
                            <div className="w-12 md:w-24 flex-shrink-0 text-xs md:text-sm text-gray-500 pt-0.5">0'</div>
                            <div className="absolute left-12 md:left-24 w-2 h-2 rounded-full mt-2 transform -translate-x-1 bg-gray-400" />
                            <div className="ml-6 md:ml-8 flex items-center">
                              <div className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-1.5 opacity-75">
                                <Image
                                  src="/images/channels/whistle.svg"
                                  alt="Kickoff"
                                  width={14}
                                  height={14}
                                  className="inline-block"
                                />
                              </div>
                              <span className="text-xs md:text-sm text-gray-500">Avspark</span>
                            </div>
                          </div>

                          {/* Match events */}
                          {match.event_data
                            .sort((a, b) => (a.time.elapsed + (a.time.extra || 0)) - (b.time.elapsed + (b.time.extra || 0)))
                            .map((event, index) => (
                              <div key={index} className="relative flex items-start">
                                {/* Time - mobile optimized */}
                                <div className="w-12 md:w-24 flex-shrink-0 text-xs md:text-sm text-gray-500 pt-0.5">
                                  {event.time.elapsed}'
                                  {event.time.extra && `+${event.time.extra}`}
                                </div>

                                {/* Event dot */}
                                <div className={`absolute left-12 md:left-24 w-2 h-2 rounded-full mt-2 transform -translate-x-1 
                                  ${event.type === 'Goal' ? 'bg-green-500' : 
                                    event.type === 'Card' ? (event.detail === 'Yellow Card' ? 'bg-yellow-400' : 'bg-red-500') :
                                    'bg-gray-400'}`}
                                />

                                {/* Event content - mobile optimized */}
                                <div className="ml-6 md:ml-8 min-w-0 flex-1"> {/* Added min-w-0 and flex-1 for text truncation */}
                                  <div className="flex items-center flex-wrap gap-y-1">
                                    {/* Event icon */}
                                    <div className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2 flex-shrink-0 opacity-75">
                                      {event.type === 'Goal' && (
                                        <Image
                                          src="/images/channels/ball.svg"
                                          alt="Goal"
                                          width={16}
                                          height={16}
                                          className="inline-block"
                                        />
                                      )}
                                      {event.type === 'Card' && (
                                        <Image
                                          src={event.detail === 'Yellow Card' 
                                            ? "/images/channels/yellow-card.svg" 
                                            : "/images/channels/red.svg"}
                                          alt={event.detail === 'Yellow Card' ? "Yellow Card" : "Red Card"}
                                          width={16}
                                          height={16}
                                          className="inline-block"
                                        />
                                      )}
                                      {event.type === 'subst' && (
                                        <Image
                                          src="/images/channels/sub.svg"
                                          alt="Substitution"
                                          width={16}
                                          height={16}
                                          className="inline-block"
                                        />
                                      )}
                                    </div>

                                    {/* Event details - mobile optimized */}
                                    {event.type === 'Goal' && (
                                      <div className="flex items-center flex-wrap gap-x-1 min-w-0">
                                        <div className="flex items-center min-w-0">
                                          {event.player.id && (
                                            <div className="w-5 h-5 md:w-6 md:h-6 relative mr-1.5 flex-shrink-0">
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
                                            className="font-medium hover:text-blue-600 transition-colors truncate"
                                          >
                                            {event.player.name}
                                          </Link>
                                        </div>
                                        {event.assist?.name && (
                                          <div className="flex items-center text-xs md:text-sm text-gray-500 min-w-0">
                                            <span className="mx-1 hidden md:inline">•</span>
                                            <Link 
                                              href={`/spillerprofil/${event.assist.id}`}
                                              className="hover:text-blue-600 transition-colors truncate"
                                            >
                                              {event.assist.name}
                                            </Link>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {event.type === 'subst' && (
                                      <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 min-w-0">
                                        <div className="flex items-center min-w-0">
                                          {event.assist.id && (
                                            <div className="w-5 h-5 md:w-6 md:h-6 relative mr-1.5 flex-shrink-0">
                                              <Image
                                                src={`https://media.api-sports.io/football/players/${event.assist.id}.png`}
                                                alt={event.assist.name}
                                                fill
                                                className="object-cover rounded-full"
                                              />
                                            </div>
                                          )}
                                          <Link 
                                            href={`/spillerprofil/${event.assist.id}`}
                                            className="text-green-600 hover:text-green-700 transition-colors truncate text-sm"
                                          >
                                            {event.assist.name}
                                          </Link>
                                        </div>
                                        <span className="text-gray-400 hidden md:inline">→</span>
                                        <div className="flex items-center min-w-0">
                                          {event.player.id && (
                                            <div className="w-5 h-5 md:w-6 md:h-6 relative mr-1.5 flex-shrink-0">
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
                                            className="text-red-600 hover:text-red-700 transition-colors truncate text-sm"
                                          >
                                            {event.player.name}
                                          </Link>
                                        </div>
                                      </div>
                                    )}

                                    {event.type === 'Card' && (
                                      <div className="flex items-center flex-wrap gap-x-1 min-w-0">
                                        <div className="flex items-center min-w-0">
                                          {event.player.id && (
                                            <div className="w-5 h-5 md:w-6 md:h-6 relative mr-1.5 flex-shrink-0">
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
                                            className="font-medium hover:text-blue-600 transition-colors truncate"
                                          >
                                            {event.player.name}
                                          </Link>
                                          <div className="flex items-center text-xs md:text-sm text-gray-500 ml-2">
                                            <span className="hidden md:inline mx-1">•</span>
                                            <span className={`${
                                              event.detail === 'Yellow Card' ? 'text-yellow-600' : 'text-red-600'
                                            }`}>
                                              {event.detail === 'Yellow Card' ? 'Gult kort' : 'Rødt kort'}
                                            </span>
                                            {event.comments && (
                                              <>
                                                <span className="mx-1">-</span>
                                                <span className="text-gray-500 italic">{event.comments}</span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}

                          {/* Final whistle - mobile optimized */}
                          <div className="relative flex items-start -mb-2">
                            <div className="w-12 md:w-24 flex-shrink-0 text-xs md:text-sm text-gray-500 pt-0.5">90'</div>
                            <div className="absolute left-12 md:left-24 w-2 h-2 rounded-full mt-2 transform -translate-x-1 bg-gray-400" />
                            <div className="ml-6 md:ml-8 flex items-center">
                              <div className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-1.5 opacity-75">
                                <Image
                                  src="/images/channels/whistle.svg"
                                  alt="Final whistle"
                                  width={14}
                                  height={14}
                                  className="inline-block"
                                />
                              </div>
                              <span className="text-xs md:text-sm text-gray-500">Kampslutt</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Add this after your events section */}
                  {isMatchFinished(match.status.short) && match.fixture_statistics && (
                    <div className="mt-8 bg-white rounded-lg p-4">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

function formatMatchDateTime(dateString: string) {
  const date = new Date(dateString);
  const days = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
  const months = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
  
  return {
    dayName: days[date.getDay()],
    fullDate: `${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}`,
    time: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  };
}