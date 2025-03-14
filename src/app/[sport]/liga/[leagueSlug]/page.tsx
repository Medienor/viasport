"use client"

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/solid';
import React from 'react';

// Import from sportApi
import { BASE_URL, headers } from '@/app/services/sportApi';

// Create a URL-friendly slug from a team name (reused from team page)
function createTeamSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[æøå]/g, match => {
      if (match === 'æ') return 'ae';
      if (match === 'ø') return 'o';
      if (match === 'å') return 'a';
      return match;
    })
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

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

// Add this custom hook to update the document title
function useDocumentTitle(title: string | null) {
  useEffect(() => {
    if (title) {
      document.title = title;
    }
  }, [title]);
}

// Add this function to format the season display correctly based on league type and current date
function formatSeasonDisplay(leagueData: any, apiSeason: number): string {
  // Get the current date
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  
  // For Champions League and European competitions that span across two calendar years
  if (leagueData?.league?.id === 2 || 
      leagueData?.league?.name?.includes('Champions League') ||
      leagueData?.league?.type === 'cup' && leagueData?.league?.country === 'Europe') {
    
    // Since we're in 2025, use 2025/2026 as requested
    return `${currentYear}/${currentYear + 1}`;
  }
  
  // For leagues that run within a calendar year (like Eliteserien)
  return `${apiSeason}`;
}

export default function LeaguePage() {
  // Get the sport and leagueSlug from the URL parameters
  const params = useParams();
  const sport = typeof params.sport === 'string' ? params.sport : '';
  const leagueSlug = typeof params.leagueSlug === 'string' ? params.leagueSlug : '';
  
  // Capitalize first letter of sport name
  const formattedSport = sport.charAt(0).toUpperCase() + sport.slice(1);
  
  // Extract the league ID from the slug (format: name-id)
  const leagueId = parseInt(leagueSlug.split('-').pop() || '0');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leagueData, setLeagueData] = useState<any>(null);
  const [standings, setStandings] = useState<any[]>([]);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [topScorers, setTopScorers] = useState<any[]>([]);
  const [currentSeason, setCurrentSeason] = useState<number>(new Date().getFullYear());
  const [availableSeasons, setAvailableSeasons] = useState<number[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [topScorersSeason, setTopScorersSeason] = useState<number | null>(null);
  
  // Add this ref to prevent multiple fetches
  const didInitialFetchRef = React.useRef(false);
  
  // Use our custom hook to update the title when leagueData changes
  useDocumentTitle(
    leagueData 
      ? `Se ${leagueData.league.name} på TV og Streaming ${formatSeasonDisplay(leagueData, leagueData.seasons.find((s: { current: boolean; year: number }) => s.current)?.year || currentSeason)}`
      : null
  );
  
  // Define these functions outside useEffect so they can be used in handleSeasonChange
  async function fetchStandings(season: number) {
    try {
      const standingsResponse = await fetch(
        `${BASE_URL}/standings?league=${leagueId}&season=${season}`,
        { headers }
      );
      
      if (standingsResponse.ok) {
        const standingsData = await standingsResponse.json();
        
        if (standingsData.response && standingsData.response.length > 0) {
          const standingsArray = standingsData.response[0].league.standings.flat();
          setStandings(standingsArray);
        }
      }
    } catch (err) {
      console.error('Error fetching standings:', err);
    }
  }

  async function fetchFixtures(season: number) {
    try {
      const today = new Date();
      const formattedToday = today.toISOString().split('T')[0];
      
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 30);
      const formattedFutureDate = futureDate.toISOString().split('T')[0];
      
      const fixturesResponse = await fetch(
        `${BASE_URL}/fixtures?league=${leagueId}&season=${season}&from=${formattedToday}&to=${formattedFutureDate}`,
        { headers }
      );
      
      if (fixturesResponse.ok) {
        const fixturesData = await fixturesResponse.json();
        const fixturesArray = fixturesData.response || [];
        setFixtures(fixturesArray);
      }
    } catch (err) {
      console.error('Error fetching fixtures:', err);
    }
  }

  async function fetchTopScorers(season: number, tryPrevious = true) {
    try {
      setTopScorers([]); // Clear existing data
      
      const scorersResponse = await fetch(
        `${BASE_URL}/players/topscorers?league=${leagueId}&season=${season}`,
        { headers }
      );
      
      if (scorersResponse.ok) {
        const scorersData = await scorersResponse.json();
        const scorers = scorersData.response || [];
        setTopScorers(scorers);
        
        // If no data and we should try previous season
        if (scorers.length === 0 && tryPrevious && availableSeasons.length > 1) {
          tryPreviousSeason(season);
        }
      }
    } catch (err) {
      console.error('Error fetching top scorers:', err);
    }
  }

  // Helper function to try previous season
  const tryPreviousSeason = (currentSeason: number) => {
    // Find the index of the current season
    const currentIndex = availableSeasons.indexOf(currentSeason);
    if (currentIndex !== -1 && currentIndex < availableSeasons.length - 1) {
      // Get the next season in the array (which is the previous season chronologically)
      const previousSeason = availableSeasons[currentIndex + 1];
      setSelectedSeason(previousSeason);
      // Call fetchTopScorers but don't try previous again to avoid infinite loop
      fetchTopScorers(previousSeason, false);
    }
  };

  // Add this function to handle season change
  const handleSeasonChange = (season: number) => {
    setSelectedSeason(season);
    fetchStandings(season);
    fetchFixtures(season);
    fetchTopScorers(season);
  };

  // Add this function to handle season change for top scorers only
  const handleTopScorersSeasonChange = (season: number) => {
    setTopScorersSeason(season);
    // Only fetch top scorers, nothing else
    fetchTopScorers(season);
  };

  // Initial data fetch
  useEffect(() => {
    // Skip if we've already fetched or if leagueId is invalid
    if (didInitialFetchRef.current || !leagueId) {
      return;
    }
    
    async function fetchInitialData() {
      if (!leagueId) {
        setError('Ugyldig liga-ID');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Fetch league info from API
        const leagueResponse = await fetch(`${BASE_URL}/leagues?id=${leagueId}`, { headers });
        
        if (!leagueResponse.ok) {
          throw new Error(`API error: ${leagueResponse.status}`);
        }
        
        const leagueData = await leagueResponse.json();
        
        if (leagueData.response && leagueData.response.length > 0) {
          const leagueInfo = leagueData.response[0];
          setLeagueData(leagueInfo);
          
          // Get all available seasons and sort them in descending order
          const seasons = leagueInfo.seasons || [];
          setAvailableSeasons(seasons.map((s: { year: number }) => s.year).sort((a: number, b: number) => b - a));
          
          // Find current season
          const currentSeason = seasons.find((season: { current: boolean; year: number }) => season.current === true);
          
          if (currentSeason) {
            setCurrentSeason(currentSeason.year);
            setSelectedSeason(currentSeason.year);
            
            // Fetch data for the current season
            await fetchStandings(currentSeason.year);
            await fetchFixtures(currentSeason.year);
            await fetchTopScorers(currentSeason.year);
          }
        } else {
          setError('Ingen ligainformasjon funnet');
        }
      } catch (err) {
        console.error('Error fetching league data:', err);
        setError('Det oppstod en feil ved henting av data. Vennligst prøv igjen senere.');
      } finally {
        setLoading(false);
        didInitialFetchRef.current = true;
      }
    }
    
    fetchInitialData();
    
    // Cleanup function
    return () => {
      // Reset the ref when the component unmounts or leagueId changes
      didInitialFetchRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]); // Only depend on leagueId
  
  // Group fixtures by date
  const fixturesByDate = fixtures.reduce((groups: Record<string, any[]>, fixture) => {
    const dateKey = formatDate(fixture.fixture.date);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(fixture);
    return groups;
  }, {});
  
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
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : leagueData ? (
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
                      <div className="text-sm text-gray-600 mb-2">
                        Sesong {formatSeasonDisplay(leagueData, leagueData.seasons.find((s: { current: boolean; year: number }) => s.current)?.year || currentSeason)}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Type</p>
                      <p className="font-medium capitalize">{leagueData.league?.type}</p>
                    </div>
                    {leagueData.seasons?.[0]?.start && (
                      <div>
                        <p className="text-sm text-gray-500">Start</p>
                        <p className="font-medium">{new Date(leagueData.seasons[0].start).toLocaleDateString('nb-NO')}</p>
                      </div>
                    )}
                    {leagueData.seasons?.[0]?.end && (
                      <div>
                        <p className="text-sm text-gray-500">Slutt</p>
                        <p className="font-medium">{new Date(leagueData.seasons[0].end).toLocaleDateString('nb-NO')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Standings */}
              <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Tabell</h2>
                  
                  {/* Season selector for main content */}
                  <select 
                    className="border border-gray-300 rounded px-3 py-1 text-sm"
                    value={selectedSeason || ''}
                    onChange={(e) => handleSeasonChange(parseInt(e.target.value))}
                  >
                    {availableSeasons.map((season) => (
                      <option key={season} value={season}>
                        Sesong {season}
                      </option>
                    ))}
                  </select>
                </div>
                
                {standings.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            #
                          </th>
                          <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Lag
                          </th>
                          <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            K
                          </th>
                          <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            V
                          </th>
                          <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            U
                          </th>
                          <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            T
                          </th>
                          <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            P
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {standings.map((team) => (
                          <tr key={team.team.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              {team.rank}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <Link 
                                href={`/lag/${createTeamSlug(team.team.name)}-${team.team.id}`}
                                className="flex items-center"
                              >
                                {team.team.logo && (
                                  <Image 
                                    src={team.team.logo}
                                    alt={team.team.name}
                                    width={24}
                                    height={24}
                                    className="mr-2"
                                  />
                                )}
                                <span className="text-sm font-medium text-gray-900 hover:text-blue-600">
                                  {team.team.name}
                                </span>
                              </Link>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-500">
                              {team.all.played}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-500">
                              {team.all.win}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-500">
                              {team.all.draw}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-500">
                              {team.all.lose}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-center font-medium">
                              {team.points}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    Ingen tabelldata tilgjengelig.
                  </div>
                )}
              </div>
              
              {/* Top Scorers */}
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Toppscorere</h2>
                  
                  {/* Season selector for top scorers only */}
                  <select 
                    className="border border-gray-300 rounded px-3 py-1 text-sm"
                    value={topScorersSeason || ''}
                    onChange={(e) => handleTopScorersSeasonChange(parseInt(e.target.value))}
                  >
                    {availableSeasons.map((season) => (
                      <option key={season} value={season}>
                        Sesong {season}
                      </option>
                    ))}
                  </select>
                </div>
                
                {topScorers.length > 0 ? (
                  <div className="p-4">
                    <div className="space-y-3">
                      {topScorers.slice(0, 10).map((scorer, index) => (
                        <div key={scorer.player.id} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                          <div className="flex-shrink-0 mr-3 text-center">
                            <div className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full font-bold">
                              {index + 1}
                            </div>
                          </div>
                          
                          <div className="flex-shrink-0 mr-3">
                            {scorer.player.photo ? (
                              <Image 
                                src={scorer.player.photo}
                                alt={scorer.player.name}
                                width={40}
                                height={40}
                                className="rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-gray-500 text-xs">No photo</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-grow">
                            <div className="font-medium text-sm">{scorer.player.name}</div>
                            <div className="flex items-center text-xs text-gray-600">
                              <Link 
                                href={`/lag/${createTeamSlug(scorer.statistics[0].team.name)}-${scorer.statistics[0].team.id}`}
                                className="flex items-center hover:text-blue-600"
                              >
                                {scorer.statistics[0].team.logo && (
                                  <Image 
                                    src={scorer.statistics[0].team.logo}
                                    alt={scorer.statistics[0].team.name}
                                    width={14}
                                    height={14}
                                    className="mr-1"
                                  />
                                )}
                                {scorer.statistics[0].team.name}
                              </Link>
                            </div>
                          </div>
                          
                          <div className="flex-shrink-0 ml-2 text-center">
                            <div className="text-lg font-bold text-blue-600">
                              {scorer.statistics[0].goals.total}
                            </div>
                            <div className="text-xs text-gray-500">mål</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                  </div>
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    {topScorersSeason === currentSeason ? 
                      "Laster toppscorer-data..." : 
                      "Ingen toppscorer-data for denne sesongen"}
                  </div>
                )}
              </div>
            </div>
            
            {/* Right column - Fixtures */}
            <div className="md:col-span-2">
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold">Kommende kamper</h2>
                </div>
                
                {Object.keys(fixturesByDate).length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {Object.entries(fixturesByDate).map(([date, fixtures]) => (
                      <div key={date} className="p-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-3">{date}</h3>
                        <div className="space-y-3">
                          {fixtures.map(fixture => (
                            <div key={fixture.fixture.id} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2 flex-1">
                                  <Link 
                                    href={`/lag/${createTeamSlug(fixture.teams.home.name)}-${fixture.teams.home.id}`}
                                    className="flex items-center"
                                  >
                                    {fixture.teams.home.logo && (
                                      <Image 
                                        src={fixture.teams.home.logo}
                                        alt={fixture.teams.home.name}
                                        width={24}
                                        height={24}
                                        className="mr-2"
                                      />
                                    )}
                                    <span className="font-medium hover:text-blue-600">
                                      {fixture.teams.home.name}
                                    </span>
                                  </Link>
                                </div>
                                
                                <div className="text-center px-4">
                                  <div className="text-sm font-medium">
                                    {formatTime(fixture.fixture.date)}
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-end space-x-2 flex-1">
                                  <Link 
                                    href={`/lag/${createTeamSlug(fixture.teams.away.name)}-${fixture.teams.away.id}`}
                                    className="flex items-center"
                                  >
                                    <span className="font-medium hover:text-blue-600">
                                      {fixture.teams.away.name}
                                    </span>
                                    {fixture.teams.away.logo && (
                                      <Image 
                                        src={fixture.teams.away.logo}
                                        alt={fixture.teams.away.name}
                                        width={24}
                                        height={24}
                                        className="ml-2"
                                      />
                                    )}
                                  </Link>
                                </div>
                              </div>
                              
                              {fixture.fixture.venue && (
                                <div className="mt-2 text-xs text-gray-500 text-center">
                                  {fixture.fixture.venue.name}, {fixture.fixture.venue.city}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    Ingen kommende kamper tilgjengelig.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900">Liga ikke funnet</h2>
            <p className="mt-2 text-gray-500">Vi kunne ikke finne informasjon om denne ligaen.</p>
          </div>
        )}
      </div>
    </>
  );
} 