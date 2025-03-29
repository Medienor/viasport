import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { fetchMatchById, fetchAllMatches } from './api';
import MatchCalendar from '@/app/components/MatchCalendar';
import LiveMatchDetails from '@/app/components/LiveMatchDetails';
import CompletedMatchDetails from '@/app/components/CompletedMatchDetails';
import MatchOddsSlider from '@/app/components/MatchOddsSlider';
import MatchHighlights from '@/app/components/MatchHighlights';
import UpcomingMatchDetails from '@/app/components/UpcomingMatchDetails';
import PreventAutoScroll from '@/app/components/PreventAutoScroll';

// Instead, use dynamic rendering with ISR for this page
export const dynamic = 'force-dynamic';

// Add these type definitions at the top of your file
interface Team {
  id: number;
  name: string;
  logo: string;
}

interface League {
  id: number;
  name: string;
  logo: string;
}

interface Venue {
  name: string;
  city: string;
}

interface Status {
  short: string;
  elapsed?: number;
}

interface Fixture {
  id: number;
  date: string;
  status: Status;
  venue?: Venue;
}

interface Goals {
  home: number | null;
  away: number | null;
}

interface Match {
  fixture: Fixture;
  league: League;
  teams: {
    home: Team;
    away: Team;
  };
  goals: Goals;
}

// This generates all the static paths at build time
export async function generateStaticParams() {
  try {
    // Fetch all matches that you want to pre-render
    const matches = await fetchAllMatches();
    
    if (!matches || matches.length === 0) {
      console.log('No matches found for static generation');
      return [];
    }
    
    return matches.map((match: Match) => ({
      matchId: match.fixture.id.toString(),
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

// Generate metadata for the page
export async function generateMetadata({ params }: { params: { matchId: string } }): Promise<Metadata> {
  try {
    const match = await fetchMatchById(params.matchId);
    
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

// Update the formatMatchDateTime function (no changes needed, just adding type annotation)
function formatMatchDateTime(dateString: string) {
  const date = new Date(dateString);
  const days = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
  
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return {
    time: `${hours}:${minutes}`,
    date: `${dayName} ${day}. ${month}`
  };
}

// Convert to proper async component format
export default async function MatchPage({ params }: { params: { matchId: string } }) {
  console.log('Rendering MatchPage with params:', params);
  
  // Add proper error boundary
  if (!params?.matchId) {
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

  let match;
  try {
    console.log('Fetching match data...');
    match = await fetchMatchById(params.matchId);
    console.log('Match data received:', match);
    
    if (!match) {
      throw new Error('Match not found');
    }

    const isUpcoming = match.fixture.status.short === 'NS' || match.fixture.status.short === 'TBD';
    const isLive = ['LIVE', '1H', '2H', 'HT'].includes(match.fixture.status.short);
    const isFinished = ['FT', 'AET', 'PEN'].includes(match.fixture.status.short);
    const matchStatus = match.fixture.status.short || 'NS';
    
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
              {/* League info - now transparent */}
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
                    {match.fixture.venue?.name}, {match.fixture.venue?.city}
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
                          {formatMatchDateTime(match.fixture.date).time}
                        </div>
                        <div className="text-sm opacity-90 whitespace-nowrap">
                          {formatMatchDateTime(match.fixture.date).date}
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
                            {match.fixture.status.elapsed || '0'}&apos;
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
            
            {/* Odds slider */}
            <MatchOddsSlider 
              matchId={parseInt(params.matchId)} 
              isFinished={isFinished} 
            />
            
            {/* Match details */}
            <div className="bg-white rounded-lg shadow-md p-6">
              {isUpcoming && (
                <UpcomingMatchDetails match={match as any} />
              )}
              
              {isLive && (
                <LiveMatchDetails match={match as any} />
              )}
              
              {isFinished && (
                <CompletedMatchDetails match={match as any} />
              )}
            </div>

            {/* Match Highlights - completely separate component */}
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <MatchHighlights 
                homeTeam={match.teams.home.name}
                awayTeam={match.teams.away.name}
                matchDate={match.fixture.date}
                matchStatus={matchStatus}
                maxResults={10}
              />
            </div>
          </div>
          
          {/* Left column - Calendar only (now second on mobile) */}
          <div className="w-full md:w-1/3 order-last md:order-first">
            <MatchCalendar currentMatchId={params.matchId} />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Detailed error in MatchPage:', error);
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