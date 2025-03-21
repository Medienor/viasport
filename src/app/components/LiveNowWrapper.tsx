"use client"

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import LiveNow from './LiveNow';

// Define the popular league IDs we want to show
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

// Define a type for the match object
interface Match {
  league: {
    id: number;
    name: string;
    logo?: string;
  };
  // Add other properties as needed
}

export default function LiveNowWrapper() {
  const [hasPopularLiveMatches, setHasPopularLiveMatches] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const lastFetchTime = useRef<number>(0);
  const MIN_FETCH_INTERVAL = 60000; // 1 minute minimum between checks

  useEffect(() => {
    let isSubscribed = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const checkPopularLiveMatches = async (force: boolean = false) => {
      const now = Date.now();
      if (!force && now - lastFetchTime.current < MIN_FETCH_INTERVAL) {
        return; // Skip if not enough time has passed
      }

      try {
        // Use the server endpoint instead of direct API call
        const response = await fetch('/api/live-matches', {
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch live matches');
        }
        
        const data = await response.json();
        lastFetchTime.current = now;
        
        // Check if there are any live matches in popular leagues
        const popularLeagueMatches = data.matches?.filter((match: Match) => 
          POPULAR_LEAGUE_IDS.includes(match.league?.id)
        );
        
        if (isSubscribed) {
          setHasPopularLiveMatches(popularLeagueMatches && popularLeagueMatches.length > 0);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error checking live matches:', error);
        if (isSubscribed) {
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
        checkPopularLiveMatches(true); // Force check when becoming visible
      }
    };

    // Initial check
    checkPopularLiveMatches(true);

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isSubscribed = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // If still loading or no popular live matches, don't render anything
  if (isLoading || !hasPopularLiveMatches) {
    return null;
  }
  
  // If there are popular live matches, render the section with heading, button, and LiveNow component
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
      <LiveNow popularLeaguesOnly={true} />
    </div>
  );
} 