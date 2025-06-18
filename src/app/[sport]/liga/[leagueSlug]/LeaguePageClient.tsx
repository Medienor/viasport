"use client"

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRightIcon } from '@heroicons/react/24/solid';
import { BASE_URL, headers } from '@/app/services/sportApi';
import { createPlayerSlug, createTeamSlugWithId } from '@/app/utils/slugUtils';
import { getStreamingProviders } from '@/utils/channelUtils';
import LeagueLatestVideo from '@/app/components/LeagueLatestVideo';

// Format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
}

// Format time
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('nb-NO', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Add this helper function to check if a match is live
function isMatchLive(fixture: any): boolean {
  return fixture.fixture.status.short === 'LIVE' || 
         fixture.fixture.status.short === '1H' || 
         fixture.fixture.status.short === '2H' || 
         fixture.fixture.status.short === 'HT' || 
         fixture.fixture.status.short === 'ET' || 
         fixture.fixture.status.short === 'BT' || 
         fixture.fixture.status.short === 'P' || 
         fixture.fixture.status.short === 'SUSP' || 
         fixture.fixture.status.short === 'INT' || 
         fixture.fixture.status.short === 'PEN';
}

// Add this helper function to check if a match is completed
function isMatchCompleted(fixture: any): boolean {
  return fixture.fixture.status.short === 'FT' || 
         fixture.fixture.status.short === 'AET' || 
         fixture.fixture.status.short === 'PEN' || 
         fixture.fixture.status.short === 'AWD' || 
         fixture.fixture.status.short === 'WO';
}

interface LeaguePageClientProps {
  sport: string;
  leagueData: any;
  standings: any[];
  fixtures: any[];
  topScorers: any[];
  currentSeason: number;
  availableSeasons: number[];
}

export default function LeaguePageClient({
  sport,
  leagueData,
  standings: initialStandings,
  fixtures,
  topScorers,
  currentSeason,
  availableSeasons
}: LeaguePageClientProps) {
  // State for selected season
  const [selectedSeason, setSelectedSeason] = useState<number>(currentSeason);
  // State for standings data
  const [standings, setStandings] = useState(initialStandings);
  // State for loading indicator
  const [isLoading, setIsLoading] = useState(false);
  // State for showing all fixtures or just next 90 days
  const [showAllFixtures, setShowAllFixtures] = useState(false);
  
  // Format season display for the dropdown
  function formatSeasonDisplay(season: number): string {
    // Check if we're dealing with a European competition or Champions League
    if (leagueData?.league?.id === 2 || 
        (leagueData?.league?.name && leagueData.league.name.includes('Champions League')) ||
        (leagueData?.league?.type === 'cup' && leagueData?.league?.country === 'Europe')) {
      return `${season}/${season + 1}`;
    }
    
    // For regular leagues
    return `${season}`;
  }
  
  // Fetch standings when season changes
  useEffect(() => {
    // If switching back to current season, restore the initial standings
    if (selectedSeason === currentSeason) {
      setStandings(initialStandings);
      return;
    }
    
    async function fetchSeasonStandings() {
      setIsLoading(true);
      try {
        const leagueId = leagueData.league.id;
        const response = await fetch(`${BASE_URL}/standings?league=${leagueId}&season=${selectedSeason}`, { 
          headers,
          cache: 'no-store' // Ensure we get fresh data
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch standings');
        }
        
        const data = await response.json();
        
        // Update standings with the new data
        if (data.response && data.response.length > 0) {
          setStandings(data.response[0].league.standings.flat());
        } else {
          setStandings([]);
        }
      } catch (error) {
        console.error('Error fetching standings:', error);
        setStandings([]);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchSeasonStandings();
  }, [selectedSeason, currentSeason, leagueData.league.id, initialStandings]);
  

  
  // Filter fixtures - hide "FT" matches from previous days and limit to 90 days initially
  const today = new Date().toISOString().split('T')[0];
  const next90Days = new Date();
  next90Days.setDate(next90Days.getDate() + 90);
  const next90DaysStr = next90Days.toISOString().split('T')[0];
  
  const filteredFixtures = fixtures.filter((fixture: any) => {
    const fixtureDate = fixture.fixture.date.split('T')[0];
    const isFinished = fixture.fixture.status.short === 'FT';
    
    // If match is finished and from a previous day, hide it
    if (isFinished && fixtureDate < today) {
      return false;
    }
    
    // If not showing all fixtures, limit to next 90 days
    if (!showAllFixtures && fixtureDate > next90DaysStr) {
      return false;
    }
    
    // Show all other fixtures (including FT matches from today)
    return true;
  });
  
  // Count how many fixtures are beyond 90 days (for showing load more button)
  const allAvailableFixtures = fixtures.filter((fixture: any) => {
    const fixtureDate = fixture.fixture.date.split('T')[0];
    const isFinished = fixture.fixture.status.short === 'FT';
    
    // If match is finished and from a previous day, hide it
    if (isFinished && fixtureDate < today) {
      return false;
    }
    
    return true;
  });
  
  const hasMoreFixtures = allAvailableFixtures.length > filteredFixtures.length;

  // Group filtered fixtures by date
  const fixturesByDate = filteredFixtures.reduce((acc: {[key: string]: any[]}, fixture: any) => {
    const date = fixture.fixture.date.split('T')[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(fixture);
    return acc;
  }, {});
  
  // Sort dates chronologically (earliest first)
  const sortedDates = Object.keys(fixturesByDate).sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });
  
  return (
    <>
      {/* Main content area */}
      <div className="bg-gray-50 dark:bg-dark-main py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* League Header Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left column - League info and standings */}
            <div className="md:col-span-1">
              {/* League info card */}
              <div className="bg-white dark:bg-dark-nav shadow rounded-lg p-6 mb-8">
                <div className="flex items-center mb-4">
                  {leagueData.league?.logo && (
                    <div className="w-16 h-16 relative mr-4">
                      <Image 
                        src={leagueData.league.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')}
                        alt={leagueData.league?.name || ''}
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-bold dark:text-white">{leagueData.league?.name}</h1>
                    <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                      {leagueData.country?.flag && (
                        <Image 
                          src={leagueData.country.flag}
                          alt={leagueData.country?.name || ''}
                          width={16}
                          height={12}
                          className="mr-2"
                        />
                      )}
                      {leagueData.country?.name}
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 dark:border-dark-border pt-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Sesong</p>
                      <select
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-dark-border dark:bg-dark-nav dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        value={selectedSeason}
                        onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
                      >
                        {availableSeasons.map((season) => (
                          <option key={season} value={season}>
                            {formatSeasonDisplay(season)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {leagueData.league?.type === 'league' ? 'Liga' : 'Cup'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Standings */}
              <div className="bg-white dark:bg-dark-nav shadow rounded-lg overflow-hidden dark:border dark:border-dark-border">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-border">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    {leagueData.league?.name} Tabell {selectedSeason !== currentSeason ? `(${formatSeasonDisplay(selectedSeason)})` : ''}
                  </h2>
                </div>
                
                {isLoading ? (
                  <div className="px-4 py-3 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Laster tabell...</p>
                  </div>
                ) : standings.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
                    <thead className="bg-gray-50 dark:bg-dark-nav">
                      <tr>
                        <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-8">
                          #
                        </th>
                        <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Lag
                        </th>
                        <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">
                          K
                        </th>
                        <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">
                          P
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-dark-nav divide-y divide-gray-200 dark:divide-dark-border">
                      {standings.map((team) => {
                        // Determine border color directly
                        let borderColor = 'transparent';
                        
                        // Only apply borders for leagues we've configured
                        if (leagueData.league.id === 39 || leagueData.league.id === 140 || leagueData.league.id === 103 || leagueData.league.id === 725 || leagueData.league.id === 104) {
                          // Premier League specific rules (ID: 39)
                          if (leagueData.league.id === 39) {
                            // Champions League (top 4)
                            if (team.rank <= 4) {
                              borderColor = '#3b82f6'; // blue-500
                            }
                            // Europa League (5)
                            else if (team.rank === 5) {
                              borderColor = '#f97316'; // orange-500
                            }
                            // Relegation (bottom 3)
                            else if (team.rank >= 18) {
                              borderColor = '#ef4444'; // red-500
                            }
                          } 
                          // La Liga specific rules (ID: 140)
                          else if (leagueData.league.id === 140) {
                            // Champions League (top 4)
                            if (team.rank <= 4) {
                              borderColor = '#3b82f6'; // blue-500
                            }
                            // Europa League (5)
                            else if (team.rank === 5) {
                              borderColor = '#f97316'; // orange-500
                            }
                            // Conference League (6)
                            else if (team.rank === 6) {
                              borderColor = '#22c55e'; // green-500
                            }
                            // Relegation (bottom 3)
                            else if (team.rank >= 18) {
                              borderColor = '#ef4444'; // red-500
                            }
                          }
                          // Eliteserien specific rules (ID: 103)
                          else if (leagueData.league.id === 103) {
                            // Champions League qualification (top 2)
                            if (team.rank <= 2) {
                              borderColor = '#3b82f6'; // blue-500
                            }
                            // Conference League qualification (3-4)
                            else if (team.rank === 3 || team.rank === 4) {
                              borderColor = '#f97316'; // orange-500
                            }
                            // Relegation playoff (3rd last)
                            else if (team.rank === 14) { // Assuming 16-team league
                              borderColor = '#fb923c'; // orange-400 (lighter orange for relegation playoff)
                            }
                            // Direct relegation (bottom 2)
                            else if (team.rank >= 15) { // Assuming 16-team league
                              borderColor = '#ef4444'; // red-500
                            }
                          }
                          // Toppserien specific rules (ID: 725)
                          else if (leagueData.league.id === 725) {
                            // Champions League qualification
                            if (team.rank === 1) {
                              borderColor = '#3b82f6'; // blue-500
                            }
                            // Relegation (bottom team)
                            else if (team.rank === standings.length) {
                              borderColor = '#ef4444'; // red-500
                            }
                          }
                          // OBOS-ligaen specific rules (ID: 104)
                          else if (leagueData.league.id === 104) {
                            // Direct promotion (top 2)
                            if (team.rank <= 2) {
                              borderColor = '#3b82f6'; // blue-500
                            }
                            // Promotion playoff (3-6)
                            else if (team.rank >= 3 && team.rank <= 6) {
                              borderColor = '#f97316'; // orange-500
                            }
                            // Relegation (bottom 2)
                            else if (team.rank >= 15) { // Assuming 16-team league
                              borderColor = '#ef4444'; // red-500
                            }
                          }
                        }
                        
                        return (
                          <tr 
                            key={team.team.id} 
                            className="hover:bg-gray-50 dark:hover:bg-gray-800"
                            style={{ borderLeft: `4px solid ${borderColor}` }}
                          >
                            <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                              {team.rank}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                              <div className="flex items-center">
                                {team.team.logo && (
                                  <div className="flex-shrink-0 h-5 w-5 relative mr-2">
                                    <Image
                                      src={team.team.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')}
                                      alt={team.team.name}
                                      fill
                                      className="object-contain"
                                    />
                                  </div>
                                )}
                                <Link 
                                  href={`/lag/${createTeamSlugWithId(team.team.name, team.team.id)}`}
                                  className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate max-w-[120px] block"
                                >
                                  {team.team.name}
                                </Link>
                              </div>
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                              {team.all.played}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-center">
                              {team.points}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                    Ingen tabelldata tilgjengelig for sesongen {formatSeasonDisplay(selectedSeason)}.
                  </div>
                )}
              </div>
              
              {/* Only show the legend box for configured leagues */}
              {(leagueData.league.id === 39 || leagueData.league.id === 140 || leagueData.league.id === 103 || leagueData.league.id === 725 || leagueData.league.id === 104) && (
                <>
                  <div className="mt-4 border rounded-lg bg-white dark:bg-dark-nav dark:border-0 p-4 text-sm">
                    {/* Qualification/Relegation */}
                    <div className="mb-6">
                      <h3 className="font-medium mb-3 dark:text-white">Kvalifisering/nedrykk</h3>
                      <div className="space-y-3">
                        {/* Add OBOS-specific rules */}
                        {leagueData.league.id === 104 ? (
                          <>
                            <div className="flex items-center">
                              <div className="w-4 h-4 bg-blue-500 mr-2 flex-shrink-0"></div>
                              <span className="dark:text-gray-300">Direkte opprykk til Eliteserien</span>
                            </div>
                            <div className="flex items-center">
                              <div className="w-4 h-4 bg-orange-500 mr-2 flex-shrink-0"></div>
                              <span className="dark:text-gray-300">Kvalifisering til Eliteserien</span>
                            </div>
                            <div className="flex items-center">
                              <div className="w-4 h-4 bg-red-500 mr-2 flex-shrink-0"></div>
                              <span className="dark:text-gray-300">Nedrykk til PostNord-ligaen</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center">
                              <div className="w-4 h-4 bg-blue-500 mr-2 flex-shrink-0"></div>
                              <span className="dark:text-gray-300">Mesterligaen gruppekamper</span>
                            </div>
                            <div className="flex items-center">
                              <div className="w-4 h-4 bg-orange-500 mr-2 flex-shrink-0"></div>
                              <span className="dark:text-gray-300">Europaligaen gruppekamper</span>
                            </div>
                            {leagueData.league.id === 140 && (
                              <div className="flex items-center">
                                <div className="w-4 h-4 bg-green-500 mr-2 flex-shrink-0"></div>
                                <span className="dark:text-gray-300">Conference League kvalifisering</span>
                              </div>
                            )}
                            <div className="flex items-center">
                              <div className="w-4 h-4 bg-red-500 mr-2 flex-shrink-0"></div>
                              <span className="dark:text-gray-300">Nedrykk</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Form Guide */}
                    <div>
                      <h3 className="font-medium mb-3 dark:text-white">Siste fem kamper</h3>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white mr-2 flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="dark:text-gray-300">Seier</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-4 h-4 rounded-full bg-gray-400 flex items-center justify-center text-white mr-2 flex-shrink-0">
                            <span className="text-[8px] font-bold">U</span>
                          </div>
                          <span className="dark:text-gray-300">Uavgjort</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white mr-2 flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="dark:text-gray-300">Tap</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Streaming providers box - removed dark:border in dark mode */}
                  {getStreamingProviders(leagueData.league?.id).length > 0 && (
                    <div className="mt-4 border rounded-lg bg-white dark:bg-dark-nav dark:border-0 p-4 text-sm">
                      <h3 className="font-medium mb-2 dark:text-white">Se kampene på</h3>
                      <div className="space-y-2">
                        {getStreamingProviders(leagueData.league?.id).map((provider) => (
                          <Link
                            key={provider.name}
                            href={provider.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-[#222] rounded-lg transition-colors group border border-gray-100 dark:border-0 dark:bg-[#222]"
                          >
                            <div className="w-8 h-8 relative mr-3">
                              <Image
                                src={provider.icon}
                                alt={provider.name}
                                fill
                                className="object-contain"
                              />
                            </div>
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                {provider.name}
                              </span>
                              {provider.package && (
                                <span className="block text-xs text-gray-500 dark:text-gray-400">
                                  {provider.package}
                                </span>
                              )}
                            </div>
                            <ChevronRightIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Video component with dark mode styling */}
              <div className="mt-4 [&_.bg-blue-50]:dark:bg-[#222] [&_h3.text-blue-900]:dark:text-gray-200 [&_.border-blue-100]:dark:border-0 [&_.bg-blue-900]:dark:bg-[#222]">
                <LeagueLatestVideo 
                  leagueName={leagueData.league.name}
                  leagueId={leagueData.league.id}
                  leagueLogo={leagueData.league.logo}
                />
              </div>
            </div>
            
            {/* Right column - Fixtures and top scorers */}
            <div className="md:col-span-2">
              {/* Upcoming fixtures - removed dark:border */}
              <div className="bg-white dark:bg-dark-nav shadow rounded-lg overflow-hidden mb-8 dark:border-0">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-dark-border">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    Kommende kamper for {leagueData.league?.name}
                  </h2>
                </div>
                
                {Object.keys(fixturesByDate).length > 0 ? (
                  <div className="divide-y divide-gray-200 dark:divide-dark-border">
                    {sortedDates.map((date) => (
                      <div key={date} className="px-4 py-3">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                          {formatDate(date)}
                        </h3>
                        <div className="space-y-4">
                          {fixturesByDate[date].map((fixture) => {
                            const live = isMatchLive(fixture);
                            const completed = isMatchCompleted(fixture);
                            
                            return (
                              <Link 
                                key={fixture.fixture.id} 
                                href={`/${sport}/kamp/${fixture.fixture.id}`}
                                className={`block rounded-lg transition-colors relative ${
                                  live ? 'bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-[#222] border border-yellow-200 dark:border-yellow-900/50' : 
                                  completed ? 'bg-gray-50 dark:bg-[#222]/80 hover:bg-gray-100 dark:hover:bg-[#222]' : 'hover:bg-gray-50 dark:hover:bg-[#222]'
                                }`}
                              >
                                {live && (
                                  <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center">
                                    <span className="inline-block w-1.5 h-1.5 bg-white bg-opacity-70 rounded-full animate-pulse mr-1"></span>
                                    LIVE
                                  </div>
                                )}
                                {completed && (
                                  <div className="absolute top-2 right-2 bg-gray-600 text-white text-xs font-bold px-2 py-1 rounded-full md:block hidden">
                                    FERDIG
                                  </div>
                                )}
                                <div className="flex items-center justify-between p-2">
                                  {/* Home Team */}
                                  <div className="flex items-center justify-end w-5/12">
                                    <div className="text-right mr-2">
                                      <span className="text-sm font-medium text-gray-900 dark:text-white block">
                                        {fixture.teams.home.name}
                                      </span>
                                    </div>
                                    {fixture.teams.home.logo && (
                                      <div className="flex-shrink-0 h-8 w-8 relative">
                                        <Image
                                          src={fixture.teams.home.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')}
                                          alt={fixture.teams.home.name}
                                          fill
                                          className="object-contain"
                                        />
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Middle - Time/Score and VS */}
                                  <div className="flex flex-col items-center w-2/12">
                                    {live ? (
                                      <>
                                        <span className="text-sm font-bold text-red-600 dark:text-red-400">
                                          {fixture.goals.home} - {fixture.goals.away}
                                        </span>
                                        <span className="text-xs text-red-500 dark:text-red-400 mt-1 font-medium">
                                          {fixture.fixture.status.elapsed}&apos;
                                        </span>
                                      </>
                                    ) : completed ? (
                                      <>
                                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                          {fixture.goals.home} - {fixture.goals.away}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                          {fixture.fixture.status.short === 'AET' ? 'E. omg.' : 
                                           fixture.fixture.status.short === 'PEN' ? 'Straffer' : 'Fullført'}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                          {formatTime(fixture.fixture.date)}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">VS</span>
                                      </>
                                    )}
                                  </div>
                                  
                                  {/* Away Team */}
                                  <div className="flex items-center w-5/12">
                                    {fixture.teams.away.logo && (
                                      <div className="flex-shrink-0 h-8 w-8 relative">
                                        <Image
                                          src={fixture.teams.away.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')}
                                          alt={fixture.teams.away.name}
                                          fill
                                          className="object-contain"
                                        />
                                      </div>
                                    )}
                                    <div className="ml-2">
                                      <span className="text-sm font-medium text-gray-900 dark:text-white block">
                                        {fixture.teams.away.name}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Venue info */}
                                {fixture.fixture.venue && fixture.fixture.venue.name && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center pb-2">
                                    {fixture.fixture.venue.name}
                                  </div>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-5 sm:px-6 text-center text-gray-500 dark:text-gray-400">
                    Ingen kommende kamper tilgjengelig for denne sesongen.
                  </div>
                )}
                
                {/* Load more button */}
                {hasMoreFixtures && (
                  <div className="text-center px-4 py-5 sm:px-6 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-[#222]">
                    <button
                      onClick={() => setShowAllFixtures(true)}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium"
                    >
                      Vis alle kommende kamper ({allAvailableFixtures.length - filteredFixtures.length} til)
                    </button>
                  </div>
                )}
              </div>
              
              {/* Top scorers - removed dark:border */}
              <div className="bg-white dark:bg-dark-nav shadow rounded-lg overflow-hidden dark:border-0">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">Toppscorere</h2>
                </div>
                
                {topScorers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
                      <thead className="bg-gray-50 dark:bg-dark-nav">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            #
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Spiller
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Lag
                          </th>
                          <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Mål
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-dark-nav divide-y divide-gray-200 dark:divide-dark-border">
                        {topScorers.slice(0, 15).map((scorer, index) => (
                          <tr key={scorer.player.id} className="hover:bg-gray-50 dark:hover:bg-[#222]">
                            <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                              {index + 1}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                              <div className="flex items-center">
                                {scorer.player.photo && (
                                  <div className="flex-shrink-0 h-8 w-8 relative rounded-full overflow-hidden">
                                    <Image
                                      src={scorer.player.photo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')}
                                      alt={scorer.player.name}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                )}
                                <div className="ml-2">
                                  <Link 
                                    href={`/spillerprofil/${createPlayerSlug(scorer.player.name, scorer.player.id)}`}
                                    className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                                  >
                                    {scorer.player.name}
                                  </Link>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                              <div className="flex items-center">
                                {scorer.statistics[0].team.logo && (
                                  <div className="flex-shrink-0 h-6 w-6 relative">
                                    <Image
                                      src={scorer.statistics[0].team.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')}
                                      alt={scorer.statistics[0].team.name}
                                      fill
                                      className="object-contain"
                                    />
                                  </div>
                                )}
                                <div className="ml-2">
                                  <Link 
                                    href={`/lag/${createTeamSlugWithId(scorer.statistics[0].team.name, scorer.statistics[0].team.id)}`}
                                    className="text-sm text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                                  >
                                    {scorer.statistics[0].team.name}
                                  </Link>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-center">
                              {scorer.statistics[0].goals.total || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Ingen toppscorer-data tilgjengelig for denne sesongen.
                  </div>
                )}
              </div>

              {/* After the Toppscorere section - removed dark:border */}
              <div className="bg-white dark:bg-dark-nav shadow rounded-lg overflow-hidden mt-8 dark:border-0">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">Mer om {leagueData.league?.name}</h2>
                </div>
                
                <div className="p-6">
                  <article className="prose prose-sm max-w-none dark:prose-invert">
                    {/* Only show streaming section if providers exist */}
                    {getStreamingProviders(leagueData.league?.id).length > 0 && (
                      <>
                        <h3 className="text-xl font-semibold mb-4 dark:text-white">Hvem sender {leagueData.league?.name} 2025?</h3>
                        <p className="mb-6 dark:text-gray-300">
                          {leagueData.league?.id === 103 ? (
                            <>
                              TV 2 har rettighetene til å sende Eliteserien frem til 2028. Du kan se alle kampene på TV 2 Play Premium. 
                              I tillegg kan du se Eliteserien og mange andre store fotballigaer på Strim, som tilbyr en fleksibel 
                              strømmeløsning for sport.
                            </>
                          ) : leagueData.league?.id === 39 ? (
                            <>
                              Viaplay har rettighetene til Premier League frem til 2028. Du kan se alle kampene med et 
                              Viaplay Total-abonnement. Alternativt kan du se Premier League og andre store fotballigaer på Strim 
                              med et Sport Premium-abonnement.
                            </>
                          ) : leagueData.league?.id === 140 ? (
                            <>
                              TV 2 har rettighetene til La Liga frem til 2026. Du kan se alle kampene på TV 2 Play Premium. 
                              Du kan også se La Liga og andre store fotballigaer på Strim med et Sport Basis-abonnement.
                            </>
                          ) : (
                            <>
                              {getStreamingProviders(leagueData.league?.id).map(provider => provider.name).join(' og ')} 
                              sender {leagueData.league?.name}. I tillegg kan du se mange store fotballigaer på Strim.
                            </>
                          )}
                        </p>
                        
                        <h3 className="text-xl font-semibold mb-4 mt-8 dark:text-white">Når starter {leagueData.league?.name} 2025?</h3>
                        <p className="mb-6 dark:text-gray-300">
                          {leagueData.league?.id === 103 ? (
                            <>
                              Eliteserien 2025 forventes å starte i april 2025. Tradisjonelt starter Eliteserien rundt påsketider, 
                              vanligvis i begynnelsen av april. Den nøyaktige datoen for seriestart vil bli annonsert av Norges 
                              Fotballforbund senere i 2024. Sesongen går vanligvis fra april til desember, med en kort pause 
                              i forbindelse med internasjonale landslagssamlinger.
                            </>
                          ) : leagueData.league?.id === 39 ? (
                            <>
                              Premier League 2025/26-sesongen forventes å starte i august 2025. Premier League starter 
                              tradisjonelt i midten av august og avsluttes i mai året etter. Den nøyaktige datoen for 
                              seriestart vil bli annonsert av Premier League senere i 2024.
                            </>
                          ) : leagueData.league?.id === 140 ? (
                            <>
                              La Liga 2025/26-sesongen forventes å starte i august 2025. La Liga starter vanligvis 
                              i midten av august og avsluttes i mai året etter. Den nøyaktige datoen for seriestart 
                              vil bli annonsert av La Liga senere i 2024.
                            </>
                          ) : (
                            <>
                              {leagueData.league?.name} 2025/26-sesongen forventes å starte høsten 2025. Den nøyaktige 
                              datoen for seriestart vil bli annonsert senere i 2024.
                            </>
                          )}
                        </p>

                        <h3 className="text-xl font-semibold mb-4 mt-8 dark:text-white">Kommende kamper i {leagueData.league?.name}</h3>
                        <p className="mb-6 dark:text-gray-300">
                          {leagueData.league?.id === 103 ? (
                            <>
                              De neste rundene i Eliteserien byr på flere spennende oppgjør. Følg med på toppkampen mellom 
                              lagene som kjemper om medaljer og europacupplasser, samt den intense bunnstriden der lag kjemper 
                              for å unngå nedrykk. Alle kampene kan du se direkte på TV 2 Play Premium eller Strim.
                            </>
                          ) : leagueData.league?.id === 39 ? (
                            <>
                              Premier League fortsetter med flere høydepunkter i de kommende rundene. Følg med på kampen om 
                              ligagullet, Champions League-plassene og den spennende bunnstriden. Du kan se alle kampene på 
                              Viaplay Total eller Strim Sport Premium.
                            </>
                          ) : leagueData.league?.id === 140 ? (
                            <>
                              La Liga byr på flere spennende oppgjør i de kommende ukene. Følg med på topplagene som kjemper 
                              om ligagull og Champions League-plasser, samt den intense kampen for å unngå nedrykk. Alle kampene 
                              kan du se på TV 2 Play Premium eller Strim.
                            </>
                          ) : (
                            <>
                              De kommende rundene i {leagueData.league?.name} byr på flere spennende oppgjør. Følg med på 
                              toppkampen og den intense bunnstriden gjennom hele sesongen.
                            </>
                          )}
                        </p>

                        <div className="bg-blue-50 dark:bg-[#222] p-4 rounded-lg mb-6">
                          <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Se fotball på Strim</h4>
                          <p className="text-blue-800 dark:text-gray-200 mb-4">
                            Med Strim kan du se mange av de største fotballigaene samlet på ett sted:
                          </p>
                          <ul className="list-disc list-inside text-blue-800 dark:text-gray-300 mb-4">
                            <li>Sport Basis inkluderer: Eliteserien, OBOS-ligaen, Toppserien, Champions League og La Liga</li>
                            <li>Sport Premium inkluderer i tillegg: Premier League, Europa League, Conference League og Bundesliga</li>
                          </ul>
                          <Link 
                            href="https://ion.strim.no/t/t?a=1587005581&as=1817929248&t=2&tk=1"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-[50px] text-white bg-[#ff6b00] hover:bg-[#e66000] transition-colors"
                          >
                            Gå til Strim
                            <ChevronRightIcon className="ml-2 -mr-1 h-4 w-4" />
                          </Link>
                        </div>
                      </>
                    )}
                  </article>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 