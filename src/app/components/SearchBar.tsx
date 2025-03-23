"use client"

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { IndexedTeam, IndexedLeague } from '@/lib/searchIndex';
import { createTeamSlug, createLeagueSlug } from '@/lib/utils';

type SearchIndexItem = IndexedTeam | IndexedLeague;

const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchIndexItem[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  // Debounced search effect that uses RapidAPI directly
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!searchTerm || searchTerm.length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        console.log('Searching for:', searchTerm);
        
        // Parallel API calls for teams and leagues
        const [teamsResponse, leaguesResponse] = await Promise.all([
          fetch(`/api/football/search_for_teams?search=${encodeURIComponent(searchTerm)}`),
          fetch(`/api/football/search_for_leagues?search=${encodeURIComponent(searchTerm)}`)
        ]);
        
        const teamsData = teamsResponse.ok ? await teamsResponse.json() : { response: [] };
        const leaguesData = leaguesResponse.ok ? await leaguesResponse.json() : { response: [] };
        
        console.log('Teams search response:', teamsData);
        console.log('Leagues search response:', leaguesData);
        
        // Transform API results to match our IndexedItem format
        const teams: SearchIndexItem[] = (teamsData.response || []).map((team: any) => ({
          id: team.team.id,
          name: team.team.name,
          type: 'team',
          logo: team.team.logo,
          country: team.team.country
        }));

        const leagues: SearchIndexItem[] = (leaguesData.response || []).map((league: any) => ({
          id: league.league.id,
          name: league.league.name,
          type: 'league',
          logo: league.league.logo,
          country: league.country.name
        }));

        // Combine and deduplicate results
        const allResults: SearchIndexItem[] = [];
        
        // Add all teams and leagues while avoiding duplicates
        [...teams, ...leagues].forEach(item => {
          const exists = allResults.some(
            existingItem => 
              existingItem.id === item.id && 
              existingItem.type === item.type
          );
          if (!exists) {
            allResults.push(item);
          }
        });

        // Update state with results
        setSearchResults(allResults);
        
      } catch (error) {
        console.error('Error fetching search results:', error);
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

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
          placeholder="Søk etter lag, ligaer..."
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
          {searchResults.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-700">
              Ingen resultater funnet
            </div>
          ) : (
            <div>
              {/* Group results by type */}
              {(() => {
                const grouped = {
                  teams: searchResults.filter(result => result.type === 'team'),
                  leagues: searchResults.filter(result => result.type === 'league')
                };
                return (
                  <>
                    {/* Teams Section */}
                    {grouped.teams.length > 0 && (
                      <div>
                        <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 sticky top-0">
                          Lag ({grouped.teams.length})
                        </div>
                        <div className="py-1">
                          {grouped.teams.map((result) => (
                            <Link
                              key={`team-${result.id}`}
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