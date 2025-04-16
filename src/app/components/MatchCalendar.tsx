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
import { getMatchStatus } from '@/utils/matchUtils';

// Add this line to prevent static rendering
export const dynamic = 'force-dynamic';

// Define the list of allowed league IDs
const ALLOWED_LEAGUE_IDS = [39, 103, 2, 140, 135, 78];

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
      
      // Find if Premier League has matches on this date
      let premierLeagueMatch = null;
      if (calendarData[dateStr] && calendarData[dateStr].length > 0) {
        const leagueIds = [...new Set(calendarData[dateStr].map(match => match.league?.id).filter(Boolean))];
        if (leagueIds.includes(39)) { // Check specifically for Premier League ID (39)
          premierLeagueMatch = MAJOR_LEAGUES.find(league => league.id === 39);
        }
      }

      daysArray.push({
        id: date.toISOString(),
        label,
        date: date.getDate().toString(),
        isSelected: date.toDateString() === selectedDate.toDateString(),
        matchCount: matchCounts[dateStr] || 0,
        premierLeagueMatch: premierLeagueMatch // Store only the PL match data if found
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
            // Filter for our allowed leagues
            const filteredFixtures = fixtures.filter((fixture: ApiFixture) =>
              ALLOWED_LEAGUE_IDS.includes(fixture.league.id) // Use ALLOWED_LEAGUE_IDS
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
          
          // Filter to only include matches from our allowed leagues
          const filteredFixtures = fixtures.filter((fixture: ApiFixture) =>
            ALLOWED_LEAGUE_IDS.includes(fixture.league.id) // Use ALLOWED_LEAGUE_IDS
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
    // Filter MAJOR_LEAGUES first to only include allowed ones
    const allowedLeaguesDetails = MAJOR_LEAGUES.filter(league => ALLOWED_LEAGUE_IDS.includes(league.id));

    const grouped = allowedLeaguesDetails.map(league => ({
      ...league,
      matches: matches.filter(match => match.league.id === league.id)
    })).filter(league => league.matches.length > 0);

    console.log('Grouped matches by allowed league:', grouped);
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
        // Filter for allowed leagues
        if (ALLOWED_LEAGUE_IDS.includes(match.league.id)) { // Use ALLOWED_LEAGUE_IDS
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
        // Filter for allowed leagues
        if (ALLOWED_LEAGUE_IDS.includes(match.league.id)) { // Use ALLOWED_LEAGUE_IDS
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

  // Modify the getMatchStatus function for the new design
  const getMatchStatus = (match: any) => {
    const fixtureId = match.fixture?.id;
    const liveData = liveMatches[fixtureId];
    const matchDate = new Date(match.fixture?.date || '');
    const now = currentTime; // Use the state currentTime for consistency
    const isToday = matchDate.toDateString() === now.toDateString();

    const originalStatusShort = match.fixture?.status?.short || match.status?.short;
    const finalStatus = liveData?.status.short ?? originalStatusShort;
    const isFinishedStatus = finalStatus === 'FT';

    // Determine scores, prioritizing live data, then fixture data, then null
    const homeScore = liveData ? liveData.goals.home : (match.goals?.home ?? null);
    const awayScore = liveData ? liveData.goals.away : (match.goals?.away ?? null);

    const isLive = liveData && ['1H', 'HT', '2H', 'ET', 'P', 'LIVE', 'SUSP', 'INT'].includes(liveData.status.short);

    let displayStatus = finalStatus; // Default to the short status code (e.g., 'NS')
    let kickOffTimeStr = null;
    const isUpcoming = !isLive && !isFinishedStatus && ['NS', 'TBD', 'PST'].includes(finalStatus); // Define upcoming status

    if (isFinishedStatus) {
      displayStatus = 'FT';
    } else if (isLive) {
      if (liveData.status.short === 'HT') {
        displayStatus = 'Pause';
      } else if (liveData.status.elapsed !== null) {
        const elapsedSeconds = Math.floor((now.getTime() - liveData.lastUpdated) / 1000);
        const additionalMinutes = Math.max(0, Math.floor(elapsedSeconds / 60)); // Ensure non-negative
        const totalElapsed = liveData.status.elapsed + additionalMinutes;
        // Cap elapsed time if needed (e.g., at 90+ or 45+ for HT) - simplified for now
        displayStatus = `${Math.min(totalElapsed, 90)}'`; // Basic capping at 90
      } else {
        displayStatus = liveData.status.short; // Fallback like 'LIVE'
      }
    } else if (isUpcoming) {
      kickOffTimeStr = matchDate.toLocaleTimeString('no-NO', {
        hour: '2-digit',
        minute: '2-digit'
      });
      displayStatus = kickOffTimeStr; // For upcoming, the primary display *is* the time
    }
    // Handle other statuses like PST, SUSP, etc. if needed, currently falls back to finalStatus

    return {
      statusShort: finalStatus, // Raw status code
      displayStatus: displayStatus, // Formatted status/time for display (FT, 45', Pause, 21:00)
      isLive,
      isFinished: isFinishedStatus,
      isUpcoming,
      isToday,
      homeScore, // Separate scores
      awayScore,
      kickOffTime: kickOffTimeStr // Formatted kick-off time string (or null)
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
    <div className="bg-white rounded-lg">
      <PreventAutoScroll />
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Calendar navigation */}
        <div className="flex items-center border-b border-gray-200">
          <button 
            className="p-3 hover:bg-gray-100 transition-colors border-r border-gray-100"
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
                className={`flex-1 flex flex-col items-center py-2 px-4 min-w-[70px] relative transition-colors border-r border-gray-100 last:border-r-0 ${
                  day.isSelected
                    ? 'bg-gray-100 text-gray-900 border-b-2 border-blue-600'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => setSelectedDate(new Date(day.id))}
              >
                {/* Premier League icon */}
                {day.premierLeagueMatch && (
                  <div className="absolute top-1 right-1 flex space-x-1"> {/* Keep group for potential future use */}
                    <div
                      key={day.premierLeagueMatch.id}
                      className="relative w-5 h-5 bg-white rounded-full shadow-sm flex items-center justify-center overflow-hidden"
                      style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
                    >
                      <div className="relative w-3.5 h-3.5">
                        <Image
                          src={getLeagueLogo(day.premierLeagueMatch.id)}
                          alt={day.premierLeagueMatch.name}
                          fill
                          className="object-contain"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                <span className="text-xs">{day.label}</span>
                <span className="text-xl font-bold my-1">{day.date}</span>
                <span className={`text-xs ${
                  day.isSelected ? 'text-blue-600' : 'text-gray-500'
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

        {/* Matches list - Remove outer divide-y */}
        <div>
          {/* Live Matches Section */}
          {allLiveMatches.length > 0 && (
            <div>
              <div className="flex items-center px-3 py-2 bg-red-50 border-b border-red-100"> {/* Added border */}
                <div className="flex items-center">
                  <span className="h-1.5 w-1.5 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                  <span className="text-sm font-medium text-red-700">Spiller nå</span>
                </div>
              </div>
              {/* Remove inner divide-y */}
              <div>
                {allLiveMatches.map(match => {
                  const streamingProviders = getStreamingProviders(match.league.id);
                  const hasStreamingProviders = streamingProviders.length > 0;
                  const status = getMatchStatus(match);
                  const { displayStatus, isLive, isFinished, isUpcoming, isToday, homeScore, awayScore, kickOffTime } = status;

                  return (
                    <Link
                      key={`live-${match.fixture?.id || match.id}`}
                      href={`/fotball/kamp/${match.fixture?.id || match.id}`}
                      className={`block hover:bg-gray-50 transition-colors ${
                        currentMatchId === (match.fixture?.id || match.id).toString() ? 'bg-gray-50' : ''
                      }`}
                    >
                      {/* New Match Row Structure */}
                      <div className="flex justify-between items-center px-3 py-3 border-b border-gray-100">
                        {/* Left side: Teams and Scores */}
                        <div className="flex-grow pr-4">
                          {/* Home Team Row - Apply specific margin */}
                          <div className="flex items-center justify-between mb-[13px]"> {/* Use arbitrary value */}
                            <div className="flex items-center min-w-0"> {/* Ensure text truncates */}
                              <div className="relative w-5 h-5 mr-2 flex-shrink-0">
                                <Image src={match.teams?.home.logo} alt={match.teams?.home.name} fill className="object-contain" unoptimized />
                              </div>
                              <span className="text-sm font-normal truncate">{match.teams?.home.name}</span>
                            </div>
                            <span className={`text-sm font-bold ml-2 ${isLive ? 'text-red-600' : ''}`}>
                              {homeScore !== null ? homeScore : ''}
                            </span>
                          </div>
                          {/* Away Team Row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center min-w-0"> {/* Ensure text truncates */}
                              <div className="relative w-5 h-5 mr-2 flex-shrink-0">
                                <Image src={match.teams?.away.logo} alt={match.teams?.away.name} fill className="object-contain" unoptimized />
                              </div>
                              <span className="text-sm font-normal truncate">{match.teams?.away.name}</span>
                            </div>
                            <span className={`text-sm font-bold ml-2 ${isLive ? 'text-red-600' : ''}`}>
                              {awayScore !== null ? awayScore : ''}
                            </span>
                          </div>
                        </div>

                        {/* Right side: Status/Time & TV Icon */}
                        <div className="flex-shrink-0 text-center w-16">
                           <span className={`block text-xs font-semibold ${isLive ? 'text-red-600' : 'text-gray-500'}`}>
                             {displayStatus}
                           </span>
                           {/* TV Icon - Show only for upcoming matches with providers */}
                           {isUpcoming && hasStreamingProviders && (
                             <div className="mt-1 text-gray-400 flex justify-center relative group">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {/* Enhanced Tooltip */}
                                <div className="absolute z-20 left-1/2 transform -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 text-xs border border-gray-200">
                                  <div className="font-semibold mb-1 text-gray-800">Se kampen på:</div>
                                  <div className="space-y-1">
                                    {streamingProviders.map((provider) => (
                                      <div key={provider.name} className="flex items-center">
                                        <div className="relative h-4 w-4 mr-1.5 flex-shrink-0">
                                          <Image
                                            src={provider.icon}
                                            alt={provider.name}
                                            fill
                                            className="object-contain"
                                            unoptimized
                                          />
                                        </div>
                                        <span className="text-[11px] text-gray-700">{provider.name}</span>
                                        {provider.package && (
                                          <span className="text-gray-500 ml-1 text-[10px]">({provider.package})</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                             </div>
                           )}
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
            const nonLiveMatches = league.matches.filter(match => !liveMatches[match.fixture?.id]?.status.short || !['1H', 'HT', '2H', 'ET', 'P', 'LIVE', 'SUSP', 'INT'].includes(liveMatches[match.fixture?.id]?.status.short));

            if (nonLiveMatches.length === 0) return null;

            const firstMatch = nonLiveMatches[0];
            const matchDate = firstMatch?.fixture?.date?.split('T')[0] || 'no-date';
            const matchTime = firstMatch?.fixture?.date?.split('T')[1]?.substring(0, 5) || '00:00';
            const uniqueKey = `regular-${league.id}-${matchDate}-${matchTime}-${leagueIndex}`;

            return (
              <div key={uniqueKey}>
                <div className="flex items-center px-3 py-2 bg-gray-50 border-b border-gray-100"> {/* Added border */}
                  <div className="relative w-4 h-4 mr-2">
                    <Image src={getLeagueLogo(league.id)} alt={league.name} fill className="object-contain" />
                  </div>
                  <span className="text-sm font-medium">{league.name}</span>
                </div>
                {/* Remove inner divide-y */}
                <div>
                  {nonLiveMatches.map((match: Fixture & { /* ... type ... */ }) => {
                    const streamingProviders = getStreamingProviders(league.id);
                    const hasStreamingProviders = streamingProviders.length > 0;
                    const status = getMatchStatus(match);
                    const { displayStatus, isLive, isFinished, isUpcoming, isToday, homeScore, awayScore, kickOffTime } = status;
                    const rowBorderClass = 'border-gray-100';

                    return (
                      <Link
                        key={`regular-${match.fixture?.id || match.id}`}
                        href={`/fotball/kamp/${match.fixture?.id || match.id}`}
                        className={`block hover:bg-gray-50 transition-colors ${
                          currentMatchId === (match.fixture?.id || match.id).toString() ? 'bg-gray-50' : ''
                        }`}
                      >
                        {/* Apply bottom border here */}
                        <div className={`flex justify-between items-center px-3 py-3 border-b ${rowBorderClass}`}>
                          {/* Left side: Teams and Scores - Add conditional border and adjust padding */}
                          <div className={`flex-grow pr-4 ${isFinished ? 'border-r border-gray-100' : ''}`}>
                            {/* Home Team Row */}
                            <div className="flex items-center justify-between mb-[13px]">
                              <div className="flex items-center min-w-0">
                                <div className="relative w-5 h-5 mr-2 flex-shrink-0">
                                  <Image src={match.teams?.home.logo} alt={match.teams?.home.name} fill className="object-contain" unoptimized />
                                </div>
                                <span className="text-sm font-normal truncate">{match.teams?.home.name}</span>
                              </div>
                              {/* Score display */}
                              <span className={`text-sm ml-2 ${isFinished ? 'font-medium' : 'font-bold'}`}>
                                {isFinished ? (homeScore !== null ? homeScore : '') : ''}
                              </span>
                            </div>
                            {/* Away Team Row */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center min-w-0">
                                <div className="relative w-5 h-5 mr-2 flex-shrink-0">
                                  <Image src={match.teams?.away.logo} alt={match.teams?.away.name} fill className="object-contain" unoptimized />
                                </div>
                                <span className="text-sm font-normal truncate">{match.teams?.away.name}</span>
                              </div>
                              {/* Score display */}
                              <span className={`text-sm ml-2 ${isFinished ? 'font-medium' : 'font-bold'}`}>
                                {isFinished ? (awayScore !== null ? awayScore : '') : ''}
                              </span>
                            </div>
                          </div>

                          {/* Right side: Status/Time & TV Icon - Add padding */}
                          <div className="flex-shrink-0 text-center w-16 pl-4"> {/* Added pl-4 */}
                            {isFinished ? (
                              // Updated FT styling
                              <span className="block text-sm font-normal text-gray-500">FT</span>
                            ) : isUpcoming ? (
                              <>
                                {isToday && <span className="block text-xs font-semibold text-gray-500">I dag</span>}
                                <span className={`block text-sm font-medium ${isToday ? 'text-gray-900' : 'text-gray-700'}`}>{kickOffTime}</span>
                              </>
                            ) : (
                              <span className="block text-xs font-semibold text-gray-500">{displayStatus}</span>
                            )}
                            {/* TV Icon - Show only for upcoming matches with providers */}
                            {isUpcoming && hasStreamingProviders && (
                              <div className="mt-1 text-gray-400 flex justify-center relative group">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {/* Enhanced Tooltip */}
                                <div className="absolute z-20 left-1/2 transform -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 text-xs border border-gray-200">
                                  <div className="font-semibold mb-1 text-gray-800">Se kampen på:</div>
                                  <div className="space-y-1">
                                    {streamingProviders.map((provider) => (
                                      <div key={provider.name} className="flex items-center">
                                        <div className="relative h-4 w-4 mr-1.5 flex-shrink-0">
                                          <Image
                                            src={provider.icon}
                                            alt={provider.name}
                                            fill
                                            className="object-contain"
                                            unoptimized
                                          />
                                        </div>
                                        <span className="text-[11px] text-gray-700">{provider.name}</span>
                                        {provider.package && (
                                          <span className="text-gray-500 ml-1 text-[10px]">({provider.package})</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
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
        
        {/* Se kamper section - Redesigned */}
        <div className="bg-white rounded-b-lg"> {/* Ensure bottom rounding if needed, removed mt-4 */}
          <div className="px-3 py-3 border-t border-gray-200"> {/* Adjusted padding */}
            <h3 className="font-medium text-gray-700 text-sm mb-2">Se kamper</h3>
            <Link className="block text-sm text-gray-700 hover:underline py-1" href="/fotball/i-dag">I dag</Link>
            <Link className="block text-sm text-gray-700 hover:underline py-1" href="/fotball/i-morgen">I morgen</Link>
            <Link className="block text-sm text-gray-700 hover:underline py-1" href="/fotball/mandag">Mandag</Link>
            <Link className="block text-sm text-gray-700 hover:underline py-1" href="/fotball/tirsdag">Tirsdag</Link>
            <Link className="block text-sm text-gray-700 hover:underline py-1" href="/fotball/onsdag">Onsdag</Link>
            <Link className="block text-sm text-gray-700 hover:underline py-1" href="/fotball/torsdag">Torsdag</Link>
            <Link className="block text-sm text-gray-700 hover:underline py-1" href="/fotball/fredag">Fredag</Link>
            <Link className="block text-sm text-gray-700 hover:underline py-1" href="/fotball/lordag">Lørdag</Link>
            <Link className="block text-sm text-gray-700 hover:underline py-1" href="/fotball/sondag">Søndag</Link>
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
