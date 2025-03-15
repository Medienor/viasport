"use client"

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/solid';
import { BASE_URL, headers } from '@/app/services/sportApi';
import { createPlayerSlug, createTeamSlugWithId } from '@/app/utils/slugUtils';

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
  
  // Capitalize first letter of sport name
  const formattedSport = sport.charAt(0).toUpperCase() + sport.slice(1);
  
  // Group fixtures by date
  const fixturesByDate = fixtures.reduce((acc: {[key: string]: any[]}, fixture: any) => {
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
      {/* Breadcrumb navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex py-3" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-1">
              <li>
                <Link href="/" className="text-sm text-gray-500 hover:text-blue-600">
                  <HomeIcon className="h-4 w-4" />
                </Link>
              </li>
              <li className="flex items-center">
                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                <Link href={`/${sport}`} className="ml-1 text-sm text-gray-500 hover:text-blue-600">
                  {formattedSport}
                </Link>
              </li>
              <li className="flex items-center">
                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                <Link href={`/${sport}/liga`} className="ml-1 text-sm text-gray-500 hover:text-blue-600">
                  Ligaer
                </Link>
              </li>
              <li className="flex items-center">
                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                <span className="ml-1 text-sm text-gray-700">
                  {leagueData?.league?.name || 'Laster...'}
                </span>
              </li>
            </ol>
          </nav>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left column - League info and standings */}
          <div className="md:col-span-1">
            {/* League info card */}
            <div className="bg-white shadow rounded-lg p-6 mb-8">
              <div className="flex items-center mb-4">
                {leagueData.league?.logo && (
                  <div className="w-16 h-16 relative mr-4">
                    <Image 
                      src={leagueData.league.logo}
                      alt={leagueData.league?.name || ''}
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold">{leagueData.league?.name}</h1>
                  <div className="text-sm text-gray-500 flex items-center">
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
              
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Sesong</p>
                    <select
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
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
                    <p className="text-sm text-gray-500">Type</p>
                    <p className="text-sm font-medium text-gray-900">
                      {leagueData.league?.type === 'league' ? 'Liga' : 'Cup'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Standings */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Tabell {selectedSeason !== currentSeason ? `(${formatSeasonDisplay(selectedSeason)})` : ''}
                </h2>
              </div>
              
              {isLoading ? (
                <div className="px-4 py-3 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
                  <p className="mt-2 text-sm text-gray-500">Laster tabell...</p>
                </div>
              ) : standings.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                        #
                      </th>
                      <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lag
                      </th>
                      <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                        K
                      </th>
                      <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                        P
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {standings.map((team) => {
                      // Determine border color directly
                      let borderColor = 'transparent';
                      
                      // Only apply borders for leagues we've configured
                      if (leagueData.league.id === 39 || leagueData.league.id === 140 || leagueData.league.id === 103) {
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
                      }
                      
                      return (
                        <tr 
                          key={team.team.id} 
                          className="hover:bg-gray-50"
                          style={{ borderLeft: `4px solid ${borderColor}` }}
                        >
                          <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                            {team.rank}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            <div className="flex items-center">
                              {team.team.logo && (
                                <div className="flex-shrink-0 h-5 w-5 relative mr-2">
                                  <Image
                                    src={team.team.logo}
                                    alt={team.team.name}
                                    fill
                                    className="object-contain"
                                  />
                                </div>
                              )}
                              <Link 
                                href={`/lag/${createTeamSlugWithId(team.team.name, team.team.id)}`}
                                className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate max-w-[120px] block"
                              >
                                {team.team.name}
                              </Link>
                            </div>
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                            {team.all.played}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                            {team.points}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="px-4 py-3 text-center text-gray-500">
                  Ingen tabelldata tilgjengelig for sesongen {formatSeasonDisplay(selectedSeason)}.
                </div>
              )}
            </div>
            
            {/* Only show the legend box for configured leagues */}
            {(leagueData.league.id === 39 || leagueData.league.id === 140 || leagueData.league.id === 103) && (
              <div className="mt-4 border rounded-lg bg-gray-50 p-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium mb-2">Kvalifisering/nedrykk</h3>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-blue-500 mr-2"></div>
                        <span>
                          {leagueData.league.id === 103 ? 'Mesterligaen kvalifisering' : 'Mesterligaen gruppekamper'}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-orange-500 mr-2"></div>
                        <span>
                          {leagueData.league.id === 103 ? 'Conference League kvalifisering' : 'Europaligaen gruppekamper'}
                        </span>
                      </div>
                      {leagueData.league.id === 103 ? (
                        <div className="flex items-center">
                          <div className="w-4 h-4 bg-orange-400 mr-2"></div>
                          <span>Nedrykkskamp</span>
                        </div>
                      ) : leagueData.league.id === 140 ? (
                        <div className="flex items-center">
                          <div className="w-4 h-4 bg-green-500 mr-2"></div>
                          <span>Conference League kvalifisering</span>
                        </div>
                      ) : null}
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-red-500 mr-2"></div>
                        <span>Nedrykk</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Siste fem kamper</h3>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white mr-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span>Seier</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full bg-gray-400 flex items-center justify-center text-white mr-2">
                          <span className="text-[8px] font-bold">U</span>
                        </div>
                        <span>Uavgjort</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white mr-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span>Tap</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Right column - Fixtures and top scorers */}
          <div className="md:col-span-2">
            {/* Upcoming fixtures */}
            <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Kommende kamper</h2>
              </div>
              
              {Object.keys(fixturesByDate).length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {sortedDates.map((date) => (
                    <div key={date} className="px-4 py-3">
                      <h3 className="text-sm font-medium text-gray-900 mb-3">
                        {formatDate(date)}
                      </h3>
                      <div className="space-y-4">
                        {fixturesByDate[date].map((fixture) => {
                          const live = isMatchLive(fixture);
                          return (
                            <Link 
                              key={fixture.fixture.id} 
                              href={`/${sport}/kamp/${fixture.fixture.id}`}
                              className={`block rounded-lg transition-colors relative ${
                                live ? 'bg-yellow-50 hover:bg-yellow-100 border border-yellow-200' : 'hover:bg-gray-50'
                              }`}
                            >
                              {live && (
                                <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center">
                                  <span className="inline-block w-1.5 h-1.5 bg-white bg-opacity-70 rounded-full animate-pulse mr-1"></span>
                                  LIVE
                                </div>
                              )}
                              <div className="flex items-center justify-between p-2">
                                {/* Home Team */}
                                <div className="flex items-center justify-end w-5/12">
                                  <div className="text-right mr-2">
                                    <span className="text-sm font-medium text-gray-900 block">
                                      {fixture.teams.home.name}
                                    </span>
                                  </div>
                                  {fixture.teams.home.logo && (
                                    <div className="flex-shrink-0 h-8 w-8 relative">
                                      <Image
                                        src={fixture.teams.home.logo}
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
                                      <span className="text-sm font-bold text-red-600">
                                        {fixture.goals.home} - {fixture.goals.away}
                                      </span>
                                      <span className="text-xs text-red-500 mt-1 font-medium">
                                        {fixture.fixture.status.elapsed}&apos;
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-sm font-medium text-gray-900">
                                        {formatTime(fixture.fixture.date)}
                                      </span>
                                      <span className="text-xs text-gray-500 mt-1">VS</span>
                                    </>
                                  )}
                                </div>
                                
                                {/* Away Team */}
                                <div className="flex items-center w-5/12">
                                  {fixture.teams.away.logo && (
                                    <div className="flex-shrink-0 h-8 w-8 relative">
                                      <Image
                                        src={fixture.teams.away.logo}
                                        alt={fixture.teams.away.name}
                                        fill
                                        className="object-contain"
                                      />
                                    </div>
                                  )}
                                  <div className="ml-2">
                                    <span className="text-sm font-medium text-gray-900 block">
                                      {fixture.teams.away.name}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Venue info */}
                              {fixture.fixture.venue && fixture.fixture.venue.name && (
                                <div className="text-xs text-gray-500 text-center pb-2">
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
                <div className="px-4 py-5 sm:px-6 text-center text-gray-500">
                  Ingen kommende kamper tilgjengelig for denne sesongen.
                </div>
              )}
            </div>
            
            {/* Top scorers */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Toppscorere</h2>
              </div>
              
              {topScorers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          #
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Spiller
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Lag
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Mål
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {topScorers.slice(0, 15).map((scorer, index) => (
                        <tr key={scorer.player.id} className="hover:bg-gray-50">
                          <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                            {index + 1}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            <div className="flex items-center">
                              {scorer.player.photo && (
                                <div className="flex-shrink-0 h-8 w-8 relative rounded-full overflow-hidden">
                                  <Image
                                    src={scorer.player.photo}
                                    alt={scorer.player.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              )}
                              <div className="ml-2">
                                <Link 
                                  href={`/spillerprofil/${createPlayerSlug(scorer.player.name, scorer.player.id)}`}
                                  className="text-sm font-medium text-gray-900 hover:text-blue-600"
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
                                    src={scorer.statistics[0].team.logo}
                                    alt={scorer.statistics[0].team.name}
                                    fill
                                    className="object-contain"
                                  />
                                </div>
                              )}
                              <div className="ml-2">
                                <Link 
                                  href={`/lag/${createTeamSlugWithId(scorer.statistics[0].team.name, scorer.statistics[0].team.id)}`}
                                  className="text-sm text-gray-900 hover:text-blue-600"
                                >
                                  {scorer.statistics[0].team.name}
                                </Link>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                            {scorer.statistics[0].goals.total || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-4 text-center text-gray-500">
                  Ingen toppscorer-data tilgjengelig for denne sesongen.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 