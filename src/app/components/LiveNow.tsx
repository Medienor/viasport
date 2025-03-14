"use client"

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/navigation';

// Define the Fixture type properly
interface Fixture {
  fixture: {
    id: number;
    status: {
      short: string;
      elapsed: number | null;
    };
    venue?: {
      name: string;
      city: string;
    };
  };
  league: {
    id: number;
    name: string;
    logo: string;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
    };
    away: {
      id: number;
      name: string;
      logo: string;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  events?: MatchEvent[];
}

// Define the MatchEvent interface
interface MatchEvent {
  time: {
    elapsed: number;
    extra?: number | null;
  };
  team: {
    id: number;
    name: string;
    logo: string;
  };
  player?: {
    id: number;
    name: string;
  };
  assist?: {
    id: number;
    name: string;
  };
  type: string;
  detail: string;
  comments?: string;
}

// Define the popular league IDs (same as in LiveNowWrapper)
const POPULAR_LEAGUE_IDS = [
  39,  // Premier League
  140, // La Liga
  135, // Serie A
  78,  // Bundesliga
  61,  // Ligue 1
  2,   // Champions League
  3,   // Europa League
  848, // Conference League
  103, // Eliteserien
  113, // Allsvenskan
  1,   // World Cup
  4,   // Euro Championship
  45   // FA Cup
];

interface LiveNowProps {
  popularLeaguesOnly?: boolean;
}

export default function LiveNow({ popularLeaguesOnly = false }: LiveNowProps) {
  const [liveMatches, setLiveMatches] = useState<Fixture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const router = useRouter();
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds

  // Modified fetch function with retry logic and rate limiting
  const fetchLiveMatches = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://api-football-v1.p.rapidapi.com/v3/fixtures?live=all', {
        headers: {
          'x-rapidapi-key': '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90',
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
          'cache-control': 'no-cache' // Prevent caching
        }
      });
      
      if (response.status === 429) {
        // Rate limit hit
        if (retryCount < MAX_RETRIES) {
          console.log(`Rate limit hit, retrying in ${RETRY_DELAY}ms... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
          setRetryCount(prev => prev + 1);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return fetchLiveMatches(); // Retry the request
        } else {
          throw new Error('Rate limit exceeded after maximum retries');
        }
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch live matches: ${response.status}`);
      }
      
      const data = await response.json();
      setRetryCount(0); // Reset retry count on success
      
      // Filter matches by popular leagues if requested
      let matches = data.response || [];
      if (popularLeaguesOnly) {
        matches = matches.filter((match: Fixture) => 
          POPULAR_LEAGUE_IDS.includes(match.league?.id)
        );
      }
      
      // Sort matches by league popularity and then by match time
      matches.sort((a: Fixture, b: Fixture) => {
        // First sort by league popularity (lower index = more popular)
        const leagueAIndex = POPULAR_LEAGUE_IDS.indexOf(a.league.id);
        const leagueBIndex = POPULAR_LEAGUE_IDS.indexOf(b.league.id);
        
        if (leagueAIndex !== -1 && leagueBIndex !== -1) {
          return leagueAIndex - leagueBIndex;
        } else if (leagueAIndex !== -1) {
          return -1; // A is in popular leagues, B is not
        } else if (leagueBIndex !== -1) {
          return 1;  // B is in popular leagues, A is not
        }
        
        // If neither is in popular leagues or both are equally popular,
        // sort by match time (later elapsed time first)
        return (b.fixture.status.elapsed ?? 0) - (a.fixture.status.elapsed ?? 0);
      });
      
      setLiveMatches(matches);
    } catch (err) {
      console.error('Error fetching live matches:', err);
      setError('Kunne ikke hente direktesendte kamper.');
    } finally {
      setIsLoading(false);
    }
  }, [popularLeaguesOnly, retryCount]);

  useEffect(() => {
    let isMounted = true;
    const intervalId = setInterval(fetchLiveMatches, 120000); // Changed to const
    
    const fetchData = async () => {
      if (!isMounted) return;
      await fetchLiveMatches();
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchLiveMatches]);

  const goToPreviousMatch = () => {
    if (liveMatches.length === 0) return;
    
    setCurrentMatchIndex((prevIndex) => 
      prevIndex === 0 ? liveMatches.length - 1 : prevIndex - 1
    );
  };
  
  const goToNextMatch = () => {
    if (liveMatches.length === 0) return;
    
    setCurrentMatchIndex((prevIndex) => 
      prevIndex === liveMatches.length - 1 ? 0 : prevIndex + 1
    );
  };

  // Helper function to get match status display
  const getMatchStatusDisplay = (fixture: Fixture) => {
    if (!fixture.fixture?.status) return 'LIVE';
    
    switch(fixture.fixture.status.short) {
      case '1H': return `1. OMGANG ${fixture.fixture.status.elapsed}'`;
      case 'HT': return 'PAUSE';
      case '2H': return `2. OMGANG ${fixture.fixture.status.elapsed}'`;
      case 'ET': return `EKSTRAOMGANGER ${fixture.fixture.status.elapsed}'`;
      case 'BT': return 'PAUSE I EKSTRAOMGANGER';
      case 'P': return 'STRAFFESPARK';
      case 'SUSP': return 'KAMPEN ER SUSPENDERT';
      case 'INT': return 'KAMPEN ER AVBRUTT';
      default: return `LIVE ${fixture.fixture.status.elapsed}'`;
    }
  };

  // Loading state - return null to hide component
  if (isLoading && liveMatches.length === 0) {
    return null;
  }

  // Error state - return null to hide component
  if (error && liveMatches.length === 0) {
    return null;
  }

  // No matches state - return null to hide component
  if (liveMatches.length === 0) {
    return null;
  }

  // Get current match
  const currentMatch = liveMatches[currentMatchIndex];
  
  // Determine status display and color
  const statusDisplay = getMatchStatusDisplay(currentMatch);
  const isPaused = currentMatch.fixture?.status?.short === 'HT' || 
                   currentMatch.fixture?.status?.short === 'BT';

  return (
    <div className="rounded-lg overflow-hidden shadow-md">
      {/* Match card with background image - now clickable */}
      <div 
        className="relative p-6 text-white cursor-pointer"
        style={{
          backgroundImage: "url('/bg-fotball.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
        onClick={() => router.push(`/fotball/kamp/${currentMatch.fixture.id}`)}
      >
        {/* Remove the dark overlay */}
        {/* <div className="absolute inset-0 bg-black bg-opacity-60"></div> */}
        
        {/* Pagination arrows */}
        {liveMatches.length > 1 && (
          <>
            <button 
              onClick={goToPreviousMatch}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-1 transition-all"
              aria-label="Previous match"
            >
              <ChevronLeftIcon className="h-5 w-5 text-white" />
            </button>
            
            <button 
              onClick={goToNextMatch}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-1 transition-all"
              aria-label="Next match"
            >
              <ChevronRightIcon className="h-5 w-5 text-white" />
            </button>
          </>
        )}
        
        {/* Match content - update z-index since we removed the overlay */}
        <div className="relative">
          {/* Add text shadow to ensure text is readable without the overlay */}
          <style jsx global>{`
            .match-card-text {
              text-shadow: 0 1px 3px rgba(0,0,0,0.7);
            }
          `}</style>
          
          {/* Status indicator - smaller with gradient, matching additional matches style */}
          <div className="flex justify-center mb-4">
            <span 
              className={`
                text-white text-xs font-medium px-3 py-0.5 rounded-full flex items-center
                ${isPaused 
                  ? "bg-green-500" 
                  : "bg-gradient-to-t from-red-700 to-red-500"}
              `}
            >
              <span className="inline-block w-1.5 h-1.5 bg-white bg-opacity-70 rounded-full animate-pulse mr-1"></span>
              {statusDisplay}
            </span>
          </div>
          
          {/* Teams and score */}
          <div className="flex items-center justify-between mb-4">
            {/* Home team */}
            <div className="flex flex-col items-center w-2/5">
              <div className="relative h-16 w-16 mb-2 bg-white bg-opacity-20 rounded-full p-1">
                <Image 
                  src={currentMatch.teams.home.logo}
                  alt={currentMatch.teams.home.name}
                  fill
                  className="object-contain"
                />
              </div>
              <h3 className="font-bold text-center match-card-text">{currentMatch.teams.home.name}</h3>
            </div>
            
            {/* Score */}
            <div className="text-center">
              <div className="text-3xl font-bold mb-1 match-card-text">
                {currentMatch.goals?.home ?? 0} - {currentMatch.goals?.away ?? 0}
              </div>
            </div>
            
            {/* Away team */}
            <div className="flex flex-col items-center w-2/5">
              <div className="relative h-16 w-16 mb-2 bg-white bg-opacity-20 rounded-full p-1">
                <Image 
                  src={currentMatch.teams.away.logo}
                  alt={currentMatch.teams.away.name}
                  fill
                  className="object-contain"
                />
              </div>
              <h3 className="font-bold text-center match-card-text">{currentMatch.teams.away.name}</h3>
            </div>
          </div>
          
          {/* League info */}
          <div className="text-center text-sm mb-4 match-card-text">
            <p>{currentMatch.league?.name}</p>
          </div>
        </div>
      </div>
      
      {/* Additional matches in a more compact format - removed league names */}
      {liveMatches.length > 1 && (
        <div className="bg-white p-4">
          <h3 className="font-medium text-gray-900 mb-3">Andre direktesendte kamper</h3>
          
          <div className="space-y-3">
            {/* Filter out the currently featured match */}
            {liveMatches
              .filter((_, index) => index !== currentMatchIndex)
              .map((match: Fixture) => (
                <div 
                  key={match.fixture.id}
                  className="flex items-center p-3 hover:bg-gray-50 rounded-lg border border-gray-100 cursor-pointer transition-colors"
                  onClick={() => router.push(`/fotball/kamp/${match.fixture.id}`)}
                >
                  {/* Removed league name */}
                  
                  {/* Home team */}
                  <div className="flex items-center flex-1">
                    <div className="relative h-8 w-8 mr-2">
                      <Image 
                        src={match.teams.home.logo}
                        alt={match.teams.home.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <span className="font-medium text-sm">{match.teams.home.name}</span>
                  </div>
                  
                  {/* Score and time - centered with gradient */}
                  <div className="flex flex-col items-center mx-4">
                    <div className="flex items-center bg-gray-100 rounded-md px-3 py-1">
                      <span className="font-bold text-sm">
                        {match.goals.home}-{match.goals.away}
                      </span>
                    </div>
                    <div 
                      className={`
                        text-xs font-medium mt-1 flex items-center px-2 py-0.5 rounded-full
                        ${match.fixture.status.short === 'HT' || match.fixture.status.short === 'BT'
                          ? "bg-green-500 text-white" 
                          : "bg-gradient-to-t from-red-700 to-red-500 text-white"}
                      `}
                    >
                      <span className="inline-block w-1.5 h-1.5 bg-white bg-opacity-70 rounded-full animate-pulse mr-1"></span>
                      {match.fixture.status.elapsed ? `${match.fixture.status.elapsed}'` : getMatchStatusDisplay(match)}
                    </div>
                  </div>
                  
                  {/* Away team */}
                  <div className="flex items-center justify-end flex-1">
                    <span className="font-medium text-sm">{match.teams.away.name}</span>
                    <div className="relative h-8 w-8 ml-2">
                      <Image 
                        src={match.teams.away.logo}
                        alt={match.teams.away.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>
          
          <div className="mt-4 text-center">
            <Link href="/fotball/live" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Se alle direktesendte kamper →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
} 