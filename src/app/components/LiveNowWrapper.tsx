"use client"

import { useState, useEffect } from 'react';
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

export default function LiveNowWrapper() {
  const [hasPopularLiveMatches, setHasPopularLiveMatches] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Function to check if there are any live matches in popular leagues
    const checkPopularLiveMatches = async () => {
      try {
        const response = await fetch('https://api-football-v1.p.rapidapi.com/v3/fixtures?live=all', {
          headers: {
            'x-rapidapi-key': '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90',
            'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch live matches');
        }
        
        const data = await response.json();
        
        // Check if there are any live matches in popular leagues
        const popularLeagueMatches = data.response?.filter(match => 
          POPULAR_LEAGUE_IDS.includes(match.league?.id)
        );
        
        setHasPopularLiveMatches(popularLeagueMatches && popularLeagueMatches.length > 0);
      } catch (error) {
        console.error('Error checking live matches:', error);
        setHasPopularLiveMatches(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkPopularLiveMatches();
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