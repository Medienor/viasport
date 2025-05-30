'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { favoriteLeaguesManager } from '@/utils/favoriteLeagues';
import { favoriteTeamsManager } from '@/utils/favoriteTeams';

interface League {
  id: number;
  name: string;
  country?: string;
  type?: string;
  flag?: string;
}

interface Team {
  id: number;
  name: string;
  country?: string;
  logo?: string;
  code?: string;
  founded?: number;
  national?: boolean;
}

interface Country {
  name: string;
  flag: string;
}

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'league' | 'team';
}

// Popular leagues not on homepage
const popularLeagues: League[] = [
  { id: 88, name: 'Eredivisie', country: 'Nederland', type: 'FOTBALL' },
  { id: 94, name: 'Primeira Liga', country: 'Portugal', type: 'FOTBALL' },
  { id: 144, name: 'Jupiler Pro League', country: 'Belgia', type: 'FOTBALL' },
  { id: 253, name: 'Major League Soccer', country: 'USA', type: 'FOTBALL' },
  { id: 203, name: 'Süper Lig', country: 'Tyrkia', type: 'FOTBALL' }
];

const popularTeams: Team[] = [
  { id: 85, name: 'Paris Saint Germain', country: 'France' },
  { id: 489, name: 'AC Milan', country: 'Italy' },
  { id: 157, name: 'Bayern Munich', country: 'Germany' },
  { id: 165, name: 'Borussia Dortmund', country: 'Germany' },
  { id: 529, name: 'Barcelona', country: 'Spain' }
];

export default function AddItemModal({ isOpen, onClose, type }: AddItemModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<(League | Team)[]>([]);
  const [recentSearches, setRecentSearches] = useState<(League | Team)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [favoriteLeagueIds, setFavoriteLeagueIds] = useState<Set<number>>(new Set());
  const [favoriteTeamIds, setFavoriteTeamIds] = useState<Set<number>>(new Set());
  const [selectedCountry, setSelectedCountry] = useState<Country>({ name: 'Norway', flag: 'https://viasport.b-cdn.net/flags/no.svg' });
  const [countries, setCountries] = useState<Country[]>([]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearchTerm, setCountrySearchTerm] = useState('');
  const [tooltipData, setTooltipData] = useState<{
    show: boolean;
    text: string;
    x: number;
    y: number;
  }>({ show: false, text: '', x: 0, y: 0 });
  const supabase = createClientComponentClient();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage when modal opens
  const loadRecentSearches = useCallback(() => {
    const storageKey = `recentSearches_${type}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Error parsing recent searches:', error);
        setRecentSearches([]);
      }
    } else {
      setRecentSearches([]);
    }
  }, [type]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSearchResults([]);
      setShowCountryDropdown(false);
      setCountrySearchTerm('');
      
      // Only load countries for leagues
      if (type === 'league') {
        setSelectedCountry({ name: 'Norway', flag: 'https://viasport.b-cdn.net/flags/no.svg' });
        loadCountries();
      }
      
      loadRecentSearches();
    }
  }, [isOpen, type, loadRecentSearches]);

  // Load countries when modal opens - only for leagues
  const loadCountries = async () => {
    try {
      const { data, error } = await supabase
        .from('leagues')
        .select('country, flag')
        .not('country', 'is', null)
        .not('flag', 'is', null);

      if (error) throw error;

      // Create unique countries list
      const uniqueCountries = data.reduce((acc: Country[], league) => {
        if (!acc.find(c => c.name === league.country)) {
          acc.push({
            name: league.country,
            flag: league.flag
          });
        }
        return acc;
      }, []);

      // Add "Alle" option at the beginning
      const allCountries = [
        { name: 'Alle', flag: '🌍' },
        ...uniqueCountries.sort((a, b) => a.name.localeCompare(b.name))
      ];

      setCountries(allCountries);
    } catch (error) {
      console.error('Error loading countries:', error);
      // Fallback countries
      setCountries([
        { name: 'Alle', flag: '🌍' },
        { name: 'Norway', flag: 'https://viasport.b-cdn.net/flags/no.svg' },
        { name: 'England', flag: 'https://viasport.b-cdn.net/flags/gb-eng.svg' },
        { name: 'Spain', flag: 'https://viasport.b-cdn.net/flags/es.svg' },
        { name: 'Germany', flag: 'https://viasport.b-cdn.net/flags/de.svg' },
        { name: 'France', flag: 'https://viasport.b-cdn.net/flags/fr.svg' },
        { name: 'Italy', flag: 'https://viasport.b-cdn.net/flags/it.svg' }
      ]);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
        setCountrySearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load favorite IDs when modal opens
  useEffect(() => {
    if (isOpen) {
      if (type === 'league') {
        const favorites = favoriteLeaguesManager.getFavorites();
        const favoriteIds = new Set(favorites.map(fav => fav.id));
        setFavoriteLeagueIds(favoriteIds);
      } else {
        const favorites = favoriteTeamsManager.getFavorites();
        const favoriteIds = new Set(favorites.map(fav => fav.id));
        setFavoriteTeamIds(favoriteIds);
      }
    }
  }, [isOpen, type]);

  // Save to recent searches
  const saveToRecentSearches = (item: League | Team) => {
    const storageKey = `recentSearches_${type}`;
    const updated = [item, ...recentSearches.filter(r => r.id !== item.id)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  // Handle tooltip show
  const showTooltip = useCallback((event: React.MouseEvent, text: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipData({
      show: true,
      text,
      x: rect.left + rect.width / 2,
      y: rect.top - 30
    });
  }, []);

  // Handle tooltip hide
  const hideTooltip = useCallback(() => {
    setTooltipData(prev => ({ ...prev, show: false }));
  }, []);

  // Updated search functionality
  useEffect(() => {
    const searchDatabase = async () => {
      try {
        if (type === 'league') {
          let query = supabase
            .from('leagues')
            .select('id, name, country, type, flag')
            .limit(20);

          // If there's a search term, filter by name
          if (searchTerm.length >= 2) {
            query = query.ilike('name', `%${searchTerm}%`);
          }

          // Add country filter if not "Alle"
          if (selectedCountry.name !== 'Alle') {
            query = query.eq('country', selectedCountry.name);
          }

          // Order by name for better presentation
          query = query.order('name');

          const { data, error } = await query;

          if (error) throw error;
          setSearchResults(data || []);
        } else {
          // Team search - no country filter, just search by name
          if (searchTerm.length >= 2) {
            const { data, error } = await supabase
              .from('teams')
              .select('id, name, country, logo, code, founded, national')
              .ilike('name', `%${searchTerm}%`)
              .limit(20)
              .order('name');

            if (error) throw error;
            setSearchResults(data || []);
          } else {
            setSearchResults([]);
          }
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    // For leagues: show loading when searching or when country changes
    // For teams: only show loading when searching
    if (searchTerm.length >= 2 || (type === 'league' && selectedCountry.name !== 'Alle')) {
      setIsLoading(true);
      const timeoutId = setTimeout(searchDatabase, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setIsLoading(false);
    }
  }, [searchTerm, selectedCountry, type, supabase]);

  // Filter countries based on search
  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(countrySearchTerm.toLowerCase())
  );

  // Handle country selection
  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setShowCountryDropdown(false);
    setCountrySearchTerm('');
    // Clear current search results to trigger new search
    if (searchTerm.length >= 2) {
      setSearchResults([]);
    }
  };

  // Check if a league is already favorited
  const isLeagueFavorited = (leagueId: number) => {
    return favoriteLeagueIds.has(leagueId);
  };

  // Check if a team is already favorited
  const isTeamFavorited = (teamId: number) => {
    return favoriteTeamIds.has(teamId);
  };

  const handleAddItem = async (item: League | Team) => {
    try {
      if (type === 'league') {
        const league = item as League;
        
        // Check if league is already favorited
        const isFavorited = isLeagueFavorited(league.id);
        
        if (isFavorited) {
          // Remove from favorites
          favoriteLeaguesManager.removeFavorite(league.id);
          
          // Update local state
          setFavoriteLeagueIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(league.id);
            return newSet;
          });
          
          console.log('League removed from favorites:', league.name);
        } else {
          // Add to favorites
          const storageKey = 'viasport-favorite-leagues';
          const existingFavorites = localStorage.getItem(storageKey);
          let favorites: League[] = [];
          
          if (existingFavorites) {
            try {
              favorites = JSON.parse(existingFavorites);
            } catch (error) {
              console.error('Error parsing favorites:', error);
            }
          }
          
          // Check if league already exists (double check)
          const existingIndex = favorites.findIndex(fav => fav.id === league.id);
          if (existingIndex === -1) {
            // Add new league to the beginning of the array
            const newLeague = {
              id: league.id,
              name: league.name,
              country: league.country,
              type: league.type || 'FOTBALL'
            };
            
            favorites.unshift(newLeague);
            
            // Limit to 20 favorite leagues to keep localStorage manageable
            if (favorites.length > 20) {
              favorites = favorites.slice(0, 20);
            }
            
            localStorage.setItem(storageKey, JSON.stringify(favorites));
            
            // Update local state
            setFavoriteLeagueIds(prev => new Set(prev).add(league.id));
            
            console.log('League added to favorites:', newLeague);
          }
        }
        
        // Dispatch custom event to update the UI
        window.dispatchEvent(new CustomEvent('favoriteLeaguesChanged'));
        
      } else {
        // Handle team addition/removal
        const team = item as Team;
        const isFavorited = isTeamFavorited(team.id);
        
        if (isFavorited) {
          // Remove from favorites
          favoriteTeamsManager.removeFavorite(team.id);
          
          // Update local state
          setFavoriteTeamIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(team.id);
            return newSet;
          });
          
          console.log('Team removed from favorites:', team.name);
        } else {
          // Add to favorites
          const newTeam = {
            id: team.id,
            name: team.name,
            country: team.country,
            logo: team.logo
          };
          
          favoriteTeamsManager.addFavorite(newTeam);
          
          // Update local state
          setFavoriteTeamIds(prev => new Set(prev).add(team.id));
          
          console.log('Team added to favorites:', newTeam);
        }
      }
      
      // Save to recent searches
      saveToRecentSearches(item);
      
    } catch (error) {
      console.error('Error handling item:', error);
    }
  };

  if (!isOpen) return null;

  const showRecentSearches = recentSearches.length > 0 && searchTerm.length < 2 && (type === 'team' || selectedCountry.name === 'Alle');
  const showPopularItems = searchTerm.length < 2 && (type === 'team' || selectedCountry.name === 'Alle');
  const showSearchResults = searchTerm.length >= 2 || (type === 'league' && selectedCountry.name !== 'Alle' && searchResults.length > 0);

  const renderItem = (item: League | Team) => {
    const isLeague = type === 'league';
    const isFavorited = isLeague ? isLeagueFavorited(item.id) : isTeamFavorited(item.id);
    
    return (
      <div
        key={item.id}
        className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-[#333333] cursor-pointer transition-colors duration-150"
        onClick={() => handleAddItem(item)}
      >
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="relative w-8 h-8 flex-shrink-0">
            <Image
              src={isLeague 
                ? `https://viasport.b-cdn.net/football/leagues/${item.id}.png`
                : ((item as Team).logo || `https://viasport.b-cdn.net/football/teams/${item.id}.png`)
              }
              alt={item.name}
              fill
              className="object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {item.name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {item.country?.toUpperCase()}
            </div>
          </div>
        </div>
        
        {/* Star icon */}
        <div
          className="flex-shrink-0 ml-2"
          onMouseEnter={(e) => showTooltip(e, isFavorited ? 'Allerede i favoritter' : `Legg til ${isLeague ? 'liga' : 'lag'}`)}
          onMouseLeave={hideTooltip}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 transition-colors duration-150 ${
              isFavorited 
                ? 'text-yellow-400 fill-current' 
                : 'text-gray-400 hover:text-yellow-400'
            }`}
            fill={isFavorited ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Legg til {type === 'league' ? 'liga' : 'lag'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Section */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            {/* Search Input with Flag (only for leagues) */}
            <div className="relative">
              <input
                type="text"
                placeholder={`Søk etter ${type === 'league' ? 'liga' : 'lag'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 ${type === 'league' ? 'pr-16' : 'pr-4'} py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#222222] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>

              {/* Country Filter - only show for leagues */}
              {type === 'league' && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2" ref={dropdownRef}>
                  <button
                    onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                    className="flex items-center space-x-1 px-2 py-1 hover:bg-gray-100 dark:hover:bg-[#333333] rounded transition-colors"
                  >
                    {selectedCountry.flag === '🌍' ? (
                      <span className="text-lg">🌍</span>
                    ) : (
                      <div className="relative w-6 h-4">
                        <Image
                          src={selectedCountry.flag}
                          alt={selectedCountry.name}
                          fill
                          className="object-cover rounded-sm"
                        />
                      </div>
                    )}
                    <svg
                      className={`w-3 h-3 text-gray-400 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Country Dropdown */}
                  {showCountryDropdown && (
                    <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-[#222222] border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10 max-h-60 overflow-hidden">
                      {/* Country Search */}
                      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                        <input
                          type="text"
                          placeholder="Søk land..."
                          value={countrySearchTerm}
                          onChange={(e) => setCountrySearchTerm(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        />
                      </div>
                      
                      {/* Country List */}
                      <div className="max-h-40 overflow-y-auto">
                        {filteredCountries.map((country) => (
                          <button
                            key={country.name}
                            onClick={() => handleCountrySelect(country)}
                            className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#333333] transition-colors text-left"
                          >
                            {country.flag === '🌍' ? (
                              <span className="text-lg">🌍</span>
                            ) : (
                              <div className="relative w-6 h-4 flex-shrink-0">
                                <Image
                                  src={country.flag}
                                  alt={country.name}
                                  fill
                                  className="object-cover rounded-sm"
                                />
                              </div>
                            )}
                            <span className="text-sm text-gray-900 dark:text-white">
                              {country.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="flex-1 overflow-y-auto">
          {/* Search Results or Country Leagues */}
          {(searchTerm.length >= 2 || (type === 'league' && selectedCountry.name !== 'Alle')) && (
            <div>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : searchResults.length > 0 ? (
                <div>
                  <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide">
                      {searchTerm.length >= 2 ? 'Søkeresultater' : `${selectedCountry.name} ligaer`}
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {searchResults.map(renderItem)}
                  </div>
                </div>
              ) : (
                <div className="px-6 py-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchTerm.length >= 2 ? (
                      <>
                        Ingen resultater funnet for "{searchTerm}"
                        {type === 'league' && selectedCountry.name !== 'Alle' && (
                          <span> i {selectedCountry.name}</span>
                        )}
                      </>
                    ) : (
                      `Ingen ligaer funnet for ${selectedCountry.name}`
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Recent Searches - show when no search term and (for teams OR leagues with "Alle" selected) */}
          {searchTerm.length < 2 && (type === 'team' || selectedCountry.name === 'Alle') && recentSearches.length > 0 && (
            <div>
              <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide">
                  Nylige søk
                </h3>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentSearches.slice(0, 5).map(renderItem)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tooltip */}
      {tooltipData.show && (
        <div
          className="fixed z-50 bg-[#222222] text-white rounded-lg shadow-lg pointer-events-none"
          style={{
            left: tooltipData.x,
            top: tooltipData.y,
            transform: 'translateX(-50%)',
            fontSize: '10px',
            padding: '8px 12px'
          }}
        >
          {tooltipData.text}
          <div 
            className="absolute left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#222222]"
            style={{ top: '100%' }}
          ></div>
        </div>
      )}
    </div>
  );
} 