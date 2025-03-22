"use client"

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getPopularLeagues, getUpcomingFixtures, getAvailableCountries, getLeaguesByCountry, getLiveMatches, getLeagueLogoUrl, League, Fixture, getLeagueUpcomingFixtures } from '../services/sportApi';
import React from 'react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

// TEMPORARY API DISABLE FLAG - set to true to disable API calls
const DISABLE_API_CALLS = true;

// Define types
interface League {
  id: number;
  name: string;
  country: string;
  logo: string;
}

interface Team {
  id: number;
  name: string;
  logo: string;
}

interface Fixture {
  id: number;
  date: string;
  status: {
    short: string;
    long: string;
    elapsed: number | null;
  };
  league: League;
  teams: {
    home: Team;
    away: Team;
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

// Helper functions
function createTeamSlug(teamName: string): string {
  return teamName.toLowerCase().replace(/\s+/g, '-');
}

function createLeagueSlug(leagueName: string): string {
  return leagueName.toLowerCase().replace(/\s+/g, '-');
}

export default function SportPage() {
  const params = useParams();
  const sport = typeof params.sport === 'string' ? params.sport : '';
  
  // Capitalize first letter of sport name
  const formattedSport = sport.charAt(0).toUpperCase() + sport.slice(1);
  
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [upcomingFixtures, setUpcomingFixtures] = useState<Record<number, Fixture[]>>({});
  const [activeLeagueId, setActiveLeagueId] = useState<number | null>(null);
  const [todaysMatches, setTodaysMatches] = useState<Fixture[]>([]);
  const [liveMatches, setLiveMatches] = useState<Fixture[]>([]);
  
  // League names and their corresponding IDs - only used for football
  const topLeagues = [
    { id: 39, name: 'Premier League', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    { id: 140, name: 'La Liga', country: 'Spain', flag: '🇪🇸' },
    { id: 61, name: 'Ligue 1', country: 'France', flag: '🇫🇷' },
    { id: 78, name: 'Bundesliga', country: 'Germany', flag: '🇩🇪' },
    { id: 135, name: 'Serie A', country: 'Italy', flag: '🇮🇹' },
    { id: 2, name: 'Champions League', country: 'Europe', flag: '🇪🇺' },
  ];
  
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Skip API calls if disabled
        if (DISABLE_API_CALLS) {
          console.log(`[API DISABLED] SportPage would have fetched data for sport: ${sport}`);
          
          // Set mock data
          setCountries([
            "England", "Spain", "Germany", "Italy", "France", "Europe", "Norway", "Sweden", "Denmark"
          ]);
          
          setLeagues([
            { id: 39, name: "Premier League", country: "England", logo: "https://media.api-sports.io/football/leagues/39.png" },
            { id: 140, name: "La Liga", country: "Spain", logo: "https://media.api-sports.io/football/leagues/140.png" },
            { id: 78, name: "Bundesliga", country: "Germany", logo: "https://media.api-sports.io/football/leagues/78.png" },
            { id: 135, name: "Serie A", country: "Italy", logo: "https://media.api-sports.io/football/leagues/135.png" },
            { id: 61, name: "Ligue 1", country: "France", logo: "https://media.api-sports.io/football/leagues/61.png" },
            { id: 2, name: "Champions League", country: "Europe", logo: "https://media.api-sports.io/football/leagues/2.png" }
          ]);
          
          // Mock today's matches
          setTodaysMatches([
            {
              id: 1001,
              date: new Date().toISOString(),
              status: { short: "NS", long: "Not Started", elapsed: null },
              league: { id: 39, name: "Premier League", country: "England", logo: "https://media.api-sports.io/football/leagues/39.png" },
              teams: {
                home: { id: 33, name: "Manchester United", logo: "https://media.api-sports.io/football/teams/33.png" },
                away: { id: 40, name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png" }
              },
              goals: { home: null, away: null }
            },
            {
              id: 1002,
              date: new Date().toISOString(),
              status: { short: "NS", long: "Not Started", elapsed: null },
              league: { id: 39, name: "Premier League", country: "England", logo: "https://media.api-sports.io/football/leagues/39.png" },
              teams: {
                home: { id: 50, name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
                away: { id: 47, name: "Tottenham", logo: "https://media.api-sports.io/football/teams/47.png" }
              },
              goals: { home: null, away: null }
            }
          ]);
          
          // Mock live matches
          setLiveMatches([
            {
              id: 1003,
              date: new Date().toISOString(),
              status: { short: "2H", long: "Second Half", elapsed: 65 },
              league: { id: 140, name: "La Liga", country: "Spain", logo: "https://media.api-sports.io/football/leagues/140.png" },
              teams: {
                home: { id: 529, name: "Barcelona", logo: "https://media.api-sports.io/football/teams/529.png" },
                away: { id: 541, name: "Real Madrid", logo: "https://media.api-sports.io/football/teams/541.png" }
              },
              goals: { home: 1, away: 2 }
            }
          ]);
          
          // Mock upcoming fixtures for each league
          const mockFixturesByLeague: Record<number, Fixture[]> = {};
          
          topLeagues.forEach(league => {
            mockFixturesByLeague[league.id] = Array(3).fill(0).map((_, i) => ({
              id: 2000 + (league.id * 10) + i,
              date: new Date(Date.now() + (i + 1) * 86400000).toISOString(), // Next few days
              status: { short: "NS", long: "Not Started", elapsed: null },
              league: { id: league.id, name: league.name, country: league.country, logo: `https://media.api-sports.io/football/leagues/${league.id}.png` },
              teams: {
                home: { id: 100 + i, name: `Home Team ${i + 1}`, logo: `https://media.api-sports.io/football/teams/${100 + i}.png` },
                away: { id: 200 + i, name: `Away Team ${i + 1}`, logo: `https://media.api-sports.io/football/teams/${200 + i}.png` }
              },
              goals: { home: null, away: null }
            }));
          });
          
          setUpcomingFixtures(mockFixturesByLeague);
          
          // Set the first league as active if none is selected
          if (!activeLeagueId && topLeagues.length > 0) {
            setActiveLeagueId(topLeagues[0].id);
          }
          
          setLoading(false);
          return;
        }
        
        // Only fetch data for football for now
        if (sport.toLowerCase() === 'fotball') {
          // Get all available countries
          const countriesData = await getAvailableCountries();
          setCountries(countriesData);
          
          // Get all leagues (not just popular ones)
          if (selectedCountry) {
            const leaguesData = await getLeaguesByCountry(selectedCountry);
            setLeagues(leaguesData);
          } else {
            // If no country selected, get popular leagues
            const leaguesData = await getPopularLeagues();
            setLeagues(leaguesData);
          }
          
          // Get today's date in YYYY-MM-DD format
          const today = new Date().toISOString().split('T')[0];
          
          // Get today's matches
          const todaysMatchesData = await getUpcomingFixtures(undefined, today);
          setTodaysMatches(todaysMatchesData);
          
          // Get live matches
          const liveMatchesData = await getLiveMatches();
          setLiveMatches(liveMatchesData);
          
          // Get upcoming fixtures for each top league
          const fixturesPromises = topLeagues.map(async (league) => {
            const fixtures = await getLeagueUpcomingFixtures(league.id);
            return { leagueId: league.id, fixtures };
          });
          
          const fixturesResults = await Promise.all(fixturesPromises);
          
          // Create a record of fixtures by league ID
          const fixturesByLeague: Record<number, Fixture[]> = {};
          fixturesResults.forEach(result => {
            fixturesByLeague[result.leagueId] = result.fixtures;
          });
          
          setUpcomingFixtures(fixturesByLeague);
          
          // Set the first league as active if none is selected
          if (!activeLeagueId && topLeagues.length > 0) {
            setActiveLeagueId(topLeagues[0].id);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Det oppstod en feil ved henting av data. Vennligst prøv igjen senere.');
        setLoading(false);
      }
    }
    
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport, selectedCountry, activeLeagueId]);
  
  // Format just the time portion (HH:MM)
  const formatTime = (dateString: string): string => {
    try {
      if (!dateString) return 'TBD';
      
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.log('Invalid date string:', dateString);
        return 'TBD';
      }
      
      return date.toLocaleTimeString('no-NO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'TBD';
    }
  };
  
  // Format date for grouping fixtures
  const formatDate = (dateString: string): string => {
    try {
      if (!dateString) return 'Kommende kamper';
      
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.log('Invalid date string:', dateString);
        return 'Kommende kamper';
      }
      
      // Get today and tomorrow for comparison
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const dateDay = new Date(date);
      dateDay.setHours(0, 0, 0, 0);
      
      // Check if the date is today or tomorrow
      if (dateDay.getTime() === today.getTime()) {
        return 'I dag';
      } else if (dateDay.getTime() === tomorrow.getTime()) {
        return 'I morgen';
      }
      
      // Otherwise return the full date
      return date.toLocaleDateString('no-NO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Kommende kamper';
    }
  };
  
  // Group fixtures by date
  const groupFixturesByDate = (fixtures: Fixture[]): Record<string, Fixture[]> => {
    const grouped: Record<string, Fixture[]> = {};
    
    fixtures.forEach(fixture => {
      try {
        const dateKey = formatDate(fixture.date);
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        
        grouped[dateKey].push(fixture);
      } catch (error) {
        console.error('Error grouping fixture:', error);
        const dateKey = 'Dato ikke fastsatt';
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(fixture);
      }
    });
    
    return grouped;
  };
  
  // Render football content
  const renderFootballContent = () => {
    return (
      <>
        <h1 className="text-3xl font-bold mb-6">Fotball</h1>
        
        {/* Popular Leagues - Updated selection and order */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Populære ligaer</h2>
            <Link 
              href={`/${sport}/liga`}
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <span className="mr-1">Se alle ligaer</span>
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              // Premier League
              {
                id: 39,
                name: "Premier League",
                country: "England",
                flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿"
              },
              // Eliteserien
              {
                id: 103,
                name: "Eliteserien",
                country: "Norge",
                flag: "🇳🇴"
              },
              // Champions League
              {
                id: 2,
                name: "Champions League",
                country: "Europa",
                flag: "🇪🇺"
              },
              // La Liga
              {
                id: 140,
                name: "La Liga",
                country: "Spania",
                flag: "🇪🇸"
              },
              // Serie A
              {
                id: 135,
                name: "Serie A",
                country: "Italia",
                flag: "🇮🇹"
              },
              // Bundesliga
              {
                id: 78,
                name: "Bundesliga",
                country: "Tyskland",
                flag: "🇩🇪"
              }
            ].map(league => (
              <Link 
                key={league.id}
                href={`/${sport}/liga/${createLeagueSlug(league.name)}-${league.id}`}
                className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="w-16 h-16 relative mb-3">
                  <Image 
                    src={getLeagueLogoUrl(league.id)}
                    alt={league.name}
                    fill
                    className="object-contain"
                  />
                </div>
                <h3 className="font-semibold text-center">{league.name}</h3>
                <div className="text-xs text-gray-500 flex items-center mt-1">
                  <span className="mr-1">{league.flag}</span> {league.country}
                </div>
              </Link>
            ))}
          </div>
        </div>
        
        {/* Improved Live and Today's Matches in columns */}
        <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Live Matches Column - Improved design */}
          <div>
            <div className="flex items-center mb-4">
              <h2 className="text-2xl font-bold">Direkte nå</h2>
              <div className="ml-3 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <Link 
                href={`/${sport}/live`}
                className="ml-auto text-blue-600 hover:text-blue-800 flex items-center"
              >
                <span className="mr-1">Se alle direktesendte kamper</span>
                <ChevronRightIcon className="h-4 w-4" />
              </Link>
            </div>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {liveMatches.length > 0 ? (
                <>
                  <div className="divide-y divide-gray-100">
                    {/* Only show the first 5 live matches */}
                    {liveMatches.slice(0, 5).map(fixture => (
                      <div key={fixture.id} className="hover:bg-gray-50 transition-colors">
                        <div className="p-4">
                          {/* League name and logo */}
                          <div className="flex items-center text-xs text-gray-500 mb-2">
                            {fixture.league?.logo && (
                              <Image 
                                src={fixture.league.logo}
                                alt={fixture.league?.name || ''}
                                width={16}
                                height={16}
                                className="mr-1"
                              />
                            )}
                            <span>{fixture.league?.name}</span>
                          </div>
                          
                          {/* Match details */}
                          <div className="flex items-center">
                            {/* Home team */}
                            <div className="flex-1">
                              <div className="flex items-center">
                                {fixture.teams?.home?.logo && (
                                  <Link href={`/lag/${createTeamSlug(fixture.teams.home.name)}-${fixture.teams.home.id}`} className="mr-2">
                                    <Image 
                                      src={fixture.teams.home.logo}
                                      alt={fixture.teams?.home?.name || ''}
                                      width={32}
                                      height={32}
                                      className="object-contain"
                                    />
                                  </Link>
                                )}
                                <Link href={`/lag/${createTeamSlug(fixture.teams.home.name)}-${fixture.teams.home.id}`} className="font-medium hover:text-blue-600 hover:underline">
                                  {fixture.teams?.home?.name}
                                </Link>
                              </div>
                            </div>
                            
                            {/* Score with live indicator */}
                            <div className="px-3 py-1 mx-2 bg-red-50 rounded-md border border-red-100 flex items-center">
                              <span className="font-bold text-gray-800">
                                {fixture.goals?.home !== null ? fixture.goals?.home : '-'} - {fixture.goals?.away !== null ? fixture.goals?.away : '-'}
                              </span>
                              <span className="ml-2 text-xs text-red-600 font-medium px-1.5 py-0.5 bg-red-100 rounded-full">
                                LIVE
                              </span>
                            </div>
                            
                            {/* Away team */}
                            <div className="flex-1 text-right">
                              <div className="flex items-center justify-end">
                                <Link href={`/lag/${createTeamSlug(fixture.teams.away.name)}-${fixture.teams.away.id}`} className="font-medium hover:text-blue-600 hover:underline">
                                  {fixture.teams?.away?.name}
                                </Link>
                                {fixture.teams?.away?.logo && (
                                  <Link href={`/lag/${createTeamSlug(fixture.teams.away.name)}-${fixture.teams.away.id}`} className="ml-2">
                                    <Image 
                                      src={fixture.teams.away.logo}
                                      alt={fixture.teams?.away?.name || ''}
                                      width={32}
                                      height={32}
                                      className="object-contain"
                                    />
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {liveMatches.length > 5 && (
                    <div className="text-center py-3 border-t border-gray-100 bg-gray-50">
                      <button className="text-blue-600 hover:text-blue-800 font-medium">
                        Vis alle {liveMatches.length} direktesendte kamper
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-2">Ingen direktesendte kamper nå.</p>
                </div>
              )}
            </div>
          </div>

          {/* Today's Matches Column - Improved design */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Dagens kamper</h2>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {todaysMatches.length > 0 ? (
                <>
                  <div className="divide-y divide-gray-100">
                    {todaysMatches.slice(0, 5).map(fixture => (
                      <div key={fixture.id} className="hover:bg-gray-50 transition-colors">
                        <div className="p-4">
                          {/* League name and logo */}
                          <div className="flex items-center text-xs text-gray-500 mb-2">
                            {fixture.league?.logo && (
                              <Image 
                                src={fixture.league.logo}
                                alt={fixture.league?.name || ''}
                                width={16}
                                height={16}
                                className="mr-1"
                              />
                            )}
                            <span>{fixture.league?.name}</span>
                          </div>
                          
                          {/* Match time */}
                          <div className="text-xs font-medium text-gray-500 mb-2">
                            {fixture.date ? formatTime(fixture.date) : 'TBD'}
                          </div>
                          
                          {/* Match details */}
                          <div className="flex items-center">
                            {/* Home team */}
                            <div className="flex-1">
                              <div className="flex items-center">
                                {fixture.teams?.home?.logo && (
                                  <Link href={`/lag/${createTeamSlug(fixture.teams.home.name)}-${fixture.teams.home.id}`} className="mr-2">
                                    <Image 
                                      src={fixture.teams.home.logo}
                                      alt={fixture.teams?.home?.name || ''}
                                      width={32}
                                      height={32}
                                      className="object-contain"
                                    />
                                  </Link>
                                )}
                                <Link href={`/lag/${createTeamSlug(fixture.teams.home.name)}-${fixture.teams.home.id}`} className="font-medium hover:text-blue-600 hover:underline">
                                  {fixture.teams?.home?.name}
                                </Link>
                              </div>
                            </div>
                            
                            {/* vs */}
                            <div className="px-3 mx-2 text-sm text-gray-400">
                              vs
                            </div>
                            
                            {/* Away team */}
                            <div className="flex-1 text-right">
                              <div className="flex items-center justify-end">
                                <Link href={`/lag/${createTeamSlug(fixture.teams.away.name)}-${fixture.teams.away.id}`} className="font-medium hover:text-blue-600 hover:underline">
                                  {fixture.teams?.away?.name}
                                </Link>
                                {fixture.teams?.away?.logo && (
                                  <Link href={`/lag/${createTeamSlug(fixture.teams.away.name)}-${fixture.teams.away.id}`} className="ml-2">
                                    <Image 
                                      src={fixture.teams.away.logo}
                                      alt={fixture.teams?.away?.name || ''}
                                      width={32}
                                      height={32}
                                      className="object-contain"
                                    />
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {todaysMatches.length > 5 && (
                    <div className="text-center py-3 border-t border-gray-100 bg-gray-50">
                      <button className="text-blue-600 hover:text-blue-800 font-medium">
                        Vis alle {todaysMatches.length} kamper i dag
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-2">Ingen kamper i dag.</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Upcoming Matches by League - with improved design and increased top margin */}
        <div className="mb-10 mt-24">
          <h2 className="text-2xl font-bold mb-6">Kommende kamper</h2>
          
          {/* League tabs with improved design */}
          <div className="mb-6 flex space-x-1 overflow-x-auto pb-2 hide-scrollbar">
            {[
              // Add Eliteserien to the list of leagues shown in tabs
              ...topLeagues.filter(league => league.id !== 61), // Remove Ligue 1 (ID 61)
              {
                id: 103,
                name: "Eliteserien",
                country: "Norge"
              }
            ].map(league => (
              <button
                key={league.id}
                className={`px-4 py-3 rounded-t-lg flex items-center space-x-2 whitespace-nowrap transition-all ${
                  activeLeagueId === league.id 
                    ? 'bg-white text-blue-700 font-semibold shadow-sm' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => setActiveLeagueId(league.id)}
              >
                <div className="w-6 h-6 relative">
                  <Image 
                    src={getLeagueLogoUrl(league.id)}
                    alt={league.name}
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                </div>
                <span>{league.name}</span>
              </button>
            ))}
          </div>
          
          {activeLeagueId && upcomingFixtures[activeLeagueId] && upcomingFixtures[activeLeagueId].length > 0 ? (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 text-gray-600 text-sm">
                  <tr>
                    <th className="py-3 px-4 text-left font-medium">Dato</th>
                    <th className="py-3 px-4 text-left font-medium">Kamp</th>
                    <th className="py-3 px-4 text-left font-medium hidden md:table-cell">Liga</th>
                    <th className="py-3 px-4 text-right font-medium">Kanal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {/* Group fixtures by date */}
                  {Object.entries(groupFixturesByDate(upcomingFixtures[activeLeagueId])).map(([date, fixtures], groupIndex) => (
                    <React.Fragment key={`date-group-${date}-${groupIndex}`}>
                      {/* Date header row */}
                      <tr className="bg-gray-50">
                        <td colSpan={4} className="py-2 px-4 font-medium text-gray-700">
                          {date}
                        </td>
                      </tr>
                      {/* Fixtures for this date */}
                      {fixtures.map((fixture) => (
                        <tr key={fixture.id} className="hover:bg-gray-50">
                          <td className="py-5 px-4">
                            <div className="text-sm text-gray-600 relative group">
                              {fixture.date ? formatTime(fixture.date) : 'TBD'}
                              {fixture.date ? null : (
                                <div className="absolute left-0 -top-1 transform -translate-y-full invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 w-40 z-10">
                                  Dato annonseres snart
                                  <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-5 px-4">
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center justify-start w-2/5">
                                {fixture.teams?.home?.id && (
                                  <Link href={`/lag/${createTeamSlug(fixture.teams.home.name)}-${fixture.teams.home.id}`} className="flex items-center hover:text-blue-700 transition-colors">
                                    {fixture.teams?.home?.logo && (
                                      <div className="w-8 h-8 relative flex-shrink-0 mr-3">
                                        <Image 
                                          src={fixture.teams.home.logo}
                                          alt={fixture.teams?.home?.name || ''}
                                          width={32}
                                          height={32}
                                          className="object-contain"
                                        />
                                      </div>
                                    )}
                                    <span className="font-medium text-gray-900 truncate hover:underline">{fixture.teams?.home?.name}</span>
                                  </Link>
                                )}
                              </div>
                              
                              <div className="text-gray-500 text-center w-1/5">
                                vs
                              </div>
                              
                              <div className="flex items-center justify-end w-2/5">
                                {fixture.teams?.away?.id && (
                                  <Link href={`/lag/${createTeamSlug(fixture.teams.away.name)}-${fixture.teams.away.id}`} className="flex items-center hover:text-blue-700 transition-colors">
                                    <span className="font-medium text-gray-900 truncate hover:underline">{fixture.teams?.away?.name}</span>
                                    {fixture.teams?.away?.logo && (
                                      <div className="w-8 h-8 relative flex-shrink-0 ml-3">
                                        <Image 
                                          src={fixture.teams.away.logo}
                                          alt={fixture.teams?.away?.name || ''}
                                          width={32}
                                          height={32}
                                          className="object-contain"
                                        />
                                      </div>
                                    )}
                                  </Link>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-5 px-4 hidden md:table-cell">
                            <div className="flex items-center">
                              <div className="w-6 h-6 relative mr-2 flex-shrink-0">
                                <Image 
                                  src={getLeagueLogoUrl(fixture.league.id)}
                                  alt={fixture.league.name}
                                  width={24}
                                  height={24}
                                  className="object-contain"
                                />
                              </div>
                              <span className="text-sm text-gray-600">{fixture.league.name}</span>
                            </div>
                          </td>
                          <td className="py-5 px-4 text-right">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              TV2 Sport
                            </span>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">Ingen kommende kamper</h3>
              <p className="mt-1 text-sm text-gray-500">
                Det er ingen kommende kamper planlagt for denne ligaen for øyeblikket.
              </p>
            </div>
          )}
        </div>
        
        {/* Countries and Leagues Sidebar */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold mb-6">Alle ligaer</h2>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-3">Velg land</h3>
            
            {countries.length > 0 ? (
              <div className="mb-4">
                <select 
                  className="w-full p-2 border border-gray-300 rounded"
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                >
                  <option value="">Alle populære ligaer</option>
                  {countries.map((country, index) => (
                    <option key={index} value={country}>{country}</option>
                  ))}
                </select>
              </div>
            ) : null}
            
            <h3 className="text-lg font-semibold mb-3">
              {selectedCountry ? `${selectedCountry} ligaer` : 'Populære ligaer'}
            </h3>
            
            {leagues.length > 0 ? (
              <ul className="space-y-2 max-h-96 overflow-y-auto">
                {leagues.map((league) => (
                  <li key={league.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                    <Link 
                      href={`/${sport}/liga/${createLeagueSlug(league.name)}-${league.id}`}
                      className="flex items-center space-x-2 w-full"
                    >
                      <div className="w-6 h-6 relative">
                        <Image 
                          src={getLeagueLogoUrl(league.id)}
                          alt={league.name}
                          width={24}
                          height={24}
                          className="object-contain"
                        />
                      </div>
                      <span>{league.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">Ingen ligaer funnet.</p>
            )}
          </div>
        </div>
      </>
    );
  };
  
  // Render generic sport content
  const renderGenericSportContent = () => {
    return (
      <>
        <h1 className="text-3xl font-bold mb-6">{formattedSport}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            {/* Main content area */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">{formattedSport} på TV og streaming</h2>
              <p className="text-gray-700 mb-6">
                Her finner du oversikt over kommende {formattedSport.toLowerCase()}-sendinger på TV og strømmetjenester.
                Se kampoppsett, kanaler og tidspunkter for direktesendinger.
              </p>
              
              <p className="text-gray-500">Informasjon om {formattedSport.toLowerCase()} kommer snart.</p>
            </div>
          </div>
          
          <div className="md:col-span-1">
            {/* Sidebar */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-3">Populære {formattedSport.toLowerCase()}-turneringer</h3>
              <p className="text-gray-500">Informasjon om {formattedSport.toLowerCase()}-turneringer kommer snart.</p>
            </div>
          </div>
        </div>
      </>
    );
  };
  
  return (
    <>
      {/* Breadcrumb navigation - Now outside the main content */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex py-3" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-1">
              <li>
                <Link href="/" className="text-sm text-gray-500 hover:text-blue-600">
                  Hjem
                </Link>
              </li>
              <li className="text-gray-400 px-1">
                <span>•</span>
              </li>
              <li>
                <span className="text-sm text-gray-700">
                  Fotball
                </span>
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Main content area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : (
          sport.toLowerCase() === 'fotball' ? renderFootballContent() : renderGenericSportContent()
        )}
      </div>
    </>
  );
} 