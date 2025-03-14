"use client"

import { useState, useEffect } from 'react';
import Image from 'next/image';
import TeamStatisticsTable from './TeamStatisticsTable';
import { getTeamMatches, getTeamTopPlayers, getHeadToHead } from '@/app/services/sportApi';

interface UpcomingMatchDetailsProps {
  match: any;
}

// Add this loader function at the top of your file
const imageLoader = ({ src }: { src: string }) => {
  return src;
};

// First, define a proper interface for the head-to-head match data
interface HeadToHeadMatch {
  fixture: {
    date: string;
    venue: {
      name: string;
    };
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
    away: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
  };
  goals: {
    home: number;
    away: number;
  };
  league?: {
    name: string;
  };
}

export default function UpcomingMatchDetails({ match }: UpcomingMatchDetailsProps) {
  const [headToHead, setHeadToHead] = useState<HeadToHeadMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('preview');
  const [countdown, setCountdown] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [homeTeamMatches, setHomeTeamMatches] = useState<any[]>([]);
  const [awayTeamMatches, setAwayTeamMatches] = useState<any[]>([]);
  const [homeTeamPlayers, setHomeTeamPlayers] = useState<any[]>([]);
  const [awayTeamPlayers, setAwayTeamPlayers] = useState<any[]>([]);
  
  const homeTeamId = match.teams.home.id;
  const awayTeamId = match.teams.away.id;
  
  useEffect(() => {
    const fetchHeadToHead = async () => {
      if (homeTeamId && awayTeamId) {
        const h2hData = await getHeadToHead(homeTeamId, awayTeamId);
        setHeadToHead(h2hData);
        setLoading(false);
      }
    };

    fetchHeadToHead();
  }, [homeTeamId, awayTeamId]);
  
  // Calculate and update countdown
  useEffect(() => {
    const matchDate = new Date(match.fixture.date);
    
    const updateCountdown = () => {
      const now = new Date();
      const difference = matchDate.getTime() - now.getTime();
      
      if (difference <= 0) {
        // Match has started
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      
      setCountdown({ days, hours, minutes, seconds });
    };
    
    // Update immediately
    updateCountdown();
    
    // Then update every second
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [match.fixture.date]);
  
  const matchDate = new Date(match.fixture.date);
  // Use native JavaScript date formatting
  const formattedDate = formatDate(matchDate);
  
  // Determine if we should show hours/minutes countdown (less than 24 hours)
  const showDetailedCountdown = countdown.days < 1;
  
  useEffect(() => {
    const fetchTeamForms = async () => {
      if (activeTab !== 'form') return;
      
      try {
        const [homeMatches, awayMatches] = await Promise.all([
          getTeamMatches(homeTeamId, 'FT', 5),
          getTeamMatches(awayTeamId, 'FT', 5)
        ]);
        
        console.log('Home Team (', match.teams.home.name, ') Last 5 Matches:');
        homeMatches.forEach(match => {
          console.log(
            `${formatSimpleDate(new Date(match.fixture.date))} - `,
            `${match.teams.home.name} vs ${match.teams.away.name}:`,
            `${match.goals.home}-${match.goals.away}`,
            `(${match.teams.home.id === homeTeamId ? 'Home' : 'Away'} game)`
          );
        });

        console.log('\nAway Team (', match.teams.away.name, ') Last 5 Matches:');
        awayMatches.forEach(match => {
          console.log(
            `${formatSimpleDate(new Date(match.fixture.date))} - `,
            `${match.teams.home.name} vs ${match.teams.away.name}:`,
            `${match.goals.home}-${match.goals.away}`,
            `(${match.teams.home.id === homeTeamId ? 'Home' : 'Away'} game)`
          );
        });
        
        setHomeTeamMatches(homeMatches);
        setAwayTeamMatches(awayMatches);
      } catch (error) {
        console.error('Error fetching team forms:', error);
      }
    };
    
    fetchTeamForms();
  }, [homeTeamId, awayTeamId, activeTab, match.teams.home.name, match.teams.away.name]);
  
  useEffect(() => {
    const fetchPlayers = async () => {
      if (activeTab !== 'preview') return;
      
      try {
        const [homePlayers, awayPlayers] = await Promise.all([
          getTeamTopPlayers(match.teams.home.id, match.league.season),
          getTeamTopPlayers(match.teams.away.id, match.league.season)
        ]);
        
        setHomeTeamPlayers(homePlayers);
        setAwayTeamPlayers(awayPlayers);
      } catch (error) {
        console.error('Error fetching players:', error);
      }
    };
    
    fetchPlayers();
  }, [match.teams.home.id, match.teams.away.id, match.league.season, activeTab]);
  
  // Helper function to determine match result
  function getMatchResult(match: any, teamId: number): 'W' | 'D' | 'L' {
    if (match.goals.home === match.goals.away) return 'D';
    
    const isHomeTeam = match.teams.home.id === teamId;
    const teamWon = isHomeTeam ? 
      match.goals.home > match.goals.away : 
      match.goals.away > match.goals.home;
    
    return teamWon ? 'W' : 'L';
  }
  
  return (
    <>
      <div className="bg-white rounded-lg p-0">
        <h2 className="text-xl font-bold mb-4">Kampforhåndsvisning</h2>
        
        {/* Improved countdown display */}
        <div className="flex items-start mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg overflow-hidden shadow-lg">
            <div className="px-4 py-2 bg-blue-900 bg-opacity-30">
              <h3 className="text-sm font-medium">Kampen starter om</h3>
            </div>
            
            {showDetailedCountdown ? (
              <div className="p-4 flex items-center justify-center space-x-3">
                <div className="text-center">
                  <div className="text-2xl font-bold">{countdown.hours.toString().padStart(2, '0')}</div>
                  <div className="text-xs uppercase">Timer</div>
                </div>
                <div className="text-2xl font-bold">:</div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{countdown.minutes.toString().padStart(2, '0')}</div>
                  <div className="text-xs uppercase">Minutter</div>
                </div>
                <div className="text-2xl font-bold">:</div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{countdown.seconds.toString().padStart(2, '0')}</div>
                  <div className="text-xs uppercase">Sekunder</div>
                </div>
              </div>
            ) : (
              <div className="p-4 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold">{countdown.days}</div>
                  <div className="text-sm">{countdown.days === 1 ? 'dag' : 'dager'}</div>
                </div>
              </div>
            )}
          </div>
          
          {/* Match date and time */}
          <div className="ml-4 text-gray-600">
            <div className="text-sm">Avspark:</div>
            <div className="font-medium">{formattedDate}</div>
          </div>
        </div>
        
        {/* Tabs navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('preview')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'preview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Forhåndsvisning
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stats'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Statistikk
            </button>
            <button
              onClick={() => setActiveTab('form')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'form'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Lagenes form
            </button>
          </nav>
        </div>
        
        {/* Preview tab content */}
        {activeTab === 'preview' && (
          <div className="prose max-w-none">
            <p className="text-lg">
              {match.teams.home.name} møter {match.teams.away.name} i {match.league.round} av {match.league.name}. 
              Kampen spilles på {match.fixture.venue.name || 'hjemmebane'} {formattedDate}.
            </p>
            
            {loading ? (
              <div className="flex justify-center my-6">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold mt-6">Tidligere møter</h3>
                {headToHead && headToHead.length > 0 ? (
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    {/* Head to head summary stats */}
                    <div className="grid grid-cols-3 gap-4 text-center mb-6">
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <div className="text-sm text-gray-600 mb-1">Seire {match.teams.home.name}</div>
                        <div className="text-3xl font-bold text-blue-600">
                          {headToHead.filter((h2h: HeadToHeadMatch) => 
                            (h2h.teams.home.id === homeTeamId && h2h.teams.home.winner) || 
                            (h2h.teams.away.id === homeTeamId && h2h.teams.away.winner)
                          ).length}
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <div className="text-sm text-gray-600 mb-1">Uavgjort</div>
                        <div className="text-3xl font-bold text-gray-600">
                          {headToHead.filter((h2h: HeadToHeadMatch) => 
                            h2h.teams.home.winner === null && h2h.teams.away.winner === null
                          ).length}
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <div className="text-sm text-gray-600 mb-1">Seire {match.teams.away.name}</div>
                        <div className="text-3xl font-bold text-red-600">
                          {headToHead.filter((h2h: HeadToHeadMatch) => 
                            (h2h.teams.home.id === awayTeamId && h2h.teams.home.winner) || 
                            (h2h.teams.away.id === awayTeamId && h2h.teams.away.winner)
                          ).length}
                        </div>
                      </div>
                    </div>

                    {/* Last 5 matches detail */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-700 mb-3">Siste kamper</h4>
                      {headToHead.slice(0, 5).map((h2h: HeadToHeadMatch, index: number) => {
                        const date = new Date(h2h.fixture.date);
                        const isHomeWinner = h2h.teams.home.winner;
                        const isAwayWinner = h2h.teams.away.winner;
                        
                        return (
                          <div key={index} className="bg-white rounded-lg p-4 shadow-sm">
                            <div className="text-xs text-gray-500 mb-2">
                              {formatSimpleDate(date)}
                            </div>
                            <div className="flex items-center justify-between">
                              {/* Home Team */}
                              <div className={`flex items-center space-x-2 ${isHomeWinner ? 'font-bold' : ''}`}>
                                <div className="w-6 h-6 relative">
                                  <Image
                                    loader={imageLoader}
                                    src={h2h.teams.home.logo}
                                    alt={h2h.teams.home.name}
                                    width={24}
                                    height={24}
                                    className="object-contain"
                                    unoptimized
                                  />
                                </div>
                                <span className="text-sm">{h2h.teams.home.name}</span>
                              </div>

                              {/* Score */}
                              <div className="flex items-center space-x-3">
                                <div className="bg-gray-100 rounded-lg px-3 py-1">
                                  <span className="text-lg font-semibold">
                                    {h2h.goals.home} - {h2h.goals.away}
                                  </span>
                                </div>
                              </div>

                              {/* Away Team */}
                              <div className={`flex items-center space-x-2 ${isAwayWinner ? 'font-bold' : ''}`}>
                                <span className="text-sm">{h2h.teams.away.name}</span>
                                <div className="w-6 h-6 relative">
                                  <Image
                                    loader={imageLoader}
                                    src={h2h.teams.away.logo}
                                    alt={h2h.teams.away.name}
                                    width={24}
                                    height={24}
                                    className="object-contain"
                                    unoptimized
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Additional match info */}
                            <div className="mt-2 flex items-center justify-center text-xs text-gray-500">
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" 
                                  />
                                </svg>
                                <span>{h2h.fixture.venue.name}</span>
                              </div>
                              {h2h.league && (
                                <div className="ml-4 flex items-center space-x-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                                    />
                                  </svg>
                                  <span>{h2h.league.name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-6 rounded-lg mb-6 text-center">
                    <div className="text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01" 
                        />
                      </svg>
                      <p className="text-lg font-medium">Ingen tidligere møter mellom disse lagene</p>
                      <p className="mt-1 text-sm">Dette blir første gang disse lagene møtes!</p>
                    </div>
                  </div>
                )}
                
                <h3 className="text-lg font-semibold mt-6 mb-5">Nøkkelspillere å følge med på</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-4 flex items-center">
                      <div className="w-6 h-6 relative mr-2">
                        <Image
                          loader={imageLoader}
                          src={match.teams.home.logo}
                          alt={match.teams.home.name}
                          width={24}
                          height={24}
                          className="w-full h-full object-contain"
                          unoptimized
                        />
                      </div>
                      {match.teams.home.name}
                    </h4>
                    <div className="space-y-4">
                      {homeTeamPlayers.map((player, index) => (
                        <div key={index} className="flex items-center space-x-4 bg-white p-3 rounded-lg shadow-sm">
                          <div className="relative w-16 h-16 flex-shrink-0">
                            <Image
                              loader={imageLoader}
                              src={player.photo}
                              alt={player.name}
                              width={64}
                              height={64}
                              className="rounded-full object-cover border-2 border-blue-100"
                              onError={(e: any) => {
                                e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png';
                              }}
                              unoptimized
                            />
                          </div>
                          <div className="flex-grow">
                            <div className="font-medium text-gray-900">{player.name}</div>
                            <div className="text-sm text-gray-500 mb-1">{player.position}</div>
                            <div className="flex items-center space-x-3 text-xs">
                              {player.goals > 0 && (
                                <div className="flex items-center text-green-600">
                                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                                  </svg>
                                  <span>{player.goals} mål</span>
                                </div>
                              )}
                              {player.assists > 0 && (
                                <div className="flex items-center text-blue-600">
                                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                  </svg>
                                  <span>{player.assists} assists</span>
                                </div>
                              )}
                              <div className="flex items-center text-gray-500">
                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                                <span>{player.appearances} kamper</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-4 flex items-center">
                      <div className="w-6 h-6 relative mr-2">
                        <Image
                          loader={imageLoader}
                          src={match.teams.away.logo}
                          alt={match.teams.away.name}
                          width={24}
                          height={24}
                          className="w-full h-full object-contain"
                          unoptimized
                        />
                      </div>
                      {match.teams.away.name}
                    </h4>
                    <div className="space-y-4">
                      {awayTeamPlayers.map((player, index) => (
                        <div key={index} className="flex items-center space-x-4 bg-white p-3 rounded-lg shadow-sm">
                          <div className="relative w-16 h-16 flex-shrink-0">
                            <Image
                              loader={imageLoader}
                              src={player.photo}
                              alt={player.name}
                              width={64}
                              height={64}
                              className="rounded-full object-cover border-2 border-blue-100"
                              onError={(e: any) => {
                                e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png';
                              }}
                              unoptimized
                            />
                          </div>
                          <div className="flex-grow">
                            <div className="font-medium text-gray-900">{player.name}</div>
                            <div className="text-sm text-gray-500 mb-1">{player.position}</div>
                            <div className="flex items-center space-x-3 text-xs">
                              {player.goals > 0 && (
                                <div className="flex items-center text-green-600">
                                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                                  </svg>
                                  <span>{player.goals} mål</span>
                                </div>
                              )}
                              {player.assists > 0 && (
                                <div className="flex items-center text-blue-600">
                                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                  </svg>
                                  <span>{player.assists} assists</span>
                                </div>

                              )}
                              <div className="flex items-center text-gray-500">
                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                                <span>{player.appearances} kamper</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Statistics tab content */}
        {activeTab === 'stats' && (
          <div>
            <TeamStatisticsTable 
              homeTeamId={homeTeamId}
              awayTeamId={awayTeamId}
              leagueId={match.league.id}
              season={match.league.season}
            />
          </div>
        )}
        
        {/* Team form tab content */}
        {activeTab === 'form' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Home team form */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3 flex items-center">
                  <div className="w-6 h-6 relative mr-2">
                    <Image
                      loader={imageLoader}
                      src={match.teams.home.logo}
                      alt={match.teams.home.name}
                      width={24}
                      height={24}
                      className="w-full h-full object-contain"
                      unoptimized
                    />
                  </div>
                  {match.teams.home.name}
                </h4>
                
                {/* Form indicators - Made smaller by reducing w-8 h-8 to w-6 h-6 and text-xs */}
                <div className="flex space-x-1 mb-4">
                  {homeTeamMatches.map((match, index) => {
                    const result = getMatchResult(match, homeTeamId);
                    return (
                      <div 
                        key={index} 
                        className={`w-6 h-6 flex items-center justify-center rounded-full text-white font-bold text-xs ${
                          result === 'W' ? 'bg-green-500' : 
                          result === 'D' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                      >
                        {result === 'W' ? 'S' : result === 'D' ? 'U' : 'T'}
                      </div>
                    );
                  })}
                </div>
                
                {/* Last 5 matches table */}
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dato</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motstander</th>
                        <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Resultat</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {homeTeamMatches.map((match, index) => {
                        const result = getMatchResult(match, homeTeamId);
                        
                        // Get the opponent team name
                        const opponentName = match.teams.home.id === homeTeamId 
                          ? match.teams.away.name   // If we're home team, show away team
                          : match.teams.home.name;  // If we're away team, show home team
                        
                        // Determine if it was a home game for our team
                        const wasHomeGame = match.teams.home.id === homeTeamId;
                        
                        return (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                              {formatSimpleDate(new Date(match.fixture.date))}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className="text-xs font-medium text-gray-900">
                                  {opponentName}
                                </span>
                                <span className="ml-1 text-xs text-gray-500">
                                  {wasHomeGame ? '(H)' : '(B)'}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                result === 'W' ? 'bg-green-100 text-green-800' : 
                                result === 'D' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-red-100 text-red-800'
                              }`}>
                                {match.goals.home}-{match.goals.away}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Away team form */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3 flex items-center">
                  <div className="w-6 h-6 relative mr-2">
                    <Image
                      loader={imageLoader}
                      src={match.teams.away.logo}
                      alt={match.teams.away.name}
                      width={24}
                      height={24}
                      className="w-full h-full object-contain"
                      unoptimized
                    />
                  </div>
                  {match.teams.away.name}
                </h4>
                
                {/* Form indicators - Made smaller by reducing w-8 h-8 to w-6 h-6 and text-xs */}
                <div className="flex space-x-1 mb-4">
                  {awayTeamMatches.map((match, index) => {
                    const result = getMatchResult(match, awayTeamId);
                    return (
                      <div 
                        key={index} 
                        className={`w-6 h-6 flex items-center justify-center rounded-full text-white font-bold text-xs ${
                          result === 'W' ? 'bg-green-500' : 
                          result === 'D' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                      >
                        {result === 'W' ? 'S' : result === 'D' ? 'U' : 'T'}
                      </div>
                    );
                  })}
                </div>
                
                {/* Last 5 matches table */}
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dato</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motstander</th>
                        <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Resultat</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {awayTeamMatches.map((match, index) => {
                        const result = getMatchResult(match, awayTeamId);
                        
                        // Get the opponent team name
                        const opponentName = match.teams.home.id === awayTeamId 
                          ? match.teams.away.name   // If we're home team, show away team
                          : match.teams.home.name;  // If we're away team, show home team
                        
                        // Determine if it was a home game for our team
                        const wasHomeGame = match.teams.home.id === awayTeamId;
                        
                        return (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                              {formatSimpleDate(new Date(match.fixture.date))}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className="text-xs font-medium text-gray-900">
                                  {opponentName}
                                </span>
                                <span className="ml-1 text-xs text-gray-500">
                                  {wasHomeGame ? '(H)' : '(B)'}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                result === 'W' ? 'bg-green-100 text-green-800' : 
                                result === 'D' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-red-100 text-red-800'
                              }`}>
                                {match.goals.home}-{match.goals.away}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Helper function for date formatting without external libraries
function formatDate(date: Date): string {
  const days = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
  const months = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
  
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${dayName} ${day}. ${month} ${year} kl. ${hours}:${minutes}`;
}

// Simple date formatter for the head-to-head section
function formatSimpleDate(date: Date): string {
  return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
} 