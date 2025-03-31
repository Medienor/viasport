"use client"

import { useState } from 'react';
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
  liveMatches: Fixture[];
  popularLeaguesOnly?: boolean;
}

export default function LiveNow({ liveMatches, popularLeaguesOnly = false }: LiveNowProps) {
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const router = useRouter();
  
  // Filter matches to only show popular leagues
  const filteredMatches = popularLeaguesOnly 
    ? liveMatches.filter(match => POPULAR_LEAGUE_IDS.includes(match.league.id))
    : liveMatches;
  
  if (filteredMatches.length === 0) {
    return null;
  }

  const currentMatch = filteredMatches[currentMatchIndex];
  
  // Helper functions
  const goToNextMatch = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMatchIndex((prev) => (prev + 1) % filteredMatches.length);
  };

  const goToPreviousMatch = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMatchIndex((prev) => (prev - 1 + filteredMatches.length) % filteredMatches.length);
  };

  const getMatchStatusDisplay = (match: Fixture) => {
    const { short, elapsed } = match.fixture.status;
    if (short === 'HT') return 'Pause';
    if (short === 'BT') return 'Pause';
    if (elapsed) return `${elapsed}'`;
    return short;
  };

  const statusDisplay = getMatchStatusDisplay(currentMatch);
  const isPaused = ['HT', 'BT'].includes(currentMatch.fixture.status.short);

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
        {filteredMatches.length > 1 && (
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
      
      {/* Additional matches section - now using filtered matches */}
      {filteredMatches.length > 1 && (
        <div className="bg-white p-4">
          <h3 className="font-medium text-gray-900 mb-3">Andre direktesendte kamper</h3>
          
          <div className="space-y-3">
            {filteredMatches
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