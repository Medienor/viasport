"use client"

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { BASE_URL, headers, Fixture } from '../services/sportApi';

export default function FixturesSection() {
  const [fixtures, setFixtures] = useState<{[key: string]: Fixture[]}>({});
  const [isLoading, setIsLoading] = useState<{[key: string]: boolean}>({});
  const [formattedDates, setFormattedDates] = useState<{[key: string]: string}>({});
  const [totalFixtureCount, setTotalFixtureCount] = useState<{[key: string]: number}>({});
  const router = useRouter();

  // Maximum number of fixtures to display per day
  const MAX_FIXTURES_PER_DAY = 10;

  // Popular leagues to prioritize - wrapped in useMemo
  const popularLeagues = useMemo(() => [
    { name: 'Premier League', id: 39 },
    { name: 'Eliteserien', id: 103 },
    { name: 'UEFA Champions League', id: 2 },
    { name: 'La Liga', id: 140 },
    { name: 'Serie A', id: 135 }
  ], []);

  // Generate dates for the next 7 days
  const generateDates = () => {
    const dates: {[key: string]: Date} = {};
    const today = new Date();
    
    // Today
    dates.today = new Date(today);
    
    // Next 6 days
    for (let i = 1; i <= 6; i++) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      dates[`day${i}`] = nextDate;
    }
    
    return dates;
  };

  // Check if a league is in our popular leagues list
  const isPopularLeague = (leagueId: number) => {
    return popularLeagues.some(league => league.id === leagueId);
  };

  // Format dates in Norwegian
  useEffect(() => {
    const dates = generateDates();
    const formatted: {[key: string]: string} = {};
    
    // Norwegian weekday names
    const weekdays = [
      'søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'
    ];
    
    // Norwegian month names
    const months = [
      'januar', 'februar', 'mars', 'april', 'mai', 'juni', 
      'juli', 'august', 'september', 'oktober', 'november', 'desember'
    ];
    
    // Format each date
    Object.entries(dates).forEach(([key, date]) => {
      const weekday = weekdays[date.getDay()];
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      
      formatted[key] = `${weekday} ${day}. ${month} ${year}`;
    });
    
    setFormattedDates(formatted);
    
    // Initialize loading states
    const loadingStates: {[key: string]: boolean} = {};
    Object.keys(dates).forEach(key => {
      loadingStates[key] = true;
    });
    setIsLoading(loadingStates);
    
    // Initialize fixtures
    const initialFixtures: {[key: string]: Fixture[]} = {};
    const initialCounts: {[key: string]: number} = {};
    Object.keys(dates).forEach(key => {
      initialFixtures[key] = [];
      initialCounts[key] = 0;
    });
    setFixtures(initialFixtures);
    setTotalFixtureCount(initialCounts);
  }, []);

  // Fetch fixtures for a specific date
  const fetchFixturesForDate = useCallback(async (dateKey: string, date: Date) => {
    try {
      setIsLoading(prev => ({ ...prev, [dateKey]: true }));
      
      // Format date as YYYY-MM-DD
      const dateStr = date.toISOString().split('T')[0];
      console.log(`Fetching fixtures for ${dateKey}: ${dateStr}`);
      
      // Fetch from API
      const response = await fetch(`${BASE_URL}/fixtures?date=${dateStr}`, { headers });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.response && Array.isArray(data.response)) {
        // Filter for only "Not Started" matches
        const notStartedFixtures = data.response.filter((fixture: any) => 
          fixture?.fixture?.status?.short === 'NS'
        );
        
        // Save the total count before limiting
        setTotalFixtureCount(prev => ({ 
          ...prev, 
          [dateKey]: notStartedFixtures.length 
        }));
        
        // Separate fixtures into popular and other leagues
        const popularFixtures: any[] = [];
        const otherFixtures: any[] = [];
        
        notStartedFixtures.forEach((fixture: any) => {
          const leagueId = fixture?.league?.id;
          const isPopular = popularLeagues.some(league => league.id === leagueId);
          
          if (isPopular) {
            popularFixtures.push(fixture);
          } else {
            otherFixtures.push(fixture);
          }
        });
        
        // Sort each group by time
        const sortByTime = (a: any, b: any) => {
          return new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime();
        };
        
        popularFixtures.sort(sortByTime);
        otherFixtures.sort(sortByTime);
        
        // Combine with popular leagues first
        let sortedFixtures = [...popularFixtures, ...otherFixtures];
        
        // Limit to MAX_FIXTURES_PER_DAY
        sortedFixtures = sortedFixtures.slice(0, MAX_FIXTURES_PER_DAY);
        
        // Update fixtures for this date
        setFixtures(prev => ({ ...prev, [dateKey]: sortedFixtures }));
        console.log(`Processed ${sortedFixtures.length} fixtures for ${dateKey} (limited from ${notStartedFixtures.length})`);
      } else {
        console.warn(`Unexpected data structure for ${dateKey}:`, data);
        setFixtures(prev => ({ ...prev, [dateKey]: [] }));
        setTotalFixtureCount(prev => ({ ...prev, [dateKey]: 0 }));
      }
    } catch (err) {
      console.error(`Error fetching fixtures for ${dateKey}:`, err);
    } finally {
      setIsLoading(prev => ({ ...prev, [dateKey]: false }));
    }
  }, [popularLeagues, MAX_FIXTURES_PER_DAY]);

  // Fetch fixtures for all dates
  useEffect(() => {
    if (Object.keys(formattedDates).length === 0) return;
    
    const dates = generateDates();
    
    // Fetch fixtures for each date
    Object.entries(dates).forEach(([key, date]) => {
      fetchFixturesForDate(key, date);
    });
  }, [formattedDates, fetchFixturesForDate]);

  // Format time from ISO string
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      console.error('Error formatting date:', e);
      return '--:--';
    }
  };

  // Generate a slug from a team name and ID
  const createTeamSlug = (name: string, id: number): string => {
    const nameSlug = name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
    
    return `${nameSlug}-${id}`;
  };

  // Generate a league slug from league name and ID
  const createLeagueSlug = (name: string, id: number): string => {
    const nameSlug = name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
    
    return `${nameSlug}-${id}`;
  };

  // Render a fixtures table for a specific date
  const renderFixturesTable = (dateKey: string) => {
    const dateFixtures = fixtures[dateKey] || [];
    const loading = isLoading[dateKey] || false;
    const dateString = formattedDates[dateKey] || '';
    
    let title = '';
    if (dateKey === 'today') {
      title = `Kommende kamper i dag, ${dateString}`;
    } else if (dateKey === 'day1') {
      title = `Kommende kamper i morgen, ${dateString}`;
    } else {
      title = `Kommende kamper ${dateString}`;
    }
    
    return (
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
        
        {loading ? (
          <div className="p-8 text-center text-gray-500 bg-white shadow rounded-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4">Laster inn kamper...</p>
          </div>
        ) : dateFixtures.length > 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tid
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Liga
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hjemmelag
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bortelag
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dateFixtures.map((fixture: any) => (
                    <tr 
                      key={fixture.fixture.id} 
                      className={`hover:bg-gray-50 cursor-pointer ${
                        isPopularLeague(fixture.league?.id) ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => router.push(`/fotball/kamp/${fixture.fixture.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTime(fixture.fixture.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {fixture.league?.logo && (
                            <div className="flex-shrink-0 h-6 w-6 relative">
                              <Image
                                src={fixture.league.logo}
                                alt={fixture.league?.name || 'League'}
                                fill
                                className="object-contain"
                              />
                            </div>
                          )}
                          <div className={`ml-3 text-sm ${
                            isPopularLeague(fixture.league?.id) ? 'font-semibold text-blue-800' : 'text-gray-900'
                          }`}>
                            <Link 
                              href={`/fotball/liga/${createLeagueSlug(fixture.league?.name || '', fixture.league?.id)}`}
                              className={`text-sm ${isPopularLeague(fixture.league?.id) 
                                ? 'font-semibold text-blue-600' 
                                : 'text-gray-900'}`}
                            >
                              {fixture.league?.name || 'Unknown League'}
                            </Link>
                          </div>
                        </div>
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
                              href={`/lag/${createTeamSlug(fixture.teams?.home?.name || '', fixture.teams?.home?.id)}`}
                              className="ml-3 text-sm font-medium text-gray-900 hover:text-blue-600"
                            >
                              {fixture.teams?.home?.name || 'Home Team'}
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className="text-gray-500">vs</span>
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
                              href={`/lag/${createTeamSlug(fixture.teams?.away?.name || '', fixture.teams?.away?.id)}`}
                              className="mr-3 text-sm font-medium text-gray-900 hover:text-blue-600"
                            >
                              {fixture.teams?.away?.name || 'Away Team'}
                            </Link>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <Link href="/fotball" className="text-blue-600 font-medium hover:text-blue-500">
                Se alle kamper {dateKey === 'today' ? 'i dag' : dateKey === 'day1' ? 'i morgen' : formattedDates[dateKey]} 
                {totalFixtureCount[dateKey] > MAX_FIXTURES_PER_DAY && 
                  ` (${totalFixtureCount[dateKey] - MAX_FIXTURES_PER_DAY} flere)`
                }
                <span aria-hidden="true"> →</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 bg-white shadow rounded-lg">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="mt-2">
              {dateKey === 'today' 
                ? 'Ingen kommende kamper i dag.'
                : dateKey === 'day1'
                  ? 'Ingen kommende kamper i morgen.'
                  : `Ingen kommende kamper ${dateString}.`
              }
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {renderFixturesTable('today')}
      {renderFixturesTable('day1')}
      {renderFixturesTable('day2')}
      {renderFixturesTable('day3')}
      {renderFixturesTable('day4')}
      {renderFixturesTable('day5')}
      {renderFixturesTable('day6')}
    </>
  );
} 