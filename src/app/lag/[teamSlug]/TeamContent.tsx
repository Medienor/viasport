"use client"

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatTime, formatDate, createPlayerSlug } from '@/lib/utils';
import TeamTransfers from './TeamTransfers';
import TeamInjuries from './TeamInjuries';
import ClientStandings from './ClientStandings';

// Define types for the props
interface TeamContentProps {
  teamData: {
    team: any;
    leagues: any[];
    standings: any[];
    upcomingMatches: any[];
    recentMatches: any[];
    players: any[];
    transfers: any[];
    injuries: any[];
  };
  teamId: number;
}

// At the top of the file, define a proper type for the tabs
type TabType = 'overview' | 'matches' | 'standings' | 'players' | 'transfers' | 'injuries';

// Helper function to get Norwegian day name
const getNorwegianDayName = (dateString: string) => {
  const date = new Date(dateString);
  const dayNames = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
  return dayNames[date.getDay()];
};

// Helper function to format season as "2023/2024"
const formatSeason = (year: number) => {
  return `${year}/${year + 1}`;
};

export default function TeamContent({ teamData, teamId }: TeamContentProps) {
  // Add state for team leagues from API
  const [teamLeaguesFromApi, setTeamLeaguesFromApi] = useState<any[]>([]);

  // Fetch team leagues on component mount
  useEffect(() => {
    const fetchTeamLeagues = async () => {
      if (!teamId) return;
      
      try {
        const response = await fetch(`/api/team-leagues?team=${teamId}`);
        const data = await response.json();
        
        if (data && data.response && Array.isArray(data.response)) {
          setTeamLeaguesFromApi(data.response);
          console.log(`Team ${teamId} (${teamData.team.name}) leagues:`, data.response);
        } else {
          setTeamLeaguesFromApi([]);
        }
      } catch (error) {
        console.error('Error fetching team leagues:', error);
        setTeamLeaguesFromApi([]);
      }
    };
    
    fetchTeamLeagues();
  }, [teamId, teamData.team.name]);

  // Extract the variables we need from teamData
  const { upcomingMatches, recentMatches, players } = teamData;
  
  // Add this debug log after the variables are declared
  console.log('Initial teamData:', {
    leagues: teamData.leagues,
    standings: teamData.standings,
    upcomingMatches,
    recentMatches
  });

  // Improved function to extract unique leagues
  const extractUniqueLeagues = () => {
    // Create a Set to store unique league IDs
    const uniqueLeagueIds = new Set<number>();
    const uniqueLeagues: any[] = [];
    
    // First, collect all leagues with their metadata
    const allLeagues: any[] = [];
    
    // Add leagues from standings data
    teamData.standings.forEach(standingData => {
      if (standingData && standingData.league) {
        allLeagues.push({
          league: standingData.league,
          hasStandings: true,
          season: standingData.league.season,
          priority: 1,
          standingsData: standingData
        });
      }
    });
    
    // Add leagues from matches
    const processMatch = (match: any) => {
      if (
        match.league && 
        match.league.id && 
        (match.teams.home.id === teamId || match.teams.away.id === teamId)
      ) {
        allLeagues.push({
          league: match.league,
          hasStandings: false,
          season: null,
          priority: 1
        });
      }
    };
    
    upcomingMatches.forEach(processMatch);
    recentMatches.forEach(processMatch);
    
    // Add leagues from API data
    teamLeaguesFromApi.forEach(leagueData => {
      if (leagueData.league) {
        allLeagues.push({
          league: leagueData.league,
          hasStandings: false,
          season: null,
          priority: 1,
          seasons: leagueData.seasons
        });
      }
    });
    
    // Filter to unique leagues
    allLeagues.forEach(leagueData => {
      if (leagueData.league && leagueData.league.id && !uniqueLeagueIds.has(leagueData.league.id)) {
        uniqueLeagueIds.add(leagueData.league.id);
        uniqueLeagues.push(leagueData);
      }
    });
    
    // Find the best league to show standings for
    let bestLeagueWithStandings = null;
    let bestSeasonWithStandings = null;
    
    // First, try to find a league with standings
    const leagueWithStandings = uniqueLeagues.find(l => l.hasStandings);
    if (leagueWithStandings) {
      bestLeagueWithStandings = leagueWithStandings.league.id;
      bestSeasonWithStandings = leagueWithStandings.season;
    }
    
    return { 
      leagues: uniqueLeagues, 
      bestLeagueWithStandings, 
      bestSeasonWithStandings 
    };
  };

  const { 
    leagues: uniqueLeagues, 
    bestLeagueWithStandings, 
    bestSeasonWithStandings 
  } = extractUniqueLeagues();

  // State for interactive elements - with improved defaults
  const [leagueId, setLeagueId] = useState(
    bestLeagueWithStandings || 
    (uniqueLeagues.length > 0 ? uniqueLeagues[0].league.id : 0)
  );
  
  // Find the selected league and get its seasons safely
  const selectedLeague = teamData.leagues.find(l => l.league && l.league.id === leagueId);
  
  // Get available seasons and sort them in descending order (newest first)
  const availableSeasons = selectedLeague?.seasons?.map((s: { year: number }) => s.year).sort((a: number, b: number) => b - a) || [];
  
  // Set initial season to the one with standings, or the newest one, or current year
  const [leagueSeason, setLeagueSeason] = useState(() => {
    if (bestSeasonWithStandings) {
      return bestSeasonWithStandings;
    }
    
    if (availableSeasons.length > 0) {
      return availableSeasons[0];
    }
    
    return new Date().getFullYear();
  });
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Add this new state for matches tab
  const [matchesTab, setMatchesTab] = useState('upcoming');
  
  // Derived data based on state - with safe access
  const availableLeagues = teamData.leagues || [];
  
  // Add these console logs to debug standings data
  console.log('All standings data:', teamData.standings);
  console.log('Selected leagueId:', leagueId);
  console.log('Selected leagueSeason:', leagueSeason);
  
  // Add state for storing fetched standings
  const [standingsData, setStandingsData] = useState<any[]>(() => {
    // Check if we already have standings data for the selected league and season
    const existingStandings = teamData.standings.find(standing => 
      standing.league && 
      standing.league.id === leagueId && 
      standing.league.season === leagueSeason
    );
    
    return existingStandings ? [existingStandings] : [];
  });
  const [isLoadingStandings, setIsLoadingStandings] = useState(false);
  
  // Fetch standings when league or season changes
  useEffect(() => {
    // If we already have standings data in the initial props, use that
    const existingStandings = teamData.standings.find(standing => 
      standing.league && 
      standing.league.id === leagueId && 
      standing.league.season === leagueSeason
    );
    
    if (existingStandings) {
      console.log('Using existing standings data from props for league', leagueId, 'season', leagueSeason);
      console.log('Standings data structure:', existingStandings);
      setStandingsData([existingStandings]);
      return;
    }
    
    const fetchStandings = async () => {
      if (!leagueId || !leagueSeason) return;
      
      setIsLoadingStandings(true);
      try {
        console.log(`Fetching standings for league ${leagueId}, season ${leagueSeason}`);
        const response = await fetch(`/api/standings?league=${leagueId}&season=${leagueSeason}`);
        const data = await response.json();
        
        console.log('API response for standings:', data);
        
        if (data && data.response && data.response.length > 0) {
          console.log('Standings data received:', data.response);
          setStandingsData(data.response);
        } else {
          console.log('No standings data received from API');
          setStandingsData([]);
        }
      } catch (error) {
        console.error('Error fetching standings:', error);
        setStandingsData([]);
      } finally {
        setIsLoadingStandings(false);
      }
    };
    
    fetchStandings();
  }, [leagueId, leagueSeason, teamData.standings]);
  
  // Helper function to create team slug
  const createTeamSlug = (team: any) => {
    if (!team || !team.name || !team.id) return '';
    return `${team.name.toLowerCase().replace(/\s+/g, '-')}-${team.id}`;
  };
  
  // Helper function to create league slug
  const createLeagueSlug = (league: any) => {
    if (!league || !league.name || !league.id) return '';
    return `${league.name.toLowerCase().replace(/\s+/g, '-')}-${league.id}`;
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Tab navigation */}
      <div className="mb-8 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Oversikt
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`${
              activeTab === 'matches'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Kamper
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`${
              activeTab === 'players'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Spillere
          </button>
          <button
            onClick={() => setActiveTab('transfers')}
            className={`${
              activeTab === 'transfers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Overganger
          </button>
          <button
            onClick={() => setActiveTab('injuries')}
            className={`${
              activeTab === 'injuries'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Utilgjengelige spillere
          </button>
        </nav>
      </div>
      
      {/* Content based on active tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left column - Team info and leagues */}
          <div className="md:col-span-1">
            {/* Team information */}
            <div className="bg-white shadow rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Laginformasjon</h2>
              
              <div className="space-y-3">
                {teamData.team.country && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Land:</span>
                    <span className="font-medium">{teamData.team.country}</span>
                  </div>
                )}
                
                {teamData.team.founded && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Grunnlagt:</span>
                    <span className="font-medium">{teamData.team.founded}</span>
                  </div>
                )}
                
                {teamData.team.venue && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stadion:</span>
                    <span className="font-medium">{teamData.team.venue.name}</span>
                  </div>
                )}
                
                {teamData.team.venue && teamData.team.venue.capacity && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kapasitet:</span>
                    <span className="font-medium">{teamData.team.venue.capacity.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Leagues - with improved UI */}
            {uniqueLeagues.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Turneringer</h2>
                  <span className="text-xs text-gray-500">Klikk for å se tabell</span>
                </div>
                
                <div className="space-y-4">
                  {uniqueLeagues.map((leagueData) => (
                    <div 
                      key={leagueData.league.id} 
                      className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition ${
                        leagueId === leagueData.league.id ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setLeagueId(leagueData.league.id)}
                    >
                      {leagueData.league.logo && (
                        <Image
                          src={leagueData.league.logo}
                          alt={leagueData.league.name}
                          width={32}
                          height={32}
                          className="object-contain"
                        />
                      )}
                      <div className="flex-grow">
                        <div className="font-medium text-gray-900">
                          {leagueData.league.name}
                        </div>
                        <p className="text-sm text-gray-500">
                          {leagueData.league.country} 
                          {leagueData.league.id && (
                            <>
                              <span className="mx-1">|</span>
                              <span 
                                className="text-blue-600 hover:text-blue-800 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `/fotball/liga/${createLeagueSlug(leagueData.league)}`;
                                }}
                              >
                                Se liga
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Standings section */}
            {availableLeagues.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6 mt-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Tabellposisjon</h2>
                  
                  {/* Season selector - only show if seasons are available */}
                  {availableSeasons.length > 0 && (
                    <div className="relative">
                      <select
                        value={leagueSeason}
                        onChange={(e) => setLeagueSeason(parseInt(e.target.value))}
                        className="appearance-none block w-32 pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {availableSeasons.map((season: number) => (
                          <option key={season} value={season}>
                            {formatSeason(season)}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
                
                {isLoadingStandings ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-sm">Laster tabelldata...</p>
                  </div>
                ) : standingsData.length > 0 && standingsData[0].league?.standings ? (
                  <div className="overflow-hidden">
                    <div className="text-sm text-gray-500 mb-2">
                      {selectedLeague?.league?.name || 'Liga'}
                    </div>
                    
                    {/* Improved compact standings table */}
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                            #
                          </th>
                          <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Lag
                          </th>
                          <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                            K
                          </th>
                          <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                            P
                          </th>
                          <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Form
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {standingsData[0].league.standings[0].map((team: any) => {
                          // Get the team's form (last 5 matches)
                          const form = team.form ? team.form.split('') : [];
                          const isCurrentTeam = team.team.id === teamId;
                          
                          return (
                            <tr 
                              key={team.team.id} 
                              className={isCurrentTeam ? 'bg-blue-50 font-medium' : ''}
                            >
                              <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                {team.rank}
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap">
                                <Link 
                                  href={`/lag/${createTeamSlug(team.team)}`}
                                  className={`flex items-center hover:underline ${isCurrentTeam ? 'text-blue-700 font-medium' : ''}`}
                                >
                                  {team.team.logo && (
                                    <div className="flex-shrink-0 h-5 w-5 mr-2">
                                      <Image
                                        src={team.team.logo}
                                        alt={team.team.name}
                                        width={20}
                                        height={20}
                                        className="object-contain"
                                      />
                                    </div>
                                  )}
                                  <div className="text-sm truncate max-w-[90px]">
                                    {team.team.name}
                                  </div>
                                </Link>
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                                {team.all.played}
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                                {team.points}
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap text-center">
                                <div className="flex space-x-1 justify-center">
                                  {form.slice(0, 5).map((result: string, index: number) => {
                                    let bgColor = 'bg-gray-200';
                                    let textColor = 'text-gray-800';
                                    
                                    if (result === 'W') {
                                      bgColor = 'bg-green-500';
                                      textColor = 'text-white';
                                    } else if (result === 'L') {
                                      bgColor = 'bg-red-500';
                                      textColor = 'text-white';
                                    } else if (result === 'D') {
                                      bgColor = 'bg-gray-400';
                                      textColor = 'text-white';
                                    }
                                    
                                    return (
                                      <span 
                                        key={index} 
                                        className={`inline-flex items-center justify-center w-5 h-5 rounded-sm ${bgColor} ${textColor} text-xs font-medium`}
                                      >
                                        {result}
                                      </span>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    
                    <div className="mt-3 text-right">
                      <Link 
                        href={`/fotball/liga/${createLeagueSlug(selectedLeague?.league)}`}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Se full tabell →
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-sm">Ingen tabelldata tilgjengelig</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Middle and right columns - Matches and standings */}
          <div className="md:col-span-2">
            {/* Upcoming Matches */}
            <div className="bg-white shadow rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-6">Kommende kamper</h2>
              
              {upcomingMatches.length > 0 ? (
                <div className="space-y-4">
                  {upcomingMatches.map((match) => (
                    <Link 
                      key={match.fixture.id} 
                      href={`/fotball/kamp/${match.fixture.id}`}
                      className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs sm:text-sm text-gray-500">{formatDate(match.fixture.date)}</span>
                        <span 
                          className="text-xs sm:text-sm font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault(); // Prevent the default link behavior
                            e.stopPropagation(); // Prevent triggering the parent link
                            window.location.href = `/fotball/liga/${createLeagueSlug(match.league)}`;
                          }}
                        >
                          {match.league.name}
                        </span>
                      </div>
                      
                      {/* Desktop view */}
                      <div className="hidden sm:grid sm:grid-cols-7 items-center">
                        {/* Home team - 3 columns */}
                        <div className="col-span-3 flex items-center justify-end">
                          <div 
                            className={`flex items-center cursor-pointer ${match.teams.home.id === teamId ? 'text-blue-800 font-medium' : 'text-gray-900'}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.location.href = `/lag/${createTeamSlug(match.teams.home)}`;
                            }}
                          >
                            <span className="text-right">{match.teams.home.name}</span>
                            {match.teams.home.logo && (
                              <Image
                                src={match.teams.home.logo}
                                alt={match.teams.home.name}
                                width={32}
                                height={32}
                                className="object-contain ml-2"
                              />
                            )}
                          </div>
                        </div>
                        
                        {/* Match time - 1 column */}
                        <div className="col-span-1 text-center mx-2">
                          <div className="bg-gray-100 rounded-lg p-2">
                            <div className="text-sm font-medium text-gray-800">
                              {getNorwegianDayName(match.fixture.date)}
                            </div>
                            <div className="text-lg font-bold">
                              {formatTime(match.fixture.date)}
                            </div>
                          </div>
                        </div>
                        
                        {/* Away team - 3 columns */}
                        <div className="col-span-3 flex items-center">
                          <div 
                            className={`flex items-center cursor-pointer ${match.teams.away.id === teamId ? 'text-blue-800 font-medium' : 'text-gray-900'}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.location.href = `/lag/${createTeamSlug(match.teams.away)}`;
                            }}
                          >
                            {match.teams.away.logo && (
                              <Image
                                src={match.teams.away.logo}
                                alt={match.teams.away.name}
                                width={32}
                                height={32}
                                className="object-contain mr-2"
                              />
                            )}
                            <span>{match.teams.away.name}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Mobile view */}
                      <div className="sm:hidden">
                        <div className="flex justify-center mb-3">
                          <div className="bg-gray-100 rounded-lg px-3 py-2 inline-block">
                            <div className="text-sm font-medium text-gray-800 text-center">
                              {getNorwegianDayName(match.fixture.date)}
                            </div>
                            <div className="text-base font-bold text-center">
                              {formatTime(match.fixture.date)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mb-2">
                          <div 
                            className={`flex items-center cursor-pointer ${match.teams.home.id === teamId ? 'text-blue-800 font-medium' : 'text-gray-900'}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.location.href = `/lag/${createTeamSlug(match.teams.home)}`;
                            }}
                          >
                            {match.teams.home.logo && (
                              <Image
                                src={match.teams.home.logo}
                                alt={match.teams.home.name}
                                width={24}
                                height={24}
                                className="object-contain mr-2"
                              />
                            )}
                            <span className="text-sm">{match.teams.home.name}</span>
                          </div>
                          
                          <div 
                            className={`flex items-center cursor-pointer ${match.teams.away.id === teamId ? 'text-blue-800 font-medium' : 'text-gray-900'}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.location.href = `/lag/${createTeamSlug(match.teams.away)}`;
                            }}
                          >
                            <span className="text-sm">{match.teams.away.name}</span>
                            {match.teams.away.logo && (
                              <Image
                                src={match.teams.away.logo}
                                alt={match.teams.away.name}
                                width={24}
                                height={24}
                                className="object-contain ml-2"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {match.fixture.venue && (
                        <div className="mt-2 text-xs text-center text-gray-500">
                          {match.fixture.venue.name}, {match.fixture.venue.city}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Ingen kommende kamper</p>
                </div>
              )}
            </div>
            
            {/* Recent Matches */}
            <div className="bg-white shadow rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-6">Siste resultater</h2>
              
              {recentMatches.length > 0 ? (
                <div className="space-y-4">
                  {recentMatches.map((match) => (
                    <Link 
                      key={match.fixture.id} 
                      href={`/fotball/kamp/${match.fixture.id}`}
                      className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs sm:text-sm text-gray-500">{formatDate(match.fixture.date)}</span>
                        <span 
                          className="text-xs sm:text-sm font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault(); // Prevent the default link behavior
                            e.stopPropagation(); // Prevent triggering the parent link
                            window.location.href = `/fotball/liga/${createLeagueSlug(match.league)}`;
                          }}
                        >
                          {match.league.name}
                        </span>
                      </div>
                      
                      {/* Desktop view */}
                      <div className="hidden sm:grid sm:grid-cols-7 items-center">
                        {/* Home team - 3 columns */}
                        <div className="col-span-3 flex items-center justify-end">
                          <div 
                            className={`flex items-center cursor-pointer ${match.teams.home.id === teamId ? 'text-blue-800 font-medium' : 'text-gray-900'}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.location.href = `/lag/${createTeamSlug(match.teams.home)}`;
                            }}
                          >
                            <span className="text-right">{match.teams.home.name}</span>
                            {match.teams.home.logo && (
                              <Image
                                src={match.teams.home.logo}
                                alt={match.teams.home.name}
                                width={32}
                                height={32}
                                className="object-contain ml-2"
                              />
                            )}
                          </div>
                        </div>
                        
                        {/* Match score - 1 column */}
                        <div className="col-span-1 text-center mx-2">
                          <div className="bg-gray-100 rounded-lg p-2">
                            <div className="text-lg font-bold">
                              {match.goals.home} - {match.goals.away}
                            </div>
                            <div className="text-xs text-gray-500">
                              Fullført
                            </div>
                          </div>
                        </div>
                        
                        {/* Away team - 3 columns */}
                        <div className="col-span-3 flex items-center">
                          <div 
                            className={`flex items-center cursor-pointer ${match.teams.away.id === teamId ? 'text-blue-800 font-medium' : 'text-gray-900'}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.location.href = `/lag/${createTeamSlug(match.teams.away)}`;
                            }}
                          >
                            {match.teams.away.logo && (
                              <Image
                                src={match.teams.away.logo}
                                alt={match.teams.away.name}
                                width={32}
                                height={32}
                                className="object-contain mr-2"
                              />
                            )}
                            <span>{match.teams.away.name}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Mobile view */}
                      <div className="sm:hidden">
                        <div className="flex justify-center mb-3">
                          <div className="bg-gray-100 rounded-lg px-4 py-2 inline-block">
                            <div className="text-base font-bold text-center">
                              {match.goals.home} - {match.goals.away}
                            </div>
                            <div className="text-xs text-gray-500 text-center">
                              Fullført
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div 
                            className={`flex items-center cursor-pointer ${match.teams.home.id === teamId ? 'text-blue-800 font-medium' : 'text-gray-900'}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.location.href = `/lag/${createTeamSlug(match.teams.home)}`;
                            }}
                          >
                            {match.teams.home.logo && (
                              <Image
                                src={match.teams.home.logo}
                                alt={match.teams.home.name}
                                width={24}
                                height={24}
                                className="object-contain mr-2"
                              />
                            )}
                            <span className="text-sm">{match.teams.home.name}</span>
                          </div>
                          
                          <div 
                            className={`flex items-center cursor-pointer ${match.teams.away.id === teamId ? 'text-blue-800 font-medium' : 'text-gray-900'}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.location.href = `/lag/${createTeamSlug(match.teams.away)}`;
                            }}
                          >
                            <span className="text-sm">{match.teams.away.name}</span>
                            {match.teams.away.logo && (
                              <Image
                                src={match.teams.away.logo}
                                alt={match.teams.away.name}
                                width={24}
                                height={24}
                                className="object-contain ml-2"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Ingen nylige resultater</p>
                </div>
              )}
            </div>
            
            {/* Add the ClientStandings component here */}
            <ClientStandings teamId={teamId} />
          </div>
        </div>
      )}
      
      {/* Add this new section for the Matches tab content */}
      {activeTab === 'matches' && (
        <div className="bg-white shadow rounded-lg p-6">
          {/* Matches tab navigation */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setMatchesTab('upcoming')}
              className={`${
                matchesTab === 'upcoming'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } flex-1 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm text-center`}
            >
              Kommende kamper
            </button>
            <button
              onClick={() => setMatchesTab('recent')}
              className={`${
                matchesTab === 'recent'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } flex-1 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm text-center`}
            >
              Siste resultater
            </button>
          </div>
          
          {/* Display either upcoming matches or recent matches based on the selected tab */}
          {matchesTab === 'upcoming' ? (
            <div className="space-y-4">
              {upcomingMatches.length > 0 ? (
                upcomingMatches.map((match) => (
                  <div key={match.fixture.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs sm:text-sm text-gray-500">{formatDate(match.fixture.date)}</span>
                      <Link 
                        href={`/fotball/liga/${createLeagueSlug(match.league)}`}
                        className="text-xs sm:text-sm font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition"
                      >
                        {match.league.name}
                      </Link>
                    </div>
                    
                    {/* Desktop view */}
                    <div className="hidden sm:grid sm:grid-cols-7 items-center">
                      {/* Home team - 3 columns */}
                      <div className="col-span-3 flex items-center justify-end">
                        <Link 
                          href={`/lag/${createTeamSlug(match.teams.home)}`}
                          className={`flex items-center hover:underline ${match.teams.home.id === teamId ? 'text-blue-800 font-medium' : 'text-gray-900'}`}
                        >
                          <span className="text-right">{match.teams.home.name}</span>
                          {match.teams.home.logo && (
                            <Image
                              src={match.teams.home.logo}
                              alt={match.teams.home.name}
                              width={32}
                              height={32}
                              className="object-contain ml-2"
                            />
                          )}
                        </Link>
                      </div>
                      
                      {/* Match time - 1 column */}
                      <div className="col-span-1 text-center mx-2">
                        <div className="bg-gray-100 rounded-lg p-2">
                          <div className="text-sm font-medium text-gray-800">
                            {getNorwegianDayName(match.fixture.date)}
                          </div>
                          <div className="text-lg font-bold">
                            {formatTime(match.fixture.date)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Away team - 3 columns */}
                      <div className="col-span-3 flex items-center">
                        <Link 
                          href={`/lag/${createTeamSlug(match.teams.away)}`}
                          className={`flex items-center hover:underline ${match.teams.away.id === teamId ? 'text-blue-800 font-medium' : 'text-gray-900'}`}
                        >
                          {match.teams.away.logo && (
                            <Image
                              src={match.teams.away.logo}
                              alt={match.teams.away.name}
                              width={32}
                              height={32}
                              className="object-contain mr-2"
                            />
                          )}
                          <span>{match.teams.away.name}</span>
                        </Link>
                      </div>
                    </div>
                    
                    {/* Mobile view */}
                    <div className="sm:hidden">
                      <div className="flex justify-center mb-3">
                        <div className="bg-gray-100 rounded-lg px-3 py-2 inline-block">
                          <div className="text-sm font-medium text-gray-800 text-center">
                            {getNorwegianDayName(match.fixture.date)}
                          </div>
                          <div className="text-base font-bold text-center">
                            {formatTime(match.fixture.date)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mb-2">
                        <Link 
                          href={`/lag/${createTeamSlug(match.teams.home)}`}
                          className={`flex items-center hover:underline ${match.teams.home.id === teamId ? 'text-blue-800 font-medium' : 'text-gray-900'}`}
                        >
                          {match.teams.home.logo && (
                            <Image
                              src={match.teams.home.logo}
                              alt={match.teams.home.name}
                              width={24}
                              height={24}
                              className="object-contain mr-2"
                            />
                          )}
                          <span className="text-sm">{match.teams.home.name}</span>
                        </Link>
                        
                        <Link 
                          href={`/lag/${createTeamSlug(match.teams.away)}`}
                          className={`flex items-center hover:underline ${match.teams.away.id === teamId ? 'text-blue-800 font-medium' : 'text-gray-900'}`}
                        >
                          <span className="text-sm">{match.teams.away.name}</span>
                          {match.teams.away.logo && (
                            <Image
                              src={match.teams.away.logo}
                              alt={match.teams.away.name}
                              width={24}
                              height={24}
                              className="object-contain ml-2"
                            />
                          )}
                        </Link>
                      </div>
                    </div>
                    
                    {match.fixture.venue && (
                      <div className="mt-2 text-xs text-center text-gray-500">
                        {match.fixture.venue.name}, {match.fixture.venue.city}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Ingen kommende kamper</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {recentMatches.length > 0 ? (
                recentMatches.map((match) => (
                  <div key={match.fixture.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs sm:text-sm text-gray-500">{formatDate(match.fixture.date)}</span>
                      <Link 
                        href={`/fotball/liga/${createLeagueSlug(match.league)}`}
                        className="text-xs sm:text-sm font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition"
                      >
                        {match.league.name}
                      </Link>
                    </div>
                    
                    {/* Desktop view */}
                    <div className="hidden sm:grid sm:grid-cols-7 items-center">
                      {/* Home team - 3 columns */}
                      <div className="col-span-3 flex items-center justify-end">
                        <Link 
                          href={`/lag/${createTeamSlug(match.teams.home)}`}
                          className={`flex items-center hover:underline ${match.teams.home.id === teamId ? 'text-blue-800 font-medium' : 'text-gray-900'}`}
                        >
                          <span className="text-right">{match.teams.home.name}</span>
                          {match.teams.home.logo && (
                            <Image
                              src={match.teams.home.logo}
                              alt={match.teams.home.name}
                              width={32}
                              height={32}
                              className="object-contain ml-2"
                            />
                          )}
                        </Link>
                      </div>
                      
                      {/* Match score - 1 column */}
                      <div className="col-span-1 text-center mx-2">
                        <div className="bg-gray-100 rounded-lg p-2">
                          <div className="text-lg font-bold">
                            {match.goals.home} - {match.goals.away}
                          </div>
                          <div className="text-xs text-gray-500">
                            Fullført
                          </div>
                        </div>
                      </div>
                      
                      {/* Away team - 3 columns */}
                      <div className="col-span-3 flex items-center">
                        <Link 
                          href={`/lag/${createTeamSlug(match.teams.away)}`}
                          className={`flex items-center hover:underline ${match.teams.away.id === teamId ? 'text-blue-800 font-medium' : 'text-gray-900'}`}
                        >
                          {match.teams.away.logo && (
                            <Image
                              src={match.teams.away.logo}
                              alt={match.teams.away.name}
                              width={32}
                              height={32}
                              className="object-contain mr-2"
                            />
                          )}
                          <span>{match.teams.away.name}</span>
                        </Link>
                      </div>
                    </div>
                    
                    {/* Mobile view */}
                    <div className="sm:hidden">
                      <div className="flex justify-center mb-3">
                        <div className="bg-gray-100 rounded-lg px-4 py-2 inline-block">
                          <div className="text-base font-bold text-center">
                            {match.goals.home} - {match.goals.away}
                          </div>
                          <div className="text-xs text-gray-500 text-center">
                            Fullført
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Link 
                          href={`/lag/${createTeamSlug(match.teams.home)}`}
                          className={`flex items-center hover:underline ${match.teams.home.id === teamId ? 'text-blue-800 font-medium' : 'text-gray-900'}`}
                        >
                          {match.teams.home.logo && (
                            <Image
                              src={match.teams.home.logo}
                              alt={match.teams.home.name}
                              width={24}
                              height={24}
                              className="object-contain mr-2"
                            />
                          )}
                          <span className="text-sm">{match.teams.home.name}</span>
                        </Link>
                        
                        <Link 
                          href={`/lag/${createTeamSlug(match.teams.away)}`}
                          className={`flex items-center hover:underline ${match.teams.away.id === teamId ? 'text-blue-800 font-medium' : 'text-gray-900'}`}
                        >
                          <span className="text-sm">{match.teams.away.name}</span>
                          {match.teams.away.logo && (
                            <Image
                              src={match.teams.away.logo}
                              alt={match.teams.away.name}
                              width={24}
                              height={24}
                              className="object-contain ml-2"
                            />
                          )}
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Ingen nylige resultater</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Players tab content */}
      {activeTab === 'players' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-6">Spillerstall</h2>
          
          {players.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {players.map((player) => (
                <Link 
                  key={player.id} 
                  href={`/spillerprofil/${createPlayerSlug(player.name, player.id)}`}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center space-x-4">
                    {player.photo && (
                      <div className="flex-shrink-0">
                        <Image
                          src={player.photo}
                          alt={player.name}
                          width={64}
                          height={64}
                          className="rounded-full object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium text-gray-900">{player.name}</h3>
                      <p className="text-sm text-gray-500">
                        {player.position || 'Spiller'}
                      </p>
                      {player.number && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                          #{player.number}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {(player.age || player.nationality) && (
                    <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-500">
                      {player.age && <div>Alder: {player.age}</div>}
                      {player.nationality && <div>Nasjonalitet: {player.nationality}</div>}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Ingen spillerdata tilgjengelig</p>
            </div>
          )}
        </div>
      )}
      
      {/* Add the new transfers tab content */}
      {activeTab === 'transfers' && (
        <TeamTransfers teamId={teamId} transfers={teamData.transfers} />
      )}
      
      {activeTab === 'injuries' && (
        <TeamInjuries teamId={teamId} injuries={teamData.injuries} />
      )}
    </div>
  );
} 