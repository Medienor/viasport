"use client"

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Fuse from 'fuse.js';
import type { IndexedTeam, IndexedLeague } from '@/lib/searchIndex';
import { formatTime, createTeamSlug, createLeagueSlug } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

// First, install react-query
// npm install @tanstack/react-query

// Define the fixture type
interface Fixture {
  id: number;
  date: string;
  status: {
    short: string;
    elapsed?: number;
  };
  teams: {
    home: { id: number; name: string; logo: string };
    away: { id: number; name: string; logo: string };
  };
}

type SearchIndexItem = IndexedTeam | IndexedLeague;

// Add these constants at the top of the file
const RAPIDAPI_KEY = '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90';
const RAPIDAPI_HOST = 'api-football-v1.p.rapidapi.com';
const RAPIDAPI_BASE_URL = 'https://api-football-v1.p.rapidapi.com/v3';

const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchIndexItem[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const fuseRef = useRef<Fuse<SearchIndexItem> | null>(null);
  
  // Fetch live fixtures using React Query
  const { data: liveFixtures } = useQuery({
    queryKey: ['liveFixtures'],
    queryFn: async () => {
      const response = await fetch('/api/live-fixtures');
      return response.json();
    },
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  // Initialize Fuse index
  useEffect(() => {
    const initializeIndex = async () => {
      try {
        const response = await fetch('/searchIndex.json');
        if (!response.ok) {
          throw new Error('Failed to fetch search index');
        }
        const searchData: SearchIndexItem[] = await response.json();
        
        const fuseInstance = new Fuse<SearchIndexItem>(searchData, {
          keys: ['name'],
          threshold: 0.3,
        });
        
        fuseRef.current = fuseInstance;
      } catch (error) {
        console.error('Error initializing search index:', error);
      }
    };

    initializeIndex();
  }, []);

  // Single debounced search effect that handles both static and API search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!searchTerm || searchTerm.length < 2 || !fuseRef.current) {
        setSearchResults([]);
        return;
      }

      // First, search the static index
      const staticResults = fuseRef.current.search(searchTerm).map(result => result.item);
      
      // Deduplicate static results
      const uniqueStaticResults = staticResults.reduce((unique: SearchIndexItem[], item) => {
        const exists = unique.some(
          u => u.id === item.id && u.type === item.type
        );
        if (!exists) {
          unique.push(item);
        }
        return unique;
      }, []);

      // Set initial results from static index
      setSearchResults(uniqueStaticResults);

      // If we have few results (less than 5), try the API search
      if (uniqueStaticResults.length < 5) {
        try {
          // Parallel API calls for both teams and leagues
          const [teamsResponse, leaguesResponse] = await Promise.all([
            fetch(`${RAPIDAPI_BASE_URL}/teams?search=${encodeURIComponent(searchTerm)}`, {
              headers: {
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': RAPIDAPI_HOST
              }
            }),
            fetch(`${RAPIDAPI_BASE_URL}/leagues?search=${encodeURIComponent(searchTerm)}`, {
              headers: {
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': RAPIDAPI_HOST
              }
            })
          ]);

          const [teamsData, leaguesData] = await Promise.all([
            teamsResponse.json(),
            leaguesResponse.json()
          ]);

          // Transform API results to match our IndexedItem format
          const apiTeams: SearchIndexItem[] = (teamsData.response || []).map((team: any) => ({
            id: team.team.id,
            name: team.team.name,
            type: 'team',
            logo: team.team.logo,
            country: team.team.country
          }));

          const apiLeagues: SearchIndexItem[] = (leaguesData.response || []).map((league: any) => ({
            id: league.league.id,
            name: league.league.name,
            type: 'league',
            logo: league.league.logo,
            country: league.country.name
          }));

          // Combine all results and deduplicate
          const allResults = [...uniqueStaticResults];
          
          // Add API results while avoiding duplicates
          [...apiTeams, ...apiLeagues].forEach(apiItem => {
            const exists = allResults.some(
              existingItem => 
                existingItem.id === apiItem.id && 
                existingItem.type === apiItem.type
            );
            if (!exists) {
              allResults.push(apiItem);
            }
          });

          // Update state with combined results
          setSearchResults(allResults);
          
        } catch (error) {
          console.error('Error fetching API results:', error);
          // Keep showing static results if API fails
        }
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Filter live fixtures based on search term
  const filteredLiveFixtures = liveFixtures?.filter((fixture: Fixture) => 
    fixture.teams.home.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fixture.teams.away.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) ?? [];

  // Combine static and live results (no need to include API results as they're already in searchResults)
  const allResults = [...searchResults, ...filteredLiveFixtures];

  return (
    <div ref={searchRef} className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-transparent rounded-md leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Søk etter lag, ligaer, kamper..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
        />
      </div>
      
      {/* Search results dropdown */}
      {showResults && searchTerm.length >= 2 && (
        <div className="absolute mt-1 w-full bg-white rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
          {allResults.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-700">
              Ingen resultater funnet
            </div>
          ) : (
            <div>
              {/* Group results by type */}
              {(() => {
                const grouped = {
                  teams: allResults.filter(result => result.type === 'team'),
                  leagues: allResults.filter(result => result.type === 'league'),
                  fixtures: allResults.filter(result => result.type === 'fixture')
                };
                return (
                  <>
                    {/* Fixtures Section */}
                    {grouped.fixtures.length > 0 && (
                      <div>
                        <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 sticky top-0">
                          Kamper ({grouped.fixtures.length})
                        </div>
                        <div className="py-1">
                          {grouped.fixtures.map((result) => (
                            <Link
                              key={`fixture-${result.id}`}
                              href={`/fotball/kamp/${result.id}`}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onClick={() => setShowResults(false)}
                            >
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8 mr-3 flex items-center justify-center">
                                  {result.status?.short === 'LIVE' || ['1H', '2H', 'HT'].includes(result.status?.short || '') ? (
                                    <div className="flex flex-col items-center">
                                      <span className="text-xs px-2 py-0.5 rounded bg-red-600 text-white flex items-center">
                                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse mr-1"></span>
                                        LIVE
                                      </span>
                                      {result.status?.elapsed && (
                                        <span className="text-xs text-gray-500 mt-0.5">{result.status.elapsed}&apos;</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-500">{formatTime(result.date!)}</span>
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <div className="flex items-center">
                                    <div className="h-4 w-4 mr-2 relative">
                                      <Image 
                                        src={result.teams!.home.logo} 
                                        alt={result.teams!.home.name}
                                        fill
                                        className="object-contain"
                                      />
                                    </div>
                                    <span>{result.teams!.home.name}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <div className="h-4 w-4 mr-2 relative">
                                      <Image 
                                        src={result.teams!.away.logo} 
                                        alt={result.teams!.away.name}
                                        fill
                                        className="object-contain"
                                      />
                                    </div>
                                    <span>{result.teams!.away.name}</span>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Teams Section */}
                    {grouped.teams.length > 0 && (
                      <div>
                        <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 sticky top-0">
                          Lag ({grouped.teams.length})
                        </div>
                        <div className="py-1">
                          {grouped.teams.map((result) => (
                            <Link
                              key={`team-${result.id}-${result.league || 'api'}`}
                              href={`/lag/${createTeamSlug(result.name)}-${result.id}`}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onClick={() => setShowResults(false)}
                            >
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-6 w-6 mr-3 relative">
                                  <Image 
                                    src={result.logo!} 
                                    alt={result.name}
                                    fill
                                    className="object-contain"
                                  />
                                </div>
                                <div>
                                  <div className="font-medium">{result.name}</div>
                                  <div className="text-xs text-gray-500">
                                    Lag • {result.country}
                                  </div>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Leagues Section */}
                    {grouped.leagues.length > 0 && (
                      <div>
                        <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 sticky top-0">
                          Ligaer ({grouped.leagues.length})
                        </div>
                        <div className="py-1">
                          {grouped.leagues.map((result) => (
                            <Link
                              key={`league-${result.id}`}
                              href={`/fotball/liga/${createLeagueSlug(result.name)}-${result.id}`}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onClick={() => setShowResults(false)}
                            >
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-6 w-6 mr-3 relative">
                                  <Image 
                                    src={result.logo!} 
                                    alt={result.name}
                                    fill
                                    className="object-contain"
                                  />
                                </div>
                                <div>
                                  <div className="font-medium">{result.name}</div>
                                  <div className="text-xs text-gray-500">
                                    Liga • {result.country}
                                  </div>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar; 