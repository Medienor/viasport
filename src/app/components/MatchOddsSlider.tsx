"use client"

import { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

interface OddsValue {
  value: string;
  odd: string;
  handicap?: string;
  main: boolean;
  suspended: boolean;
}

interface OddsBet {
  id: number;
  name: string;
  values: OddsValue[];
}

interface Bookmaker {
  id: number;
  name: string;
  bets: OddsBet[];
}

interface MatchOddsSliderProps {
  matchId: number;
  isFinished?: boolean;
}

export default function MatchOddsSlider({ matchId, isFinished = false }: MatchOddsSliderProps) {
  const [bookmakers, setBookmakers] = useState<Bookmaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentBetIndex, setCurrentBetIndex] = useState(0);
  
  // Common bet types to display
  const priorityBets = [
    { id: 1, name: "Match Winner" },
    { id: 2, name: "Home/Away" },
    { id: 5, name: "Double Chance" },
    { id: 6, name: "Both Teams Score" },
    { id: 8, name: "Exact Score" },
    { id: 9, name: "Over/Under" },
    { id: 10, name: "Goals Over/Under First Half" },
  ];
  
  useEffect(() => {
    // Don't fetch odds if the match is finished
    if (isFinished) {
      setLoading(false);
      return;
    }
    
    const fetchOdds = async () => {
      setLoading(true);
      try {
        // First try to get live odds
        const liveResponse = await fetch(`/api/odds/live?fixture=${matchId}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (liveResponse.ok) {
          const liveData = await liveResponse.json();
          
          if (liveData.response && 
              liveData.response.length > 0 && 
              liveData.response[0].bookmakers && 
              liveData.response[0].bookmakers.length > 0) {
            
            console.log("Live odds found:", liveData.response[0].bookmakers);
            setBookmakers(liveData.response[0].bookmakers);
            setLoading(false);
            return;
          }
        }
        
        // If no live odds, try pre-match odds
        const preMatchResponse = await fetch(`/api/odds?fixture=${matchId}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (preMatchResponse.ok) {
          const preMatchData = await preMatchResponse.json();
          
          if (preMatchData.response && 
              preMatchData.response.length > 0 && 
              preMatchData.response[0].bookmakers && 
              preMatchData.response[0].bookmakers.length > 0) {
            
            console.log("Pre-match odds found:", preMatchData.response[0].bookmakers);
            setBookmakers(preMatchData.response[0].bookmakers);
          } else {
            console.log("No pre-match odds found in response:", preMatchData);
            setError("Ingen odds tilgjengelig");
          }
        } else {
          console.error("Error fetching pre-match odds:", preMatchResponse.statusText);
          setError("Kunne ikke hente odds");
        }
      } catch (err) {
        console.error("Error in odds fetch:", err);
        setError("Feil ved henting av odds");
      } finally {
        setLoading(false);
      }
    };
    
    if (matchId) {
      fetchOdds();
      
      // Refresh odds every minute for live matches
      const intervalId = setInterval(fetchOdds, 60000);
      return () => clearInterval(intervalId);
    }
  }, [matchId, isFinished]);
  
  // Filter to show only priority bets and get the first available one
  const getDisplayBets = () => {
    if (!bookmakers || bookmakers.length === 0) return [];
    
    const displayBets: { bet: OddsBet }[] = [];
    
    // For each bookmaker, find priority bets
    bookmakers.forEach(bookmaker => {
      priorityBets.forEach(priorityBet => {
        const foundBet = bookmaker.bets.find(bet => bet.id === priorityBet.id);
        if (foundBet && foundBet.values.length > 0) {
          // Check if we already have this bet type
          const existingBetIndex = displayBets.findIndex(item => item.bet.name === foundBet.name);
          if (existingBetIndex === -1) {
            // Only add bets that have valid options (not suspended)
            const validValues = foundBet.values.filter(value => !value.suspended);
            if (validValues.length > 0) {
              displayBets.push({
                bet: {
                  ...foundBet,
                  values: validValues
                }
              });
            }
          }
        }
      });
    });
    
    return displayBets;
  };
  
  const displayBets = getDisplayBets();
  const totalBets = displayBets.length;
  
  const nextBet = () => {
    if (totalBets > 0) {
      setCurrentBetIndex((prevIndex) => (prevIndex + 1) % totalBets);
    }
  };
  
  const prevBet = () => {
    if (totalBets > 0) {
      setCurrentBetIndex((prevIndex) => (prevIndex - 1 + totalBets) % totalBets);
    }
  };
  
  // Format odds value for display
  const formatOddsValue = (value: string) => {
    switch (value.toLowerCase()) {
      case "home":
        return "Hjemmeseier";
      case "away":
        return "Borteseier";
      case "draw":
        return "Uavgjort";
      case "yes":
        return "Ja";
      case "no":
        return "Nei";
      case "over":
        return "Over";
      case "under":
        return "Under";
      default:
        return value;
    }
  };
  
  // Translate bet name to Norwegian
  const translateBetName = (name: string) => {
    const translations: Record<string, string> = {
      "Match Winner": "Kampvinner",
      "Home/Away": "Hjemme/Borte",
      "Double Chance": "Dobbel sjanse",
      "Both Teams Score": "Begge lag scorer",
      "Exact Score": "Eksakt resultat",
      "Over/Under": "Mål over/under",
      "Asian Handicap": "Asiatisk handicap",
      "Goals Over/Under": "Mål over/under",
      "Goals Over/Under First Half": "Mål over/under første omgang",
      "Team To Score First": "Lag som scorer først",
      "Team To Score Last": "Lag som scorer sist",
      "Total - Home": "Totalt - Hjemme",
      "Total - Away": "Totalt - Borte",
    };
    
    return translations[name] || name;
  };
  
  // Simplify team names for display
  const simplifyTeamName = (value: string) => {
    // If the value contains a team name, extract just the team name
    if (value.includes(' - ')) {
      return value.split(' - ')[0];
    }
    return value;
  };
  
  // Format handicap value for display
  const formatHandicap = (handicap: string | undefined) => {
    if (!handicap) return '';
    return handicap;
  };
  
  // If match is finished or no bets available, don't render anything
  if (isFinished || error || totalBets === 0) {
    return null;
  }
  
  if (loading) {
    return (
      <div className="bg-gray-100 rounded-lg p-4 mb-4">
        <div className="flex justify-center items-center h-16">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }
  
  const currentBet = displayBets[currentBetIndex].bet;
  
  return (
    <div className="bg-gray-100 rounded-lg p-4 mb-4 relative">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900">
          {translateBetName(currentBet.name)}
        </h3>
        
        <div className="flex space-x-1">
          <button 
            onClick={prevBet}
            className="p-1 rounded-full bg-white shadow-md hover:bg-gray-100 z-10"
            aria-label="Previous bet"
          >
            <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <button 
            onClick={nextBet}
            className="p-1 rounded-full bg-white shadow-md hover:bg-gray-100 z-10"
            aria-label="Next bet"
          >
            <ChevronRightIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>
      
      <div className="flex justify-between space-x-2">
        {currentBet.values
          .filter(value => !value.suspended)
          .slice(0, 3) // Show max 3 options
          .map((value, valueIndex) => (
            <div 
              key={valueIndex}
              className="flex-1 p-3 text-center bg-white rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="text-xs font-medium text-gray-600 mb-1 whitespace-nowrap overflow-hidden text-ellipsis" title={`${simplifyTeamName(formatOddsValue(value.value))}${value.handicap ? ` ${formatHandicap(value.handicap)}` : ''}`}>
                {simplifyTeamName(formatOddsValue(value.value))}
                {value.handicap && ` ${formatHandicap(value.handicap)}`}
              </div>
              <div className="text-lg font-bold text-gray-800">
                {parseFloat(value.odd).toFixed(2)}
              </div>
            </div>
          ))}
      </div>
      
      <div className="mt-2 text-xs text-right text-gray-500">
        <a href="https://hjelpelinjen.no" className="hover:underline">Hjelpelinjen.no</a>
      </div>
    </div>
  );
} 