"use client"

import { useState, useRef, useEffect, useMemo } from 'react';
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
  liveLeagues = []
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
  
  // Get active leagues (those with live or upcoming matches today)
  const activeLeagues = useMemo(() => {
    const activeLeagueIds = new Set([
      ...(fixturesByLeague.live?.map(f => f.league.id) || []),
      ...(fixturesByLeague.upcoming?.map(f => f.league.id) || [])
    ]);

    return liveLeagues.filter(league => activeLeagueIds.has(league.id));
  }, [fixturesByLeague, liveLeagues]);

  // Get filtered leagues based on selection
  const filteredLeagues = useMemo(() => {
    if (selectedLeague === 'all') {
      return Array.from(new Set([
        ...(fixturesByLeague.live?.map(f => f.league.id) || []),
        ...(fixturesByLeague.upcoming?.map(f => f.league.id) || [])
      ]));
    }
    return [parseInt(selectedLeague)];
  }, [selectedLeague, fixturesByLeague]);

  // Helper function to format match status
  const getMatchStatus = (fixture: any) => {
    if (fixture.fixture?.status?.short === 'FT') {
      return (
        <span className="text-gray-600 text-sm">
          FERDIG
        </span>
      );
    } else if (fixture.fixture?.status?.short === 'LIVE' || fixture.fixture?.status?.short === 'HT') {
      return (
        <span className={`text-white text-xs font-medium px-3 py-0.5 rounded-full flex items-center justify-center w-20 ${
          fixture.fixture?.status?.short === 'HT' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {fixture.fixture?.status?.short === 'HT' ? (
            <span className="text-white">PAUSE</span>
          ) : (
            <span className="inline-flex items-center">
              <span className="w-1.5 h-1.5 bg-white bg-opacity-70 rounded-full animate-pulse mr-1.5"></span>
              SPILLER NÅ
            </span>
          )}
        </span>
      );
    } else {
      // For upcoming matches, show the time
      return (
        <span className="text-gray-600 text-sm">
          {new Date(fixture.fixture.date).toLocaleTimeString('no-NO', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      );
    }
  };

  // Combine live and upcoming matches by league
  const getLeagueFixtures = (leagueId: number) => {
    const liveMatches = fixturesByLeague.live?.filter(
      (fixture: any) => fixture.league.id === leagueId
    ) || [];
    
    const upcomingMatches = fixturesByLeague.upcoming?.filter(
      (fixture: any) => fixture.league.id === leagueId
    ) || [];

    // Sort upcoming matches by time
    const sortedUpcoming = upcomingMatches.sort((a: any, b: any) => 
      new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime()
    );

    // Live matches first, then upcoming
    return [...liveMatches, ...sortedUpcoming];
  };

  return (
    <div>
      {/* League Selector */}
      {activeLeagues.length > 0 && (
        <div className="relative mb-6">
          <button
            type="button"
            className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 sm:text-sm"
            onClick={() => setIsOpen(!isOpen)}
          >
            <div className="flex items-center">
              {selectedLeague !== 'all' && (
                <div className="flex-shrink-0 h-6 w-6 relative mr-3">
                  {activeLeagues.find(l => l.id.toString() === selectedLeague)?.logo && (
                    <Image
                      src={activeLeagues.find(l => l.id.toString() === selectedLeague)?.logo || ''}
                      alt=""
                      fill
                      className="object-contain rounded-full"
                    />
                  )}
                </div>
              )}
              <span className="block truncate">
                {selectedLeague === 'all' 
                  ? 'Alle ligaer' 
                  : activeLeagues.find(l => l.id.toString() === selectedLeague)?.name || ''
                }
              </span>
            </div>
            <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </span>
          </button>

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
                    Alle ligaer ({activeLeagues.length})
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
                {activeLeagues
                  .filter(league => 
                    league.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    league.country.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((league) => (
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
                {searchQuery && !activeLeagues.filter(league => 
                  league.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  league.country.toLowerCase().includes(searchQuery.toLowerCase())
                ).length && (
                  <div className="px-3 py-6 text-center text-sm text-gray-500">
                    Ingen ligaer funnet for "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No matches message */}
      {filteredLeagues.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Ingen live eller kommende kamper i valgt liga i dag.</p>
        </div>
      ) : (
        filteredLeagues.map((leagueId) => {
          const leagueFixtures = getLeagueFixtures(leagueId);
          const league = activeLeagues.find(l => l.id === leagueId);

          if (!leagueFixtures.length) return null;

          return (
            <div key={leagueId} className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center">
                  {league?.logo && (
                    <div className="flex-shrink-0 h-8 w-8 relative mr-3">
                      <Image
                        src={league.logo}
                        alt={league.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                  <h2 className="text-xl font-semibold text-gray-900">
                    <Link 
                      href={`/fotball/liga/${league?.name.toLowerCase().replace(/\s+/g, '-')}-${league?.id}`}
                      className="hover:text-blue-600"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {league?.name}
                    </Link>
                  </h2>
                </div>
              </div>

              <div className="mt-4">
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
                            {getMatchStatus(fixture)}
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
                      <div className="flex justify-between items-center mb-3">
                        {getMatchStatus(fixture)}
                      </div>
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
            </div>
          );
        })
      )}
    </div>
  );
} 