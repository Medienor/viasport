"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface SimpleTeamStandingsProps {
  leagueId: number;
  season: number;
  leagueName: string;
}

// Update the popularLeagues array to include country info
const popularLeagues = [
  { id: 39, name: 'Premier League', country: 'England', season: 2024 },
  { id: 103, name: 'Eliteserien', country: 'Norway', season: 2025 },
  { id: 140, name: 'La Liga', country: 'Spain', season: 2024 },
  { id: 135, name: 'Serie A', country: 'Italy', season: 2024 },
  { id: 78, name: 'Bundesliga', country: 'Germany', season: 2024 },
  { id: 61, name: 'Ligue 1', country: 'France', season: 2024 },
  { id: 104, name: 'OBOS-ligaen', country: 'Norway', season: 2025 }
];

// Helper function to get the correct season for a league
const getSeasonForLeague = (leagueId: number): number => {
  const league = popularLeagues.find(l => l.id === leagueId);
  return league?.season || 2024; // Default to 2024 if not found
};

export default function SimpleTeamStandings({ leagueId: initialLeagueId, season: initialSeason, leagueName: initialLeagueName }: SimpleTeamStandingsProps) {
  // Get stored league preference from localStorage
  const [leagueId, setLeagueId] = useState<number>(initialLeagueId);
  const [leagueName, setLeagueName] = useState<string>(initialLeagueName);
  const [season, setSeason] = useState<number>(getSeasonForLeague(initialLeagueId));
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load user preference from localStorage on initial render
  useEffect(() => {
    const storedLeagueId = localStorage.getItem('preferredLeagueId');
    const storedLeagueName = localStorage.getItem('preferredLeagueName');
    
    if (storedLeagueId && storedLeagueName) {
      const parsedLeagueId = parseInt(storedLeagueId);
      setLeagueId(parsedLeagueId);
      setLeagueName(storedLeagueName);
      setSeason(getSeasonForLeague(parsedLeagueId));
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch standings when leagueId or season changes
  useEffect(() => {
    const fetchStandings = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/standings?league=${leagueId}&season=${season}`, {
          next: { revalidate: 86400 },
          headers: {
            'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate'
          }
        });
        
        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.response && data.response.length > 0) {
          setStandings(data.response);
        } else {
          setStandings([]);
        }
      } catch (error) {
        console.error('Error fetching standings:', error);
        setError((error as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchStandings();
  }, [leagueId, season]);

  // Change league and save preference
  const changeLeague = (id: number, name: string) => {
    const newSeason = getSeasonForLeague(id);
    setLeagueId(id);
    setLeagueName(name);
    setSeason(newSeason);
    setIsDropdownOpen(false);
    
    // Save to localStorage
    localStorage.setItem('preferredLeagueId', id.toString());
    localStorage.setItem('preferredLeagueName', name);
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500">Laster tabell...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-red-500">Kunne ikke laste tabellen</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-3 relative" ref={dropdownRef}>
        {/* Current League Display */}
        <div className="flex items-center">
          <div className="relative h-6 w-6">
            <Image
              src={`https://viasport.b-cdn.net/football/leagues/${leagueId}.png`}
              alt={leagueName}
              fill
              className="object-contain"
              unoptimized
            />
          </div>
          <h2 className="text-base font-medium ml-2">{leagueName}</h2>
        </div>
        
        {/* Toggle Button */}
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center space-x-1 px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
        >
          <span className="text-sm">Bytt liga</span>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {/* Enhanced Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden z-20">
            <div className="py-2">
              {/* Header */}
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Velg liga</h3>
              </div>
              
              {/* League List */}
              <div className="max-h-[320px] overflow-y-auto">
                {popularLeagues.map(league => (
                  <button
                    key={league.id}
                    onClick={() => changeLeague(league.id, league.name)}
                    className={`w-full text-left px-4 py-2.5 flex items-center space-x-3 hover:bg-gray-50 transition-colors
                      ${leagueId === league.id ? 'bg-blue-50/50' : ''}`}
                  >
                    {/* League Icon */}
                    <div className="relative h-6 w-6 flex-shrink-0">
                      <Image
                        src={`https://viasport.b-cdn.net/football/leagues/${league.id}.png`}
                        alt={league.name}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    
                    {/* League Info */}
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className={`text-sm truncate ${leagueId === league.id ? 'font-medium text-blue-600' : 'text-gray-700'}`}>
                        {league.name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {league.country}
                      </span>
                    </div>
                    
                    {/* Selected Indicator */}
                    {leagueId === league.id && (
                      <svg className="h-5 w-5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1">
        {standings[0]?.league.standings[0]?.map((standing: any) => {
          let rankClass = '';
          if (standing.description) {
            if (standing.description.includes('Champions League')) {
              rankClass = 'border-l-2 border-blue-500';
            } else if (standing.description.includes('Europa League')) {
              rankClass = 'border-l-2 border-orange-500';
            } else if (standing.description.includes('Conference League')) {
              rankClass = 'border-l-2 border-purple-500';
            } else if (standing.description.includes('Relegation')) {
              rankClass = 'border-l-2 border-red-500';
            }
          }

          return (
            <Link
              key={standing.team.id}
              href={`/lag/${standing.team.name.toLowerCase().replace(/\s+/g, '-')}-${standing.team.id}`}
              className={`flex items-center justify-between py-1 px-2 hover:bg-gray-50 rounded ${rankClass}`}
            >
              <div className="flex items-center space-x-2">
                <span className="w-5 text-xs text-gray-600">{standing.rank}</span>
                <div className="relative h-4 w-4">
                  <Image
                    src={standing.team.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')}
                    alt={standing.team.name}
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="text-xs truncate max-w-[100px]">
                  {standing.team.name}
                </span>
              </div>
              <div className="text-xs font-medium">
                {standing.points}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
} 