"use client"

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createTeamSlug, createLeagueSlug, createPlayerSlug, createMatchSlug } from '@/lib/utils';
import { XMarkIcon } from '@heroicons/react/24/outline';

// Define possible filter types in Norwegian
type FilterType = 'Alle' | 'Lag' | 'Ligaer' | 'Spillere' | 'Kamper';

// Define a base type for common properties
interface BaseIndexItem {
  id: number;
  name: string;
  logo?: string | null; // Make logo optional
}

// Define a type for match results (assuming API structure)
interface MatchIndexItem {
  type: 'match';
  id: number; // Fixture ID
  date: string; // ISO date string or formatted date
  homeTeam: { id: number; name: string; logo?: string | null };
  awayTeam: { id: number; name: string; logo?: string | null };
  status?: string; // e.g., 'NS', 'FT'
  // Add other relevant fields like league name if available
}

// Extend SearchIndexItem to include players and matches
type SearchIndexItem =
  | (BaseIndexItem & { type: 'team'; country?: string })
  | (BaseIndexItem & { type: 'league'; country?: string })
  | (BaseIndexItem & { type: 'player'; teamName?: string }) // Add player type
  | MatchIndexItem; // Add match type

const LOCAL_STORAGE_KEY = 'viasport_recent_searches';
const MAX_RECENT_SEARCHES = 5; // Limit the number of recent items

const SearchBar = ({ onSearchResultClick, mobileMode = false }: { onSearchResultClick?: () => void; mobileMode?: boolean }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchIndexItem[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('Alle');
  const [recentSearches, setRecentSearches] = useState<SearchIndexItem[]>([]); // <-- State for recent searches
  const searchRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    try {
      const storedRecent = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedRecent) {
        setRecentSearches(JSON.parse(storedRecent));
      }
    } catch (error) {
      console.error("Failed to load recent searches from localStorage:", error);
      localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear corrupted data
    }
  }, []);

  // Function to save recent searches to state and localStorage
  const addRecentSearch = (item: SearchIndexItem) => {
    setRecentSearches(prevRecent => {
      // Remove existing item if present (to move it to the top)
      const filtered = prevRecent.filter(r => !(r.id === item.id && r.type === item.type));
      // Add new item to the beginning and limit the list size
      const updatedRecent = [item, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedRecent));
      } catch (error) {
        console.error("Failed to save recent searches to localStorage:", error);
      }
      return updatedRecent;
    });
  };

  // Function to remove a specific recent search item
  const removeRecentSearch = (itemToRemove: SearchIndexItem, event: React.MouseEvent) => {
    event.preventDefault(); // Prevent link navigation if clicking the 'X'
    event.stopPropagation(); // Prevent closing the dropdown
    setRecentSearches(prevRecent => {
      const updatedRecent = prevRecent.filter(r => !(r.id === itemToRemove.id && r.type === itemToRemove.type));
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedRecent));
      } catch (error) {
        console.error("Failed to update recent searches in localStorage:", error);
      }
      return updatedRecent;
    });
  };

  // Function to clear all recent searches
  const clearRecentSearches = (event: React.MouseEvent) => {
     event.stopPropagation(); // Prevent closing the dropdown
     setRecentSearches([]);
     try {
       localStorage.removeItem(LOCAL_STORAGE_KEY);
     } catch (error) {
       console.error("Failed to clear recent searches from localStorage:", error);
     }
  };

  // API Fetch Effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!searchTerm || searchTerm.length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        const response = await fetch(`/api/search/teams?q=${encodeURIComponent(searchTerm)}`);
        const data = await response.json();
        
        // Process Teams
        const teams: SearchIndexItem[] = (data.teams || [])
          .filter((item: any) => item?.name)
          .map((item: any) => ({
            id: item.id,
            name: item.name,
            type: 'team', 
            logo: item.logo || '/placeholder-team.png',
            country: item.country || 'Unknown'
          }));

        // Process Leagues
        const leagues: SearchIndexItem[] = (data.leagues || [])
          .filter((item: any) => item?.name)
          .map((item: any) => ({
            id: item.id,
            name: item.name,
            type: 'league', 
            logo: item.logo || '/placeholder-league.png',
            country: item.country || 'Unknown'
          }));
          
        // Process Players
        const players: SearchIndexItem[] = (data.players || [])
          .filter((item: any) => item?.name)
          .map((item: any) => ({
            id: item.id,
            name: item.name,
            type: 'player',
            logo: item.logo || '/placeholder-player.png', // Use player placeholder
            teamName: item.teamName || 'Unknown Team' // Use team name from API
          }));

        // Process Matches (assuming API returns 'matches' array)
        const matches: SearchIndexItem[] = (data.matches || [])
          // Add basic validation for essential match data
          .filter((item: any) => item?.id && item?.homeTeam?.name && item?.awayTeam?.name && item?.date)
          .map((item: any) => ({
            id: item.id,
            type: 'match',
            date: item.date, // Ensure date is handled appropriately (string/Date)
            homeTeam: {
              id: item.homeTeam.id,
              name: item.homeTeam.name,
              logo: item.homeTeam.logo || '/placeholder-team.png' // Use team placeholder
            },
            awayTeam: {
              id: item.awayTeam.id,
              name: item.awayTeam.name,
              logo: item.awayTeam.logo || '/placeholder-team.png' // Use team placeholder
            },
            status: item.status?.short || 'Ukjent' // Example: using status short code
            // Add score or other details if needed/available
          }));

        // Combine all results
        const allResults = [...teams, ...leagues, ...players, ...matches]; // Add matches
        setSearchResults(allResults);
        
      } catch (error) {
        console.error('Error searching:', error);
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Effect to handle clicks outside the search component
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter results based on active filter
  const filteredResults = searchResults.filter(result => {
    if (activeFilter === 'Alle') return true;
    if (activeFilter === 'Lag') return result.type === 'team';
    if (activeFilter === 'Ligaer') return result.type === 'league';
    if (activeFilter === 'Spillere') return result.type === 'player'; // Add player filter case
    if (activeFilter === 'Kamper') return result.type === 'match'; // Add match filter case
    return false;
  });

  const filterButtons: FilterType[] = ['Alle', 'Lag', 'Ligaer', 'Spillere', 'Kamper'];

  // Helper function to render a single search result item (used for both recent and results)
  const renderResultItem = (result: SearchIndexItem, isRecent: boolean = false) => {
    const commonClasses = "block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-transparent";
    const linkProps = {
      className: `${commonClasses} flex items-center justify-between`, // Use flex for layout
      onClick: () => {
        if (!isRecent) addRecentSearch(result); // Add to recent only if it's a search result click
        setShowResults(false);
        onSearchResultClick?.();
      }
    };

    switch (result.type) {
      case 'team':
        return (
          <Link key={`team-${result.id}`} href={`/lag/${createTeamSlug(result.name || '')}-${result.id}`} {...linkProps}>
            <div className="flex items-center min-w-0 mr-2"> {/* Left side content */}
              <div className="flex-shrink-0 h-6 w-6 mr-3 relative">
                <Image src={result.logo || '/placeholder-team.png'} alt={result.name || 'Team logo'} fill className="object-contain dark:brightness-110" onError={(e) => e.currentTarget.src = '/placeholder-team.png'} />
              </div>
              <div className="truncate">
                <div className="font-medium dark:text-gray-200">{result.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Lag • {result.country || 'Unknown'}</div>
              </div>
            </div>
            {isRecent && ( // Show remove button only for recent items
              <button onClick={(e) => removeRecentSearch(result, e)} className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0">
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </Link>
        );
      case 'league':
        return (
          <Link key={`league-${result.id}`} href={`/fotball/liga/${createLeagueSlug(result.name || '')}-${result.id}`} {...linkProps}>
             <div className="flex items-center min-w-0 mr-2">
              <div className="flex-shrink-0 h-6 w-6 mr-3 relative">
                <Image src={result.logo || '/placeholder-league.png'} alt={result.name || 'League logo'} fill className="object-contain dark:brightness-110" onError={(e) => e.currentTarget.src = '/placeholder-league.png'} />
              </div>
              <div className="truncate">
                <div className="font-medium dark:text-gray-200">{result.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Liga • {result.country || 'Unknown'}</div>
              </div>
            </div>
             {isRecent && (
              <button onClick={(e) => removeRecentSearch(result, e)} className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0">
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </Link>
        );
      case 'player':
        return (
          <Link key={`player-${result.id}`} href={`/spillerprofil/${createPlayerSlug(result.name || '')}-${result.id}`} {...linkProps}>
             <div className="flex items-center min-w-0 mr-2">
              <div className="flex-shrink-0 h-6 w-6 mr-3 relative rounded-full overflow-hidden">
                <Image src={result.logo || '/placeholder-player.png'} alt={result.name || 'Player photo'} fill className="object-cover dark:brightness-110" onError={(e) => e.currentTarget.src = '/placeholder-player.png'} />
              </div>
              <div className="truncate">
                <div className="font-medium dark:text-gray-200">{result.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Spiller • {result.teamName || 'Ukjent lag'}</div>
              </div>
            </div>
             {isRecent && (
              <button onClick={(e) => removeRecentSearch(result, e)} className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0">
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </Link>
        );
      case 'match':
        // Helper function to format date (customize as needed) - Moved outside for clarity if needed elsewhere
        const formatMatchDate = (dateString: string) => {
            try {
                const date = new Date(dateString);
                // Example format: "Apr 21 FT" or "Apr 21 19:45"
                const datePart = date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }); // Using en-GB for Apr style
                const timePart = date.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
                // You might want different formatting based on result.status
                return result.status === 'FT' ? `${datePart} FT` : `${datePart} ${timePart}`;
            } catch (e) {
                return dateString; // Fallback
            }
        };
        return (
          <Link key={`match-${result.id}`} href={`/kamp/${createMatchSlug(result.homeTeam.name, result.awayTeam.name, result.id)}`} {...linkProps}>
            {/* Match specific layout */}
            <div className="flex items-center justify-between w-full">
                {/* Left side: Teams and Logos */}
                <div className="flex items-center space-x-2 flex-grow min-w-0 mr-2">
                    <div className="flex-shrink-0 h-5 w-5 relative">
                        <Image src={result.homeTeam.logo || '/placeholder-team.png'} alt={result.homeTeam.name} fill className="object-contain dark:brightness-110" onError={(e) => e.currentTarget.src = '/placeholder-team.png'} />
                    </div>
                    <div className="text-xs truncate">
                        <span className="font-medium dark:text-gray-200">{result.homeTeam.name}</span>
                        {/* Add score if available and match finished? */}
                        {/* <span className="text-gray-500"> vs </span> */}
                        <br /> {/* Stack team names */}
                        <span className="font-medium dark:text-gray-200">{result.awayTeam.name}</span>
                    </div>
                    <div className="flex-shrink-0 h-5 w-5 relative">
                        <Image src={result.awayTeam.logo || '/placeholder-team.png'} alt={result.awayTeam.name} fill className="object-contain dark:brightness-110" onError={(e) => e.currentTarget.src = '/placeholder-team.png'} />
                    </div>
                </div>
                {/* Right side: Score/Date/Status */}
                <div className="text-xs text-gray-500 text-right pl-2 whitespace-nowrap flex-shrink-0">
                    {/* Add score display logic here if available */}
                    {/* <div>{result.score?.home ?? '-'}</div>
                    <div>{result.score?.away ?? '-'}</div> */}
                    <div className="mt-1 dark:text-gray-400">{formatMatchDate(result.date)}</div>
                </div>
            </div>
             {isRecent && ( // Add remove button container for matches
              <div className="ml-2 flex-shrink-0"> {/* Add margin */}
                <button onClick={(e) => removeRecentSearch(result, e)} className="p-1 text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </Link>
        );
      default:
        return null;
    }
  };

  return (
    <div ref={searchRef} className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border rounded-md leading-5 
            bg-gray-50 dark:bg-dark-nav 
            border-gray-200 dark:border-dark-border 
            text-gray-900 dark:text-gray-100
            placeholder-gray-500 dark:placeholder-gray-400/70
            focus:outline-none focus:border-gray-300 dark:focus:border-dark-border
            transition-colors duration-200 sm:text-sm"
          placeholder="Søk etter lag, ligaer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setShowResults(true)}
        />
      </div>
      
      {/* Search results dropdown/area */}
      {(showResults || mobileMode) && (
        <div className={`
          ${mobileMode
            ? 'mt-4'
            : 'absolute mt-1 w-[32rem] shadow-lg z-50 max-h-[70vh] rounded-md'
          }
          bg-white dark:bg-dark-nav border border-gray-200 dark:border-dark-border flex flex-col
          ${mobileMode ? '' : 'overflow-y-auto'}
        `}>
          {/* --- Show Recent Searches OR Filters/Results --- */}
          {searchTerm.length < 2 ? (
            // --- Recent Searches Section ---
            recentSearches.length > 0 ? (
              <div className="flex-grow overflow-y-auto"> {/* Make recent section scrollable if needed */}
                <div className="flex justify-between items-center px-4 py-2 bg-gray-50 dark:bg-dark-nav border-b border-gray-100 dark:border-dark-border">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">Nylig</h3>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    Tøm
                  </button>
                </div>
                <div className="py-1">
                  {recentSearches.map((recent) => renderResultItem(recent, true))}
                </div>
              </div>
            ) : (
              // Message when no recent searches and input is empty
              !mobileMode && <div className="px-4 py-6 text-sm text-center text-gray-500 dark:text-gray-400">
                Ingen nylige søk.
              </div>
              // Optionally hide this message in mobileMode or show the "type 2 chars" message directly
            )
          ) : (
            // --- Filters and Search Results Section ---
            <>
              {/* Filter Buttons Section */}
              {(searchResults.length > 0 || searchTerm.length >= 2) && ( // Keep filters visible while typing
                <div className="p-2 bg-gray-50 dark:bg-dark-nav border-b border-gray-100 dark:border-dark-border sticky top-0 z-10">
                  <div className="flex space-x-2 pb-1 overflow-x-auto hide-scrollbar">
                    {filterButtons.map(filter => (
                      <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors duration-150 ${
                          activeFilter === filter
                            ? 'bg-gray-900 text-white dark:bg-[#ff6b00] dark:text-white'
                            : 'bg-gray-100 dark:bg-[#222222] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#ff6b00] dark:hover:text-white'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Results Section */}
              <div className={`flex-grow ${mobileMode ? 'overflow-y-auto max-h-[calc(100vh-10rem)]' : ''}`}>
                {filteredResults.length === 0 && searchTerm.length >= 2 ? (
                  <div className="px-4 py-6 text-sm text-center text-gray-500 dark:text-gray-400">
                    Ingen resultater funnet for "{searchTerm}"
                    {activeFilter !== 'Alle' && ` i ${activeFilter.toLowerCase()}`}
                  </div>
                ) : (
                  <div>
                    {(() => {
                      // Grouping logic remains the same
                      const grouped = {
                        teams: (activeFilter === 'Alle' || activeFilter === 'Lag')
                          ? filteredResults.filter((r): r is Extract<SearchIndexItem, { type: 'team' }> => r.type === 'team')
                          : [],
                        leagues: (activeFilter === 'Alle' || activeFilter === 'Ligaer')
                          ? filteredResults.filter((r): r is Extract<SearchIndexItem, { type: 'league' }> => r.type === 'league')
                          : [],
                        players: (activeFilter === 'Alle' || activeFilter === 'Spillere')
                          ? filteredResults.filter((r): r is Extract<SearchIndexItem, { type: 'player' }> => r.type === 'player')
                          : [],
                        matches: (activeFilter === 'Alle' || activeFilter === 'Kamper')
                          ? filteredResults.filter((r): r is MatchIndexItem => r.type === 'match')
                          : [],
                      };
                      const showTeamHeader = activeFilter === 'Alle' && grouped.teams.length > 0;
                      const showLeagueHeader = activeFilter === 'Alle' && grouped.leagues.length > 0;
                      const showPlayerHeader = activeFilter === 'Alle' && grouped.players.length > 0;
                      const showMatchHeader = activeFilter === 'Alle' && grouped.matches.length > 0;

                      return (
                        <>
                          {/* Teams Section */}
                          {grouped.teams.length > 0 && (
                            <div>
                              {showTeamHeader && (
                                <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark-nav border-b border-gray-100 dark:border-dark-border sticky top-[53px] z-10">
                                  Lag ({grouped.teams.length})
                                </div>
                              )}
                              <div className="py-1">
                                {grouped.teams.map((result) => renderResultItem(result))}
                              </div>
                            </div>
                          )}

                          {/* Leagues Section */}
                          {grouped.leagues.length > 0 && (
                            <div>
                              {showLeagueHeader && (
                                <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark-nav border-b border-gray-100 dark:border-dark-border sticky top-[53px] z-10">
                                  Ligaer ({grouped.leagues.length})
                                </div>
                              )}
                              <div className="py-1">
                                {grouped.leagues.map((result) => renderResultItem(result))}
                              </div>
                            </div>
                          )}

                          {/* Players Section */}
                          {grouped.players.length > 0 && (
                            <div>
                              {showPlayerHeader && (
                                <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark-nav border-b border-gray-100 dark:border-dark-border sticky top-[53px] z-10">
                                  Spillere ({grouped.players.length})
                                </div>
                              )}
                              <div className="py-1">
                                {grouped.players.map((result) => renderResultItem(result))}
                              </div>
                            </div>
                          )}

                          {/* Matches Section */}
                          {grouped.matches.length > 0 && (
                            <div>
                              {showMatchHeader && (
                                <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark-nav border-b border-gray-100 dark:border-dark-border sticky top-[53px] z-10">
                                  Kamper ({grouped.matches.length})
                                </div>
                              )}
                              <div className="py-1">
                                {grouped.matches.map((result) => renderResultItem(result))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar; 