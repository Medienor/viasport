"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Fixture } from '@/app/services/sportApi';
import { leagueTeamsData } from '@/app/data/leagueTeams';
import { calendarData as calendarDataImport } from '@/app/data/calendarData';
import { topPlayersData } from '../data/topPlayersData';
import { createPlayerSlug } from '@/lib/utils';
import PreventAutoScroll from './PreventAutoScroll';
import { MAJOR_LEAGUES } from '@/app/data/majorLeagues';
import { getStreamingProviders } from '@/utils/channelUtils';

// Add this line to prevent static rendering
export const dynamic = 'force-dynamic';

interface CalendarDataType {
  [key: string]: Fixture[];
}

const calendarData = calendarDataImport as unknown as CalendarDataType;

console.log('Initial leagueTeamsData from static file:', Object.keys(leagueTeamsData).length > 0 ? 
  `Found data for ${Object.keys(leagueTeamsData).length} leagues` : 
  'No pre-fetched data found');

console.log('Initial calendarData from static file:', Object.keys(calendarData).length > 0 ? 
  `Found data for ${Object.keys(calendarData).length} dates` : 
  'No pre-fetched calendar data found');

interface ApiFixture {
  league: {
    id: number;
    name: string;
    // Add other properties as needed
  };
  // Add other properties as needed
}

interface TeamData {
  team: {
    id: number;
    name: string;
    logo: string;
    // Add other team properties as needed
  };
  venue?: {
    id?: number;
    name?: string;
    city?: string;
    // Add other venue properties as needed
  };
  // Add other properties that might be in your team data
}

// Update the TopPlayerStatistics interface to match the actual data structure
interface TopPlayerStatistics {
  team: {
    id: number;
    name: string;
    logo: string;
  };
  league: {
    id: number;
    name: string;
    country?: string;
    logo?: string;
    flag?: string;
    season?: number;
  };
  games: {
    appearences: number;
    lineups?: number;
    minutes: number;
    number?: number | null;
    position?: string;
    rating?: string;
    captain?: boolean;
  };
  goals: {
    total: number;
    assists?: number | null;
    saves?: number | null;
  };
  shots?: {
    total?: number;
    on?: number;
  };
  passes?: {
    total?: number;
    key?: number;
    accuracy?: number;
  };
  tackles?: {
    total?: number;
    blocks?: number;
    interceptions?: number;
  };
  duels?: {
    total?: number;
    won?: number;
  };
  dribbles?: {
    attempts?: number;
    success?: number;
    past?: number;
  };
  fouls?: {
    drawn?: number;
    committed?: number;
  };
  cards: {
    yellow: number;
    red: number;
  };
  penalty?: {
    won?: number;
    committed?: number;
    scored?: number;
    missed?: number;
    saved?: number;
  };
}

interface TopPlayer {
  player: {
    id: number;
    name: string;
    firstname: string;
    lastname: string;
    age?: number;
    birth?: {
      date: string;
      place: string;
      country: string;
    };
    nationality?: string;
    height?: string;
    weight?: string;
    injured?: boolean;
    photo?: string;
  };
  statistics: TopPlayerStatistics[];
}

// When using the league logo, generate it from the ID
const getLeagueLogo = (leagueId: number) => `https://media.api-sports.io/football/leagues/${leagueId}.png`;

// Add the LiveMatch interface
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
  lastUpdated: number;
}

export default function MatchCalendar({ currentMatchId = "" }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [matchCounts, setMatchCounts] = useState<{ [key: string]: number }>({});
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const lastFetchTime = useRef<{ [key: string]: number }>({});
  const MIN_FETCH_INTERVAL = 300000; // 5 minutes between updates
  const [expandedLeagues, setExpandedLeagues] = useState<{[key: number]: boolean}>({});
  const [leagueTeams, setLeagueTeams] = useState<{[key: number]: TeamData[]}>(leagueTeamsData);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Add new states for live match tracking
  const [liveMatches, setLiveMatches] = useState<{[key: number]: LiveMatch}>({});
  const [isLoadingLiveData, setIsLoadingLiveData] = useState<boolean>(false);

  // Add this state for real-time match time
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // First, let's modify the days generation in the useMemo hook to include league information
  const days = useMemo(() => {
    const daysArray = [];
    const dayNames = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];
    
    for (let i = -2; i < 3; i++) {
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() + i);
      
      const isToday = new Date().toDateString() === date.toDateString();
      const isTomorrow = new Date(new Date().setDate(new Date().getDate() + 1)).toDateString() === date.toDateString();
      const isYesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toDateString() === date.toDateString();
      
      let label = dayNames[date.getDay()];
      if (isToday) label = 'I dag';
      if (isTomorrow) label = 'I mor.';
      if (isYesterday) label = 'I går';

      const dateStr = date.toISOString().split('T')[0];
      
      // Find leagues that have matches on this date
      const leaguesWithMatches = [];
      if (calendarData[dateStr] && calendarData[dateStr].length > 0) {
        // Extract unique league IDs from matches on this date
        const leagueIds = [...new Set(calendarData[dateStr].map(match => match.league?.id).filter(Boolean))];
        
        // Find corresponding league data - ONLY for Premier League (39) and Champions League (2)
        leaguesWithMatches.push(...MAJOR_LEAGUES.filter(league => 
          leagueIds.includes(league.id) && [39, 2].includes(league.id)
        ));
      }

      daysArray.push({
        id: date.toISOString(),
        label,
        date: date.getDate().toString(),
        isSelected: date.toDateString() === selectedDate.toDateString(),
        matchCount: matchCounts[dateStr] || 0,
        leagues: leaguesWithMatches.slice(0, 3) // Limit to 3 leagues to avoid overcrowding
      });
    }
    return daysArray;
  }, [currentDate, selectedDate, matchCounts]);

  // Memoize the fetch function to prevent unnecessary re-renders
  const fetchMissingMatchCounts = useCallback(async () => {
    const now = Date.now();
    const updatedCounts = { ...matchCounts };
    let needsUpdate = false;
    
    for (let i = -2; i < 3; i++) {
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Only fetch if we don't have data for this date AND enough time has passed
      if (updatedCounts[dateStr] === undefined && 
          (!lastFetchTime.current[dateStr] || 
           now - lastFetchTime.current[dateStr] >= MIN_FETCH_INTERVAL)) {
        
        try {
          const response = await fetch(`/api/football/calendar/${dateStr}`);
          if (response.ok) {
            const data = await response.json();
            const fixtures = data.response || [];
            // Filter for our leagues
            const filteredFixtures = fixtures.filter((fixture: ApiFixture) => 
              MAJOR_LEAGUES.some(league => league.id === fixture.league.id)
            );
            updatedCounts[dateStr] = filteredFixtures.length;
            lastFetchTime.current[dateStr] = now;
            needsUpdate = true;
          }
        } catch (error) {
          console.error(`Error fetching matches for ${dateStr}:`, error);
          updatedCounts[dateStr] = 0;
        }
      }
    }
    
    // Only update state if we fetched new data
    if (needsUpdate) {
      setMatchCounts(prev => ({...prev, ...updatedCounts}));
    }
  }, [currentDate, matchCounts]); // Include matchCounts in dependencies

  // Effect to trigger the fetch
  useEffect(() => {
    fetchMissingMatchCounts();
  }, [fetchMissingMatchCounts]); // Only depend on the memoized fetch function

  // Fetch matches for selected date - with rate limiting
  useEffect(() => {
    const fetchMatchesForSelectedDate = async () => {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const now = Date.now();

      // Check if we need to fetch based on time elapsed
      if (lastFetchTime.current[`matches_${dateStr}`] && 
          now - lastFetchTime.current[`matches_${dateStr}`] < MIN_FETCH_INTERVAL) {
        return;
      }

      setLoading(true);
      try {
        // Check if we have pre-fetched data
        if (calendarData[dateStr] && calendarData[dateStr].length > 0) {
          setMatches(calendarData[dateStr]);
        } else {
          const response = await fetch(`/api/football/calendar/${dateStr}`);
          if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
          }
          
          const data = await response.json();
          const fixtures = data.response || [];
          
          // Filter to only include matches from our selected leagues
          const filteredFixtures = fixtures.filter((fixture: ApiFixture) => 
            MAJOR_LEAGUES.some(league => league.id === fixture.league.id)
          );
          
          setMatches(filteredFixtures);
          lastFetchTime.current[`matches_${dateStr}`] = now;
        }
      } catch (error) {
        console.error('Error fetching matches:', error);
        setMatches([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMatchesForSelectedDate();
  }, [selectedDate]);

  // Group matches by league - add debug log
  const matchesByLeague = useMemo(() => {
    const grouped = MAJOR_LEAGUES.map(league => ({
      ...league,
      matches: matches.filter(match => match.league.id === league.id)
    })).filter(league => league.matches.length > 0);
    
    console.log('Grouped matches by league:', grouped);
    return grouped;
  }, [matches]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0));
    setScrollLeft(scrollRef.current?.scrollLeft || 0);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (scrollRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2; // Multiply by 2 for faster scrolling
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  // Fetch match data from our server endpoint
  const fetchMatchData = async () => {
    try {
      setIsLoadingLiveData(true);
      
      const response = await fetch('/api/football/live');
      
      if (!response.ok) {
        throw new Error('Failed to fetch match data');
      }
      
      const data = await response.json();
      const newLiveMatchesMap: {[key: number]: LiveMatch} = {};
      const now = Date.now();
      
      // Process live matches
      data.live?.forEach((match: any) => {
        if (MAJOR_LEAGUES.some(league => league.id === match.league.id)) {
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
        if (MAJOR_LEAGUES.some(league => league.id === match.league.id)) {
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
      fetchMatchData();
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);

  // Add this useEffect for the real-time timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  // Modify the getMatchStatus function to use real-time elapsed minutes
  const getMatchStatus = (match: any) => {
    const fixtureId = match.fixture?.id;
    const liveData = liveMatches[fixtureId];
    const matchDate = new Date(match.fixture?.date || '');
    const now = new Date();
    const isToday = matchDate.toDateString() === now.toDateString();
    
    // Check if match is finished either from live data or original fixture data
    const isFinished = liveData?.status.short === 'FT' || 
                      match.fixture?.status?.short === 'FT' || 
                      match.status?.short === 'FT';  // Add this check

    // For today's finished matches or past matches, show the score
    if (isFinished) {
      return {
        displayTime: null,
        isLive: false,
        isPastMatch: false,
        isFinished: true,
        score: liveData ? 
          `${liveData.goals.home} - ${liveData.goals.away}` : 
          `${match.goals?.home || 0} - ${match.goals?.away || 0}`  // Add fallback to 0
      };
    }

    if (!liveData) return { 
      displayTime: matchDate.toLocaleTimeString('no-NO', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      isLive: false,
      isPastMatch: false,
      isFinished: false,
      score: null
    };

    const isLive = ['1H', 'HT', '2H', 'ET', 'P', 'LIVE', 'SUSP', 'INT'].includes(liveData.status.short);
    
    let displayTime = liveData.status.short;
    if (isLive && liveData.status.elapsed !== null && liveData.status.short !== 'HT') {
      const elapsedSeconds = Math.floor((currentTime.getTime() - liveData.lastUpdated) / 1000);
      const additionalMinutes = Math.floor(elapsedSeconds / 60);
      const totalElapsed = liveData.status.elapsed + additionalMinutes;
      displayTime = `${totalElapsed}'`;
    }

    return {
      displayTime: isLive ? 
        liveData.status.short === 'HT' ? 'Pause' : displayTime : 
        matchDate.toLocaleTimeString('no-NO', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
      isLive,
      isPastMatch: false,
      isFinished: false,
      score: isLive ? `${liveData.goals.home} - ${liveData.goals.away}` : null
    };
  };

  // In your render method, before rendering matchesByLeague
  const allLiveMatches = matchesByLeague.flatMap(league => 
    league.matches.filter(match => {
      const isLive = liveMatches[match.fixture?.id]?.status.short && 
        ['1H', 'HT', '2H', 'ET', 'P', 'LIVE', 'SUSP', 'INT'].includes(liveMatches[match.fixture?.id]?.status.short);
      return isLive;
    })
  );

  return (
    <div className="bg-gray-50 md:p-4 rounded-lg">
      <PreventAutoScroll />
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Calendar navigation */}
        <div className="flex items-center border-b bg-gray-50">
          <button 
            className="p-3 hover:bg-gray-100 transition-colors"
            onClick={() => {
              const newDate = new Date(currentDate);
              newDate.setDate(currentDate.getDate() - 5);
              setCurrentDate(newDate);
            }}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Days - now with drag functionality */}
          <div 
            ref={scrollRef}
            className="flex-1 flex overflow-x-auto hide-scrollbar cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseMove={handleMouseMove}
          >
            {days.map(day => (
              <button 
                key={day.id}
                className={`flex-1 flex flex-col items-center py-2 px-4 min-w-[70px] relative transition-colors ${
                  day.isSelected
                    ? 'bg-[#142811] text-white border-b-2 border-green-500' 
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => setSelectedDate(new Date(day.id))}
              >
                {/* League logos */}
                {day.leagues && day.leagues.length > 0 && (
                  <div className="absolute top-1 right-1 flex space-x-1">
                    {day.leagues.map(league => (
                      <div 
                        key={league.id} 
                        className="relative w-5 h-5 bg-white rounded-full shadow-sm flex items-center justify-center overflow-hidden"
                        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
                      >
                        <div className="relative w-3.5 h-3.5">
                          <Image 
                            src={getLeagueLogo(league.id)}
                            alt={league.name}
                            fill
                            className="object-contain"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <span className="text-xs">{day.label}</span>
                <span className="text-xl font-bold my-1">{day.date}</span>
                <span className={`text-xs ${
                  day.isSelected ? 'text-green-300' : 'text-gray-500'
                }`}>
                  {day.matchCount} kamper
                </span>
              </button>
            ))}
          </div>

          <button 
            className="p-3 hover:bg-gray-100 transition-colors"
            onClick={() => {
              const newDate = new Date(currentDate);
              newDate.setDate(currentDate.getDate() + 5);
              setCurrentDate(newDate);
            }}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Matches list */}
        <div className="divide-y divide-gray-100">
          {/* Live Matches Section */}
          {allLiveMatches.length > 0 && (
            <div className="border-t first:border-t-0">
              <div className="flex items-center px-3 py-2 bg-red-50">
                <div className="flex items-center">
                  <span className="h-1.5 w-1.5 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                  <span className="text-sm font-medium text-red-700">Spiller nå</span>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {allLiveMatches.map(match => {
                  const streamingProviders = getStreamingProviders(match.league.id);
                  const hasStreamingProviders = streamingProviders.length > 0;
                  const status = getMatchStatus(match);
                  const { displayTime, isLive, score, isPastMatch } = status;

                  return (
                    <Link 
                      key={`live-${match.fixture?.id || match.id}`}
                      href={`/fotball/kamp/${match.fixture?.id || match.id}`}
                      className={`block hover:bg-gray-50 transition-colors py-[15px] px-3 ${
                        currentMatchId === (match.fixture?.id || match.id).toString()
                          ? 'bg-gray-50' 
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {/* Home Team */}
                        <div className="flex items-center flex-1 min-w-0">
                          <div className="relative w-5 h-5 flex-shrink-0">
                            <Image 
                              src={match.teams?.home.logo} 
                              alt={match.teams?.home.name} 
                              fill
                              className="object-contain"
                              unoptimized
                            />
                          </div>
                          <span className="ml-2 text-sm truncate">
                            {match.teams?.home.name}
                          </span>
                        </div>

                        {/* Match Time/Score with TV icon */}
                        <div className="flex-shrink-0 flex items-center gap-2">
                          <div className="text-center flex items-center gap-2">
                            {/* Score display - Always show score for past matches */}
                            {(isLive || score || isPastMatch) && (
                              <span className={`text-xs lg:text-sm font-bold ${isLive ? 'text-red-600' : 'text-gray-800'}`}>
                                {score}
                              </span>
                            )}

                            {/* Time display - Only show for live/upcoming matches */}
                            {!isPastMatch && displayTime && (
                              isLive ? (
                                <div className="flex flex-col items-center">
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] lg:text-xs font-semibold bg-red-100 text-red-700 border border-red-200/80">
                                    <span className="h-1.5 w-1.5 bg-red-500 rounded-full mr-1 animate-pulse"></span>
                                    {displayTime}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm font-medium text-gray-500 lg:text-gray-600">
                                  {displayTime}
                                </span>
                              )
                            )}
                          </div>
                          
                          {/* Only show TV icon if match is upcoming (not past, not live, not finished) and has streaming providers */}
                          {hasStreamingProviders && !status.isPastMatch && !status.isLive && !status.isFinished && (
                            <div className="ml-1 lg:ml-2 relative group flex-shrink-0">
                              <div className="text-gray-400 hover:text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 lg:h-5 lg:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                              </div>
                              
                              <div className="absolute z-20 right-0 w-44 p-2 mt-1 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 text-xs border border-gray-200">
                                <div className="font-medium mb-1">Se kampen på:</div>
                                <div className="space-y-1">
                                  {streamingProviders.map((provider, index) => (
                                    <div key={index} className="flex items-center">
                                      <div className="relative h-3 w-3 mr-1">
                                        <Image
                                          src={provider.icon}
                                          alt={provider.name}
                                          fill
                                          className="object-contain"
                                          unoptimized
                                        />
                                      </div>
                                      <span className="text-[11px]">{provider.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          {/* Keep the spacer div for consistent layout */}
                          {(hasStreamingProviders || status.isPastMatch || status.isLive || status.isFinished) && 
                            <div className="w-4 lg:w-5 ml-1 lg:ml-2 flex-shrink-0"></div>
                          }
                        </div>

                        {/* Away Team */}
                        <div className="flex items-center flex-1 min-w-0 justify-end">
                          <span className="mr-2 text-sm truncate">
                            {match.teams?.away.name}
                          </span>
                          <div className="relative w-5 h-5 flex-shrink-0">
                            <Image 
                              src={match.teams?.away.logo} 
                              alt={match.teams?.away.name} 
                              fill
                              className="object-contain"
                              unoptimized
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Regular Matches Section */}
          {matchesByLeague.map((league, leagueIndex) => {
            const nonLiveMatches = league.matches.filter(match => {
              const isLive = liveMatches[match.fixture?.id]?.status.short && 
                ['1H', 'HT', '2H', 'ET', 'P', 'LIVE', 'SUSP', 'INT'].includes(liveMatches[match.fixture?.id]?.status.short);
              return !isLive;
            });

            if (nonLiveMatches.length === 0) return null;

            // Get the date and time from the first match
            const firstMatch = nonLiveMatches[0];
            const matchDate = firstMatch?.fixture?.date?.split('T')[0] || 'no-date';
            const matchTime = firstMatch?.fixture?.date?.split('T')[1]?.substring(0, 5) || '00:00';
            const uniqueKey = `regular-${league.id}-${matchDate}-${matchTime}-${leagueIndex}`;

            return (
              <div key={uniqueKey} className="border-t first:border-t-0">
                <div className="flex items-center px-3 py-2 bg-gray-50">
                  <div className="relative w-4 h-4 mr-2">
                    <Image 
                      src={getLeagueLogo(league.id)}
                      alt={league.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span className="text-sm font-medium">{league.name}</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {nonLiveMatches.map((match: Fixture & { 
                    fixture?: { 
                      id: number;
                      status: { short: string; elapsed: number | null };
                      date: string;
                    };
                    teams?: {
                      home: { name: string; logo: string };
                      away: { name: string; logo: string };
                    };
                    goals?: {
                      home: number | null;
                      away: number | null;
                    };
                  }) => {
                    const streamingProviders = getStreamingProviders(league.id);
                    const hasStreamingProviders = streamingProviders.length > 0;
                    const status = getMatchStatus(match);
                    const { displayTime, isLive, score, isPastMatch } = status;

                    return (
                      <Link 
                        key={`regular-${match.fixture?.id || match.id}`}
                        href={`/fotball/kamp/${match.fixture?.id || match.id}`}
                        className={`block hover:bg-gray-50 transition-colors py-[15px] px-3 ${
                          currentMatchId === (match.fixture?.id || match.id).toString()
                            ? 'bg-gray-50' 
                            : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {/* Home Team */}
                          <div className="flex items-center flex-1 min-w-0">
                            <div className="relative w-5 h-5 flex-shrink-0">
                              <Image 
                                src={match.teams?.home.logo} 
                                alt={match.teams?.home.name} 
                                fill
                                className="object-contain"
                                unoptimized
                              />
                            </div>
                            <span className="ml-2 text-sm truncate">
                              {match.teams?.home.name}
                            </span>
                          </div>

                          {/* Match Time/Score with TV icon */}
                          <div className="flex-shrink-0 flex items-center gap-2">
                            <div className="text-center flex items-center gap-2">
                              {/* Score display - Always show score for past matches */}
                              {(isLive || score || isPastMatch) && (
                                <span className={`text-xs lg:text-sm font-bold ${isLive ? 'text-red-600' : 'text-gray-800'}`}>
                                  {score}
                                </span>
                              )}

                              {/* Time display - Only show for live/upcoming matches */}
                              {!isPastMatch && displayTime && (
                                isLive ? (
                                  <div className="flex flex-col items-center">
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] lg:text-xs font-semibold bg-red-100 text-red-700 border border-red-200/80">
                                      <span className="h-1.5 w-1.5 bg-red-500 rounded-full mr-1 animate-pulse"></span>
                                      {displayTime}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm font-medium text-gray-500 lg:text-gray-600">
                                    {displayTime}
                                  </span>
                                )
                              )}
                            </div>
                            
                            {/* Only show TV icon if match is upcoming (not past, not live, not finished) and has streaming providers */}
                            {hasStreamingProviders && !status.isPastMatch && !status.isLive && !status.isFinished && (
                              <div className="ml-1 lg:ml-2 relative group flex-shrink-0">
                                <div className="text-gray-400 hover:text-gray-600">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 lg:h-5 lg:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                
                                <div className="absolute z-20 right-0 w-44 p-2 mt-1 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 text-xs border border-gray-200">
                                  <div className="font-medium mb-1">Se kampen på:</div>
                                  <div className="space-y-1">
                                    {streamingProviders.map((provider, index) => (
                                      <div key={index} className="flex items-center">
                                        <div className="relative h-3 w-3 mr-1">
                                          <Image
                                            src={provider.icon}
                                            alt={provider.name}
                                            fill
                                            className="object-contain"
                                            unoptimized
                                          />
                                        </div>
                                        <span className="text-[11px]">{provider.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                            {/* Keep the spacer div for consistent layout */}
                            {(hasStreamingProviders || status.isPastMatch || status.isLive || status.isFinished) && 
                              <div className="w-4 lg:w-5 ml-1 lg:ml-2 flex-shrink-0"></div>
                            }
                          </div>

                          {/* Away Team */}
                          <div className="flex items-center flex-1 min-w-0 justify-end">
                            <span className="mr-2 text-sm truncate">
                              {match.teams?.away.name}
                            </span>
                            <div className="relative w-5 h-5 flex-shrink-0">
                              <Image 
                                src={match.teams?.away.logo} 
                                alt={match.teams?.away.name} 
                                fill
                                className="object-contain"
                                unoptimized
                              />
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Se kamper section */}
        <div className="mt-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="font-medium text-gray-700 text-sm mb-2">Se kamper</h3>
            <div className="py-1">
              <Link className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" href="/fotball/i-dag">I dag</Link>
              <Link className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" href="/fotball/i-morgen">I morgen</Link>
              <Link className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" href="/fotball/mandag">Mandag</Link>
              <Link className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" href="/fotball/tirsdag">Tirsdag</Link>
              <Link className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" href="/fotball/onsdag">Onsdag</Link>
              <Link className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" href="/fotball/torsdag">Torsdag</Link>
              <Link className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" href="/fotball/fredag">Fredag</Link>
              <Link className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" href="/fotball/lordag">Lørdag</Link>
              <Link className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" href="/fotball/sondag">Søndag</Link>
            </div>
          </div>
        </div>
        
        <style jsx>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
            user-select: none;
          }
        `}</style>
      </div>
    </div>
  );
} 
