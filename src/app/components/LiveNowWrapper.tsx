"use client"

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import LiveNow from './LiveNow';

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

// Define the Fixture type
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

// Popular league IDs (moved from LiveNow.tsx)
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

export default function LiveNowWrapper() {
  const [liveMatches, setLiveMatches] = useState<Fixture[]>([]);
  const [hasPopularLiveMatches, setHasPopularLiveMatches] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const lastFetchTime = useRef<number>(0);
  const MIN_FETCH_INTERVAL = 30000; // 30 seconds minimum between checks

  useEffect(() => {
    let isSubscribed = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const fetchLiveMatches = async (force: boolean = false) => {
      const now = Date.now();
      if (!force && now - lastFetchTime.current < MIN_FETCH_INTERVAL) {
        return;
      }

      try {
        const response = await fetch('/api/live-matches', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch live matches');
        }
        
        const data = await response.json();
        lastFetchTime.current = now;
        
        // Filter and sort matches
        const matches = data.matches || [];
        const popularMatches = matches.filter((match: Fixture) => 
          POPULAR_LEAGUE_IDS.includes(match.league?.id)
        );

        // Sort matches by league popularity and match time
        matches.sort((a: Fixture, b: Fixture) => {
          const leagueAIndex = POPULAR_LEAGUE_IDS.indexOf(a.league.id);
          const leagueBIndex = POPULAR_LEAGUE_IDS.indexOf(b.league.id);
          
          if (leagueAIndex !== -1 && leagueBIndex !== -1) {
            return leagueAIndex - leagueBIndex;
          } else if (leagueAIndex !== -1) {
            return -1;
          } else if (leagueBIndex !== -1) {
            return 1;
          }
          
          return (b.fixture.status.elapsed ?? 0) - (a.fixture.status.elapsed ?? 0);
        });
        
        if (isSubscribed) {
          setLiveMatches(matches);
          setHasPopularLiveMatches(popularMatches.length > 0);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error checking live matches:', error);
        if (isSubscribed) {
          setLiveMatches([]);
          setHasPopularLiveMatches(false);
          setIsLoading(false);
        }
      }
    };

    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      } else {
        fetchLiveMatches(true);
      }
    };

    // Initial fetch
    fetchLiveMatches(true);

    // Set up interval for regular updates
    const intervalId = setInterval(() => fetchLiveMatches(), MIN_FETCH_INTERVAL);

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (isLoading || !hasPopularLiveMatches) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Live fotball kamper nå</h2>
        <Link 
          href="/fotball/live" 
          className="bg-gradient-to-t from-red-700 to-red-500 hover:from-red-800 hover:to-red-600 text-white text-sm font-medium py-1.5 px-3 rounded-full transition-colors flex items-center"
        >
          <span className="inline-block w-1.5 h-1.5 bg-white bg-opacity-70 rounded-full animate-pulse mr-1.5"></span>
          Viasport Live
        </Link>
      </div>
      <LiveNow liveMatches={liveMatches} popularLeaguesOnly={true} />
    </div>
  );
} 