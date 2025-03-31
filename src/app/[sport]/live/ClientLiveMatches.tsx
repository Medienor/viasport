"use client"

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createTeamSlug, createLeagueSlug } from '@/app/utils/slugUtils';
import { getStreamingProviders } from '@/utils/channelUtils';

interface ClientLiveMatchesProps {
  fixturesByLeague: Record<string, any[]>;
  sortedLeagues: string[];
  sport: string;
  liveLeagues?: Array<{
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
  }>;
}

export default function ClientLiveMatches({
  fixturesByLeague,
  sortedLeagues,
  sport,
  liveLeagues = [] // Provide default empty array
}: ClientLiveMatchesProps) {
  const router = useRouter();
  const [localFixturesByLeague, setLocalFixturesByLeague] = useState(fixturesByLeague);
  const [localSortedLeagues, setLocalSortedLeagues] = useState(sortedLeagues);
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Set up polling to refresh live match data every minute
  useEffect(() => {
    const refreshData = async () => {
      try {
        const response = await fetch(`/api/${sport}/live-matches`);
        const data = await response.json();
        
        if (data.fixturesByLeague && data.sortedLeagues) {
          setLocalFixturesByLeague(data.fixturesByLeague);
          setLocalSortedLeagues(data.sortedLeagues);
        }
      } catch (err) {
        console.error('Error refreshing live matches:', err);
      }
    };
    
    const intervalId = setInterval(refreshData, 60000);
    return () => clearInterval(intervalId);
  }, [sport]);
  
  // Handle match click
  const handleMatchClick = (matchId: number) => {
    router.push(`/${sport}/kamp/${matchId}`);
  };
  
  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Filter leagues based on search query
  const filteredDropdownLeagues = liveLeagues.filter(league => 
    league.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    league.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter leagues based on selection
  const filteredLeagues = selectedLeague === 'all' 
    ? localSortedLeagues 
    : localSortedLeagues.filter(id => id === selectedLeague);

  return (
    <div>
      {/* Custom Dropdown */}
      {liveLeagues && liveLeagues.length > 0 && (
        <div className="relative mb-6" ref={dropdownRef}>
          <button
            type="button"
            className="relative w-full bg-white border border-gray-300 rounded-lg shadow-sm pl-3 pr-10 py-3 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm"
            onClick={() => setIsOpen(!isOpen)}
          >
            <div className="flex items-center">
              {selectedLeague !== 'all' && (
                <div className="flex items-center">
                  {liveLeagues.find(l => l.id.toString() === selectedLeague)?.logo && (
                    <div className="flex-shrink-0 h-6 w-6 relative mr-3">
                      <Image
                        src={liveLeagues.find(l => l.id.toString() === selectedLeague)?.logo || ''}
                        alt=""
                        fill
                        className="object-contain rounded-full"
                      />
                    </div>
                  )}
                </div>
              )}
              <span className="block truncate">
                {selectedLeague === 'all' 
                  ? 'Alle ligaer' 
                  : `${liveLeagues.find(l => l.id.toString() === selectedLeague)?.country}: ${liveLeagues.find(l => l.id.toString() === selectedLeague)?.name}`
                }
              </span>
            </div>
            <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </span>
          </button>

          {/* Dropdown Options */}
          {isOpen && (
            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-96 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-hidden focus:outline-none sm:text-sm">
              {/* Search Input */}
              <div className="sticky top-0 z-10 bg-white px-3 py-2 border-b border-gray-200">
                <div className="relative">
                  <input
                    type="text"
                    className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-red-500 focus:border-red-500 sm:text-sm"
                    placeholder="Søk etter liga..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="overflow-auto max-h-72">
                {/* All Leagues Option */}
                <div
                  className={`
                    cursor-pointer select-none relative py-3 pl-3 pr-9 hover:bg-gray-50
                    ${selectedLeague === 'all' ? 'bg-red-50 text-red-600' : 'text-gray-900'}
                  `}
                  onClick={() => {
                    setSelectedLeague('all');
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                >
                  <span className="font-medium block truncate">
                    Alle ligaer ({liveLeagues.length})
                  </span>
                  {selectedLeague === 'all' && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-red-600">
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </div>

                {/* Filtered League Options */}
                {filteredDropdownLeagues.map((league) => (
                  <div
                    key={league.id}
                    className={`
                      cursor-pointer select-none relative py-3 pl-3 pr-9 hover:bg-gray-50
                      ${selectedLeague === league.id.toString() ? 'bg-red-50 text-red-600' : 'text-gray-900'}
                    `}
                    onClick={() => {
                      setSelectedLeague(league.id.toString());
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                  >
                    <div className="flex items-center">
                      {league.logo && (
                        <div className="flex-shrink-0 h-6 w-6 relative mr-3">
                          <Image
                            src={league.logo}
                            alt=""
                            fill
                            className="object-contain rounded-full"
                          />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium block truncate">
                          {league.name}
                        </span>
                        <span className="text-sm text-gray-500">
                          {league.country}
                        </span>
                      </div>
                    </div>
                    {selectedLeague === league.id.toString() && (
                      <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-red-600">
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </div>
                ))}

                {/* No results message */}
                {searchQuery && filteredDropdownLeagues.length === 0 && (
                  <div className="px-3 py-6 text-center text-sm text-gray-500">
                    Ingen ligaer funnet for "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Existing matches display */}
      {filteredLeagues.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Ingen live kamper i valgt liga.</p>
        </div>
      ) : (
        filteredLeagues.map((leagueId) => {
          const leagueFixtures = fixturesByLeague[leagueId];
          const leagueInfo = leagueFixtures[0].league;
          
          return (
            <div key={leagueId} className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center">
                  {leagueInfo.logo && (
                    <div className="flex-shrink-0 h-8 w-8 relative mr-3">
                      <Image
                        src={leagueInfo.logo}
                        alt={leagueInfo.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                  <h2 className="text-xl font-semibold text-gray-900">
                    <Link 
                      href={`/fotball/liga/${leagueInfo.name.toLowerCase().replace(/\s+/g, '-')}-${leagueInfo.id}`}
                      className="hover:text-blue-600"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {leagueInfo.name}
                    </Link>
                  </h2>
                </div>
              </div>

              {/* Desktop View */}
              <div className="hidden sm:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hjemmelag
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bortelag
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        KANAL
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leagueFixtures.map((fixture: any) => (
                      <tr 
                        key={fixture.fixture.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleMatchClick(fixture.fixture.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-white text-xs font-medium px-3 py-0.5 rounded-full flex items-center justify-center w-20 ${
                            fixture.fixture?.status?.short === 'HT' ? 'bg-green-600' : 'bg-red-600'
                          }`}>
                            {fixture.fixture?.status?.short === 'HT' ? (
                              <span className="text-white">PAUSE</span>
                            ) : (
                              <span className="inline-flex items-center">
                                <span className="w-1.5 h-1.5 bg-white bg-opacity-70 rounded-full animate-pulse mr-1.5"></span>
                                {fixture.fixture?.status?.elapsed || 0}&apos;
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {fixture.teams?.home?.logo && (
                              <div className="flex-shrink-0 h-6 w-6 relative">
                                <Image
                                  src={fixture.teams.home.logo}
                                  alt={fixture.teams?.home?.name || 'Home team'}
                                  fill
                                  className="object-contain"
                                />
                              </div>
                            )}
                            <div className="ml-3 text-sm font-medium text-gray-900">
                              <Link 
                                href={`/lag/${createTeamSlug(fixture.teams?.home?.name || '')}-${fixture.teams?.home?.id}`}
                                className="mr-3 text-sm font-medium text-gray-900 hover:text-blue-600"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {fixture.teams?.home?.name || 'Home Team'}
                              </Link>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <span className="font-bold text-base">
                            {fixture.goals.home} - {fixture.goals.away}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {fixture.teams?.away?.logo && (
                              <div className="flex-shrink-0 h-6 w-6 relative">
                                <Image
                                  src={fixture.teams.away.logo}
                                  alt={fixture.teams?.away?.name || 'Away team'}
                                  fill
                                  className="object-contain"
                                />
                              </div>
                            )}
                            <div className="ml-3 text-sm font-medium text-gray-900">
                              <Link 
                                href={`/lag/${createTeamSlug(fixture.teams?.away?.name || '')}-${fixture.teams?.away?.id}`}
                                className="mr-3 text-sm font-medium text-gray-900 hover:text-blue-600"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {fixture.teams?.away?.name || 'Away Team'}
                              </Link>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-2">
                            {getStreamingProviders(fixture.league.id).map((provider, index) => (
                              <div key={index} className="relative w-6 h-6">
                                <Image
                                  src={provider.icon}
                                  alt={provider.name}
                                  fill
                                  className="object-contain"
                                  title={provider.name}
                                />
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="sm:hidden divide-y divide-gray-200">
                {leagueFixtures.map((fixture: any) => (
                  <div
                    key={fixture.fixture.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleMatchClick(fixture.fixture.id)}
                  >
                    {/* Live indicator and time */}
                    <div className="flex justify-between items-center mb-3">
                      <span className={`text-white text-xs font-medium px-3 py-0.5 rounded-full flex items-center justify-center w-20 ${
                        fixture.fixture?.status?.short === 'HT' ? 'bg-green-600' : 'bg-red-600'
                      }`}>
                        {fixture.fixture?.status?.short === 'HT' ? (
                          <span className="text-white">PAUSE</span>
                        ) : (
                          <span className="inline-flex items-center">
                            <span className="w-1.5 h-1.5 bg-white bg-opacity-70 rounded-full animate-pulse mr-1.5"></span>
                            {fixture.fixture?.status?.elapsed || 0}&apos;
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Teams and Score */}
                    <div className="space-y-3">
                      {/* Home Team */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="relative h-6 w-6 flex-shrink-0">
                            <Image
                              src={fixture.teams.home.logo}
                              alt={fixture.teams.home.name}
                              fill
                              className="object-contain"
                            />
                          </div>
                          <Link 
                            href={`/lag/${createTeamSlug(fixture.teams.home.name)}-${fixture.teams.home.id}`}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {fixture.teams.home.name}
                          </Link>
                        </div>
                        <span className="text-base font-bold">{fixture.goals.home}</span>
                      </div>

                      {/* Away Team */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="relative h-6 w-6 flex-shrink-0">
                            <Image
                              src={fixture.teams.away.logo}
                              alt={fixture.teams.away.name}
                              fill
                              className="object-contain"
                            />
                          </div>
                          <Link 
                            href={`/lag/${createTeamSlug(fixture.teams.away.name)}-${fixture.teams.away.id}`}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {fixture.teams.away.name}
                          </Link>
                        </div>
                        <span className="text-base font-bold">{fixture.goals.away}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
} 