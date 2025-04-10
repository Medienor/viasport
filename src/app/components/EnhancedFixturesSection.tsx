"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import { getStreamingProviders } from '@/utils/channelUtils';

interface EnhancedFixturesSectionProps {
  fixtures: {[key: string]: any[]};
  formattedDates: {[key: string]: string};
  totalFixtureCount: {[key: string]: number};
  popularLeagueIds: number[];
}

type FilterType = 'today' | 'live' | 'tv' | 'upcoming';

interface LiveMatch {
  id: number;
  status: {
    short: string;
    elapsed: number | null;
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  lastUpdated: number; // timestamp of when this data was last updated
}

export default function EnhancedFixturesSection({
  fixtures,
  formattedDates,
  totalFixtureCount,
  popularLeagueIds
}: EnhancedFixturesSectionProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('today');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [liveMatches, setLiveMatches] = useState<{[key: number]: LiveMatch}>({});
  const [isLoadingLiveData, setIsLoadingLiveData] = useState<boolean>(false);

  // Fetch match data from our server endpoint
  const fetchMatchData = async () => {
    try {
      setIsLoadingLiveData(true);
      
      const response = await fetch('/api/football/live');
      
      if (!response.ok) {
        throw new Error('Failed to fetch match data');
      }
      
      const data = await response.json();
      // console.log('API Response:', data); // Debug: Log the full response
      
      const newLiveMatchesMap: {[key: number]: LiveMatch} = {};
      const now = Date.now();
      
      // Process live matches
      data.live?.forEach((match: any) => {
        // console.log('Processing live match:', match.league.id, match.fixture.id); // Debug
        if (popularLeagueIds.includes(match.league.id)) {
          newLiveMatchesMap[match.fixture.id] = {
            id: match.fixture.id,
            status: {
              short: match.fixture.status.short,
              elapsed: match.fixture.status.elapsed
            },
            goals: {
              home: match.goals.home,
              away: match.goals.away
            },
            lastUpdated: now
          };
        }
      });
      
      // Process finished matches
      data.finished?.forEach((match: any) => {
        // console.log('Processing finished match:', match.league.id, match.fixture.id); // Debug
        if (popularLeagueIds.includes(match.league.id)) {
          newLiveMatchesMap[match.fixture.id] = {
            id: match.fixture.id,
            status: {
              short: match.fixture.status.short,
              elapsed: null
            },
            goals: {
              home: match.goals.home,
              away: match.goals.away
            },
            lastUpdated: now
          };
        }
      });
      
      // console.log('Processed match data:', newLiveMatchesMap); // Debug
      // console.log('Popular league IDs:', popularLeagueIds); // Debug
      
      setLiveMatches(newLiveMatchesMap);
      
    } catch (error) {
      console.error('Error fetching match data:', error);
    } finally {
      setIsLoadingLiveData(false);
    }
  };

  // Update current time and fetch data periodically
  useEffect(() => {
    // Initial fetch
    fetchMatchData();
    
    // Set up interval for regular updates
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      fetchMatchData();
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [popularLeagueIds]);

  // Group fixtures by league
  const groupFixturesByLeague = (dateFixtures: any[]) => {
    // Ensure dateFixtures is an array
    if (!Array.isArray(dateFixtures)) return {};
    return dateFixtures.reduce((acc, fixture) => {
      // Basic validation
      if (!fixture?.league?.id) return acc;
      const leagueId = fixture.league.id;
      if (!acc[leagueId]) {
        acc[leagueId] = {
          league: fixture.league,
          fixtures: []
        };
      }
      acc[leagueId].fixtures.push(fixture);
      return acc;
    }, {});
  };

  const getSectionTitle = () => {
    switch (activeFilter) {
      case 'today':
        return 'Kamper i dag';
      case 'live':
        return 'Pågående kamper';
      case 'tv':
        return 'Kamper på TV';
      case 'upcoming':
        return 'Kamper i morgen';
      default:
        return 'Kamper';
    }
  };

  const getFormattedDate = () => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    switch (activeFilter) {
      case 'today':
        return format(today, 'd. MMMM yyyy', { locale: nb });
      case 'upcoming':
        return format(tomorrow, 'd. MMMM yyyy', { locale: nb });
      case 'live':
      case 'tv':
        return format(today, 'd. MMMM yyyy', { locale: nb });
      default:
        return '';
    }
  };

  // Check if a match is currently live or finished based on API data
  const getMatchStatus = (fixture: any) => {
    const fixtureId = fixture.fixture.id;
    const liveMatch = liveMatches[fixtureId];
    
    console.log('Match status check:', {
      fixtureId,
      hasLiveData: !!liveMatch,
      liveMatchData: liveMatch,
      timestamp: new Date().toISOString()
    });
    
    // Only check live API data for status
    const isFinished = liveMatch?.status.short === 'FT';
    const isLive = liveMatch && ['1H', 'HT', '2H', 'ET', 'P', 'LIVE'].includes(liveMatch.status.short);
    
    return { isLive, isFinished };
  };

  // Get live match data if available
  const getMatchData = (fixture: any) => {
    const fixtureId = fixture.fixture.id;
    const liveMatch = liveMatches[fixtureId];
    
    // Only return data if we have live match data
    if (liveMatch) {
      return {
        id: fixtureId,
        status: liveMatch.status,
        goals: liveMatch.goals,
        lastUpdated: Date.now()
      };
    }
    
    // If no live data, return null (will show original fixture time)
    return null;
  };

  const getFixturesToDisplay = () => {
    const todayFixtures = fixtures.today || [];
    const upcomingFixtures = fixtures.day1 || []; // Assuming day1 is tomorrow

    switch (activeFilter) {
      case 'today':
        return todayFixtures;
      case 'live':
        return todayFixtures.filter(fixture => getMatchStatus(fixture).isLive);
      case 'tv':
        // Filter today's fixtures that have streaming providers
        return todayFixtures.filter(fixture =>
          getStreamingProviders(fixture.league.id).length > 0
        );
      case 'upcoming':
        return upcomingFixtures;
      default:
        return todayFixtures;
    }
  };

  const fixturesToDisplay = getFixturesToDisplay();
  const groupedFixtures = groupFixturesByLeague(fixturesToDisplay);

  // Debug output
  useEffect(() => {
    console.log('Current fixtures:', fixtures);
    console.log('Live matches state:', liveMatches);
    console.log('Fixtures to display:', fixturesToDisplay.length);
  }, [fixtures, liveMatches, fixturesToDisplay]);

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow">
      <div className="border-b border-gray-200">
        <div className="flex overflow-x-auto">
          <button
            className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap ${
              activeFilter === 'today' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveFilter('today')}
          >
            I dag
          </button>
          <button
            className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap ${
              activeFilter === 'live' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveFilter('live')}
          >
            Pågående
          </button>
          <button
            className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap ${
              activeFilter === 'tv' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveFilter('tv')}
          >
            På TV
          </button>
          <button
            className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap ${
              activeFilter === 'upcoming' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveFilter('upcoming')}
          >
            I morgen
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        <div className="px-3 lg:px-4 py-2 lg:py-3 flex items-baseline sticky top-0 bg-white/90 backdrop-blur-sm z-10 border-b border-gray-200">
          <h2 className="text-base lg:text-lg font-semibold">{getSectionTitle()}</h2>
          <span className="ml-2 text-xs lg:text-sm text-gray-500">{getFormattedDate()}</span>
        </div>
        
        {isLoadingLiveData && activeFilter === 'live' && (
           <div className="p-4 text-center text-gray-500 text-sm">Laster live data...</div>
        )}

        {!isLoadingLiveData && Object.keys(groupedFixtures).length === 0 ? (
          <div className="p-6 lg:p-8 text-center text-gray-500">
            Ingen kamper {activeFilter === 'today' ? 'i dag' : 
                         activeFilter === 'upcoming' ? 'i morgen' : 
                         activeFilter === 'live' ? 'pågår nå' : 
                         'på TV i dag'}
          </div>
        ) : (
          Object.values(groupedFixtures).map((group: any) => (
            <div key={group.league.id} className="py-1 lg:py-2">
              <div className="px-3 lg:px-4 py-1.5 lg:py-2 bg-gray-50/80 border-b border-t border-gray-200/60">
                <Link 
                  href={`/fotball/liga/${group.league.name.toLowerCase().replace(/\s+/g, '-')}-${group.league.id}`}
                  className="flex items-center space-x-2 hover:underline"
                >
                  <div className="relative h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0">
                    <Image
                      src={group.league.logo}
                      alt={group.league.name}
                      fill
                      sizes="(max-width: 1024px) 16px, 20px"
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <span className="font-medium text-xs lg:text-sm">{group.league.name}</span>
                </Link>
              </div>
              
              <div className="space-y-0">
                {group.fixtures.map((fixture: any) => {
                  const { isLive, isFinished } = getMatchStatus(fixture);
                  const matchData = getMatchData(fixture);
                  const streamingProviders = getStreamingProviders(fixture.league.id);
                  const hasStreamingProviders = streamingProviders.length > 0;
                  
                  // Debug logging
                  console.log('Fixture Data:', {
                    id: fixture.fixture.id,
                    teams: `${fixture.teams.home.name} vs ${fixture.teams.away.name}`,
                    status: {
                      fixtureStatus: fixture.fixture?.status,
                      directStatus: fixture.status,
                      matchStatus: fixture.match_status,
                      liveMatchStatus: liveMatches[fixture.fixture.id]?.status
                    },
                    goals: {
                      fixtureGoals: fixture.goals,
                      liveMatchGoals: liveMatches[fixture.fixture.id]?.goals
                    },
                    computed: {
                      isLive,
                      isFinished,
                      matchData
                    }
                  });
                  
                  return (
                    <Link 
                      key={fixture.fixture.id}
                      href={`/fotball/kamp/${fixture.fixture.id}`}
                      className="flex items-center px-2 lg:px-4 py-2.5 lg:py-3 hover:bg-gray-50/80 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="w-10 lg:w-16 text-center flex-shrink-0">
                        {isLive && matchData ? (
                          <div className="flex flex-col items-center">
                             <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] lg:text-xs font-semibold bg-red-100 text-red-700 border border-red-200/80">
                               <span className="h-1.5 w-1.5 bg-red-500 rounded-full mr-1 animate-pulse"></span>
                               {matchData.status.elapsed !== null ? `${matchData.status.elapsed}'` : matchData.status.short}
                             </span>
                          </div>
                        ) : isFinished && matchData ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] lg:text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200/80">
                            {matchData.status.short}
                          </span>
                        ) : (
                          <span className="text-xs lg:text-sm font-medium text-gray-500 lg:text-gray-600">
                            {fixture.formattedTime}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex-1 grid grid-cols-[1fr,auto,1fr] items-center gap-1 lg:gap-3 min-w-0 px-1 lg:px-0">
                        <div className="flex items-center justify-end space-x-1.5 lg:space-x-2 truncate">
                          <span className="text-xs lg:text-sm font-medium text-right truncate">
                            {fixture.teams.home.name}
                          </span>
                          <div className="relative h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0">
                            <Image
                              src={fixture.teams.home.logo}
                              alt={fixture.teams.home.name}
                              fill
                              sizes="(max-width: 1024px) 16px, 20px"
                              className="object-contain"
                              unoptimized
                            />
                          </div>
                        </div>
                        
                        <div className="w-10 lg:w-12 text-center flex-shrink-0">
                          {(isLive || isFinished) && matchData ? (
                            <span className={`text-xs lg:text-sm font-bold ${isLive ? 'text-red-600' : 'text-gray-800'}`}>
                              {matchData.goals.home !== null && matchData.goals.away !== null 
                                ? `${matchData.goals.home} - ${matchData.goals.away}` 
                                : '-'}
                            </span>
                          ) : (
                            <span className="text-xs lg:text-sm text-gray-400">-</span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-start space-x-1.5 lg:space-x-2 truncate">
                          <div className="relative h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0">
                            <Image
                              src={fixture.teams.away.logo}
                              alt={fixture.teams.away.name}
                              fill
                              sizes="(max-width: 1024px) 16px, 20px"
                              className="object-contain"
                              unoptimized
                            />
                          </div>
                          <span className="text-xs lg:text-sm font-medium text-left truncate">
                            {fixture.teams.away.name}
                          </span>
                        </div>
                      </div>
                      
                      {hasStreamingProviders && (
                        <div className="ml-1 lg:ml-2 relative group flex-shrink-0">
                          <div className="text-gray-400 hover:text-gray-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 lg:h-5 lg:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          
                          <div className="absolute z-20 right-0 w-48 p-2 mt-1 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 text-xs border border-gray-200">
                            <div className="font-semibold mb-1">Se kampen på:</div>
                            <div className="space-y-1">
                              {streamingProviders.map((provider, index) => (
                                <div key={index} className="flex items-center">
                                  <div className="relative h-4 w-4 mr-1.5">
                                    <Image
                                      src={provider.icon}
                                      alt={provider.name}
                                      fill
                                      className="object-contain"
                                      unoptimized
                                    />
                                  </div>
                                  <span className="text-[11px]">{provider.name}</span>
                                  {provider.package && (
                                    <span className="text-gray-500 ml-1 text-[10px]">({provider.package})</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      {!hasStreamingProviders && <div className="w-4 lg:w-5 ml-1 lg:ml-2 flex-shrink-0"></div>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 