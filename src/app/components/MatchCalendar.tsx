"use client"

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Fixture } from '@/app/services/sportApi';
import { leagueTeamsData } from '@/app/data/leagueTeams';
import { calendarData as calendarDataImport } from '@/app/data/calendarData';
import { topPlayersData } from '../data/topPlayersData';
import { createPlayerSlug } from '@/lib/utils';

// Add this line to prevent static rendering
export const dynamic = 'force-dynamic';

const LEAGUES = [
  { id: 39, name: 'Premier League', logo: 'https://media.api-sports.io/football/leagues/39.png' },
  { id: 2, name: 'Champions League', logo: 'https://media.api-sports.io/football/leagues/2.png' },
  { id: 140, name: 'La Liga', logo: 'https://media.api-sports.io/football/leagues/140.png' },
  { id: 135, name: 'Serie A', logo: 'https://media.api-sports.io/football/leagues/135.png' },
  { id: 78, name: 'Bundesliga', logo: 'https://media.api-sports.io/football/leagues/78.png' },
];

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

export default function MatchCalendar({ currentMatchId = "" }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [matches, setMatches] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchCounts, setMatchCounts] = useState<{[key: string]: number}>(() => {
    const counts: {[key: string]: number} = {};
    
    // Calculate counts from pre-fetched data
    for (const dateStr in calendarData) {
      counts[dateStr] = calendarData[dateStr]?.length || 0;
    }
    
    return counts;
  });
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [expandedLeagues, setExpandedLeagues] = useState<{[key: number]: boolean}>({});
  const [leagueTeams, setLeagueTeams] = useState<{[key: number]: TeamData[]}>(leagueTeamsData);
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);
  const [playerCategory, setPlayerCategory] = useState<'scorers' | 'assists' | 'redcards'>('scorers');
  const [playerCategoryTitle, setPlayerCategoryTitle] = useState('Toppscorere Premier League');

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
        leaguesWithMatches.push(...LEAGUES.filter(league => 
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

  // Modify the fetch match counts effect to only fetch missing dates
  useEffect(() => {
    const fetchMissingMatchCounts = async () => {
      const updatedCounts = { ...matchCounts };
      let needsUpdate = false;
      
      for (let i = -2; i < 3; i++) {
        const date = new Date(currentDate);
        date.setDate(currentDate.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Only fetch if we don't have data for this date
        if (updatedCounts[dateStr] === undefined) {
          console.log(`No pre-fetched data for date ${dateStr}, fetching from API...`);
          try {
            const response = await fetch(`/api/football/calendar/${dateStr}`);
            if (response.ok) {
              const data = await response.json();
              const fixtures = data.response || [];
              // Filter for our leagues
              const filteredFixtures = fixtures.filter((fixture: ApiFixture) => 
                LEAGUES.some(league => league.id === fixture.league.id)
              );
              updatedCounts[dateStr] = filteredFixtures.length;
              needsUpdate = true;
            }
          } catch (error) {
            console.error(`Error fetching matches for ${dateStr}:`, error);
            updatedCounts[dateStr] = 0;
            needsUpdate = true;
          }
        } else {
          console.log(`Using pre-fetched match count for date ${dateStr}: ${updatedCounts[dateStr]} matches`);
        }
      }
      
      // Only update state if we fetched new data
      if (needsUpdate) {
        setMatchCounts(updatedCounts);
      }
    };

    fetchMissingMatchCounts();
  }, [currentDate, matchCounts]);

  // Modify the fetch matches effect to use pre-fetched data
  useEffect(() => {
    const fetchMatchesForSelectedDate = async () => {
      setLoading(true);
      try {
        const dateStr = selectedDate.toISOString().split('T')[0];
        
        // Check if we have pre-fetched data for this date
        if (calendarData[dateStr] && calendarData[dateStr].length > 0) {
          console.log(`Using pre-fetched matches for date ${dateStr}: ${calendarData[dateStr].length} matches`);
          setMatches(calendarData[dateStr]);
        } else {
          console.log(`No pre-fetched data for date ${dateStr}, fetching from API...`);
          // Use the calendar-specific API route
          const response = await fetch(`/api/football/calendar/${dateStr}`);
          if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
          }
          
          const data = await response.json();
          const fixtures = data.response || [];
          
          // Filter to only include matches from our selected leagues
          const filteredFixtures = fixtures.filter((fixture: ApiFixture) => 
            LEAGUES.some(league => league.id === fixture.league.id)
          );
          
          console.log(`Fetched ${filteredFixtures.length} matches for date ${dateStr} from API`);
          setMatches(filteredFixtures);
        }
      } catch (error) {
        console.error('Error fetching matches:', error);
        setMatches([]);
      }
      setLoading(false);
    };

    fetchMatchesForSelectedDate();
  }, [selectedDate]);

  // Group matches by league - add debug log
  const matchesByLeague = useMemo(() => {
    const grouped = LEAGUES.map(league => ({
      ...league,
      matches: matches.filter(match => match.league.id === league.id)
    })).filter(league => league.matches.length > 0);
    
    console.log('Grouped matches by league:', grouped);
    return grouped;
  }, [matches]);

  // Only fetch teams if they're not in the pre-fetched data
  useEffect(() => {
    async function fetchMissingTeams() {
      console.log('Checking for missing teams data...');
      
      // Log the pre-fetched data
      for (const league of LEAGUES) {
        const teamsCount = leagueTeams[league.id]?.length || 0;
        console.log(`Pre-fetched data for league ${league.id} (${league.name}): ${teamsCount} teams`);
      }
      
      const updatedTeams = { ...leagueTeams };
      let needsUpdate = false;
      
      for (const league of LEAGUES) {
        // Only fetch if we don't have data for this league
        if (!updatedTeams[league.id] || updatedTeams[league.id].length === 0) {
          console.log(`No pre-fetched data for league ${league.id}, fetching from API...`);
          try {
            const response = await fetch(`/api/football/teams/${league.id}`);
            
            if (response.ok) {
              const data = await response.json();
              
              if (data.response && Array.isArray(data.response)) {
                console.log(`Fetched ${data.response.length} teams for league ${league.id} from API`);
                updatedTeams[league.id] = data.response;
                needsUpdate = true;
              }
            }
          } catch (error) {
            console.error(`Error fetching teams for league ${league.id}:`, error);
          }
        } else {
          console.log(`Using pre-fetched data for league ${league.id} (${league.name}): ${updatedTeams[league.id].length} teams`);
        }
      }
      
      // Only update state if we fetched new data
      if (needsUpdate) {
        console.log('Updating state with newly fetched teams data');
        setLeagueTeams(updatedTeams);
      } else {
        console.log('No new data fetched, using pre-fetched data only');
      }
    }
    
    fetchMissingTeams();
  }, [leagueTeams]);
  
  // Function to toggle league expansion
  const toggleLeague = (leagueId: number) => {
    setExpandedLeagues(prev => ({
      ...prev,
      [leagueId]: !prev[leagueId]
    }));
  };

  // Replace the useEffect for fetching top players with this
  useEffect(() => {
    // Use the prefetched data instead of making an API call
    if (topPlayersData && topPlayersData[39]) { // 39 is Premier League
      const leagueData = topPlayersData[39];
      const categoryData = leagueData.categories[playerCategory] || [];
      
      setPlayerCategoryTitle(`${playerCategory === 'scorers' ? 'Toppscorere' : 
                          playerCategory === 'assists' ? 'Flest assists' : 
                          'Flest røde kort'} ${leagueData.name}`);
      
      // Cast the data to the TopPlayer[] type since we know the structure is compatible
      setTopPlayers(categoryData as unknown as TopPlayer[]);
      setLoadingPlayers(false);
    } else {
      // Fallback to API if prefetched data is not available
      async function fetchTopPlayers() {
        try {
          setLoadingPlayers(true);
          
          let endpoint = '/api/football/players/topscorers';
          let title = 'Toppscorere Premier League';
          
          if (playerCategory === 'assists') {
            endpoint = '/api/football/players/topassists';
            title = 'Flest assists Premier League';
          } else if (playerCategory === 'redcards') {
            endpoint = '/api/football/players/topredcards';
            title = 'Flest røde kort Premier League';
          }
          
          setPlayerCategoryTitle(title);
          
          const response = await fetch(`${endpoint}?league=39&season=2023`);
          
          if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data.response && Array.isArray(data.response)) {
            // Cast the API response to the TopPlayer[] type
            setTopPlayers(data.response.slice(0, 5) as unknown as TopPlayer[]);
          }
        } catch (error) {
          console.error('Error fetching top players:', error);
        } finally {
          setLoadingPlayers(false);
        }
      }

      fetchTopPlayers();
    }
  }, [playerCategory]);

  return (
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

        {/* Days */}
        <div className="flex-1 flex overflow-x-auto hide-scrollbar">
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
                          src={league.logo}
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
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Laster kamper...</p>
          </div>
        ) : matchesByLeague.length > 0 ? (
          matchesByLeague.map(league => (
            <div key={league.id} className="p-4">
              {/* League header */}
              <div className="flex items-center mb-3">
                <div className="relative w-5 h-5 mr-2">
                  <Image 
                    src={league.logo}
                    alt={league.name}
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="text-sm font-medium text-gray-900">{league.name}</span>
              </div>
              
              {/* Matches grid with improved alignment and handling of long team names */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2">
                  {league.matches.map((match: Fixture & { 
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
                  }) => (
                    <Link 
                      key={match.fixture?.id || match.id}
                      href={`/fotball/kamp/${match.fixture?.id || match.id}`}
                      className={`block bg-white rounded-lg shadow-sm transition-colors ${
                        currentMatchId === (match.fixture?.id || match.id).toString()
                          ? 'ring-1 ring-black ring-opacity-5' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="p-3">
                        <div className="grid grid-cols-11 items-center">
                          {/* Home team - 4 columns with fixed width */}
                          <div className="col-span-4 pr-2">
                            <div className="flex items-center">
                              <div className="relative w-6 h-6 flex-shrink-0">
                                <Image 
                                  src={match.teams?.home.logo} 
                                  alt={match.teams?.home.name} 
                                  fill
                                  className="object-contain"
                                />
                              </div>
                              <span className="ml-2 font-medium truncate max-w-[calc(100%-24px)]">
                                {match.teams?.home.name}
                              </span>
                            </div>
                          </div>
                          
                          {/* Score/Time - 3 columns, centered with fixed width */}
                          <div className="col-span-3 text-center px-2 border-l border-r border-gray-100">
                            {match.fixture?.status?.short === 'NS' ? (
                              <>
                                <div className="text-lg font-bold">
                                  {new Date(match.fixture?.date).toLocaleTimeString('no-NO', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {new Date(match.fixture?.date).toLocaleDateString('no-NO', { 
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short'
                                  })}
                                </div>
                              </>
                            ) : match.fixture?.status?.short && ['1H', '2H', 'HT'].includes(match.fixture.status.short) ? (
                              <>
                                <div className="text-lg font-bold">
                                  {match.goals?.home ?? 0} - {match.goals?.away ?? 0}
                                </div>
                                <div className="text-xs px-2 py-0.5 rounded bg-red-600 text-white flex items-center justify-center">
                                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse mr-1"></span>
                                  {match.fixture?.status?.elapsed}&apos;
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="text-lg font-bold">
                                  {match.goals?.home ?? 0} - {match.goals?.away ?? 0}
                                </div>
                                <div className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-800">
                                  Slutt
                                </div>
                              </>
                            )}
                          </div>
                          
                          {/* Away team - 4 columns with fixed width */}
                          <div className="col-span-4 pl-2">
                            <div className="flex items-center justify-end">
                              <span className="mr-2 font-medium truncate max-w-[calc(100%-24px)]">
                                {match.teams?.away.name}
                              </span>
                              <div className="relative w-6 h-6 flex-shrink-0">
                                <Image 
                                  src={match.teams?.away.logo} 
                                  alt={match.teams?.away.name} 
                                  fill
                                  className="object-contain"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-600">Ingen kamper på denne dagen</p>
          </div>
        )}
      </div>
      
      {/* Top Players Section */}
      <div className="mt-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-gray-700 text-sm">{playerCategoryTitle}</h3>
            <div className="flex space-x-1">
              <button 
                onClick={() => setPlayerCategory('scorers')}
                className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
                  playerCategory === 'scorers' 
                    ? 'bg-[#142811] text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Mål
              </button>
              <button 
                onClick={() => setPlayerCategory('assists')}
                className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
                  playerCategory === 'assists' 
                    ? 'bg-[#142811] text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Assists
              </button>
              <button 
                onClick={() => setPlayerCategory('redcards')}
                className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
                  playerCategory === 'redcards' 
                    ? 'bg-[#142811] text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Røde kort
              </button>
            </div>
          </div>
          
          {loadingPlayers ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Laster spillere...</p>
            </div>
          ) : topPlayers && topPlayers.length > 0 ? (
            <div className="space-y-3">
              {topPlayers.map((item, index) => {
                const player = item.player;
                const stats = item.statistics[0];
                
                // Create initials from name
                const nameParts = player.name ? player.name.split(' ') : ['?', '?'];
                const initials = nameParts.length >= 2 
                  ? `${nameParts[0][0]}${nameParts[nameParts.length-1][0]}`.toUpperCase() 
                  : nameParts[0].substring(0, 2).toUpperCase();
                
                // Determine what stat to show based on category
                let statDisplay = '';
                if (playerCategory === 'scorers') {
                  statDisplay = `${stats.goals.total || 0} mål`;
                } else if (playerCategory === 'assists') {
                  statDisplay = `${stats.goals.assists || 0} assists`;
                } else if (playerCategory === 'redcards') {
                  statDisplay = `${stats.cards.red || 0} røde kort`;
                }
                
                return (
                  <div key={player.id} className="flex items-center border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                    <div className="flex-shrink-0 w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center mr-2">
                      <span className="text-xs font-bold text-gray-600">{index + 1}</span>
                    </div>
                    <Link 
                      href={`/spillerprofil/${createPlayerSlug(player.name, player.id)}`}
                      className="flex-grow flex items-center hover:bg-gray-50 rounded-md transition-colors p-1"
                    >
                      <div className="flex-shrink-0 w-12 h-12 relative bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                        {player.id ? (
                          <Image
                            src={`https://media.api-sports.io/football/players/${player.id}.png`}
                            alt={player.name || 'Player'}
                            fill
                            className="object-cover"
                            onError={(e) => {
                              // If image fails to load, show initials instead
                              e.currentTarget.style.display = 'none';
                              // Add null check for parentElement
                              if (e.currentTarget.parentElement) {
                                e.currentTarget.parentElement.innerHTML = `<span class="text-gray-600 font-medium">${initials}</span>`;
                              }
                            }}
                          />
                        ) : (
                          <span className="text-gray-600 font-medium">{initials}</span>
                        )}
                      </div>
                      <div className="ml-3 flex-grow">
                        <div className="flex items-center">
                          <span className="font-medium">{player.name?.split(' ').pop() || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center text-xs text-gray-600">
                          {stats.team?.logo && (
                            <Image
                              src={stats.team.logo}
                              alt={stats.team?.name || 'Team logo'}
                              width={16}
                              height={16}
                              className="mr-1"
                            />
                          )}
                          <span>{stats.team?.name || 'Unknown team'}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="font-bold text-lg">
                          {statDisplay}
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-4">Ingen spillere funnet</p>
          )}
        </div>
      </div>
      
      {/* Biggest Leagues Section */}
      <div className="mt-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="font-medium text-gray-700 mb-2">Største ligaer</h3>
          
          <div className="space-y-2">
            {LEAGUES.map(league => (
              <div key={league.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <button 
                  className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  onClick={() => toggleLeague(league.id)}
                >
                  <div className="flex items-center">
                    <div className="relative w-6 h-6 mr-2">
                      <Image 
                        src={league.logo}
                        alt={league.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <span className="font-medium">{league.name}</span>
                  </div>
                  <svg 
                    className={`w-5 h-5 text-gray-500 transition-transform ${expandedLeagues[league.id] ? 'transform rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {expandedLeagues[league.id] && (
                  <div className="p-3 bg-white border-t border-gray-200">
                    {leagueTeams[league.id] ? (
                      <div className="grid grid-cols-2 gap-2">
                        {Array.isArray(leagueTeams[league.id]) && leagueTeams[league.id].length > 0 ? (
                          leagueTeams[league.id].map(team => (
                            <Link 
                              key={team.team.id} 
                              href={`/lag/${createPlayerSlug(team.team.name, team.team.id)}`}
                              className="flex items-center p-2 rounded-md hover:bg-gray-50"
                            >
                              <div className="relative w-5 h-5 mr-2">
                                <Image 
                                  src={team.team.logo}
                                  alt={team.team.name}
                                  fill
                                  className="object-contain"
                                />
                              </div>
                              <span className="text-sm truncate">{team.team.name}</span>
                            </Link>
                          ))
                        ) : (
                          <div className="col-span-2 text-center py-2">
                            <p className="text-sm text-gray-600">Ingen lag funnet</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {JSON.stringify(leagueTeams[league.id])}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-600">Laster lag...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
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
        }
      `}</style>
    </div>
  );
} 
