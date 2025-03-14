"use client"

import Image from 'next/image';
import { useState, useEffect } from 'react';

// Define interfaces for the match object and its nested properties
interface Time {
  elapsed: number;
  extra?: number;
}

interface Fixture {
  id: number;
  venue?: {
    name: string;
  };
  status?: {
    short: string;
  };
}

interface Team {
  id: number;
  name: string;
  logo: string;
}

interface Goals {
  home: number;
  away: number;
}

interface Player {
  id: number;
  name: string;
  number?: number;
  pos?: string;
}

interface Statistic {
  type: string;
  value: string | number | null;
}

interface TeamStatistics {
  team: Team;
  statistics: Statistic[];
}

interface MatchEvent {
  time: Time;
  team: Team;
  player?: Player;
  assist?: Player;
  type: string;
  detail: string;
  comments?: string;
}

interface LineupPlayer {
  player: Player;
}

interface Lineup {
  team: Team;
  formation: string;
  startXI: LineupPlayer[];
  substitutes: LineupPlayer[];
}

interface Match {
  fixture: Fixture;
  teams: {
    home: Team;
    away: Team;
  };
  goals: Goals;
  events?: MatchEvent[];
}

interface LiveMatchDetailsProps {
  match: Match; // Include all needed data in the type
}

export default function LiveMatchDetails({ match }: LiveMatchDetailsProps) {
  const [matchStats, setMatchStats] = useState<TeamStatistics[]>([]);
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
  const [matchLineups, setMatchLineups] = useState<Lineup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('statistics');


  // Translation map for statistics
  const translateStatType = (statType: string): string => {
    const translations: Record<string, string> = {
      'Shots on Goal': 'Skudd på mål',
      'Shots off Goal': 'Skudd utenfor mål',
      'Total Shots': 'Totalt antall skudd',
      'Blocked Shots': 'Blokkerte skudd',
      'Shots insidebox': 'Skudd i feltet',
      'Shots outsidebox': 'Skudd utenfor feltet',
      'Fouls': 'Frispark',
      'Corner Kicks': 'Hjørnespark',
      'Offsides': 'Offside',
      'Ball Possession': 'Ballbesittelse',
      'Yellow Cards': 'Gule kort',
      'Red Cards': 'Røde kort',
      'Goalkeeper Saves': 'Målvaktsredninger',
      'Total passes': 'Totalt antall pasninger',
      'Passes accurate': 'Presise pasninger',
      'Passes %': 'Pasningsprosent',
      'expected_goals': 'Forventede mål (xG)',
      'goals_prevented': 'Mål forhindret'
    };
    
    return translations[statType] || statType;
  };

  // Helper function to get player photo URL
  const getPlayerPhotoUrl = (playerId: number) => {
    return `https://media.api-sports.io/football/players/${playerId}.png`;
  };

  // Fetch match details when component mounts
  useEffect(() => {
    const fetchMatchDetails = async () => {
      setLoading(true);
      try {
        // Fetch match statistics
        const statsResponse = await fetch(`/api/football/fixtures/statistics?fixture=${match.fixture.id}`);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setMatchStats(statsData.response || []);
        }
        
        // Fetch match events if not already available
        if (!match.events || match.events.length === 0) {
          const eventsResponse = await fetch(`/api/football/fixtures/events?fixture=${match.fixture.id}`);
          if (eventsResponse.ok) {
            const eventsData = await eventsResponse.json();
            setMatchEvents(eventsData.response || []);
          }
        } else {
          setMatchEvents(match.events);
        }
        
        // Fetch match lineups
        const lineupsResponse = await fetch(`/api/football/fixtures/lineups?fixture=${match.fixture.id}`);
        if (lineupsResponse.ok) {
          const lineupsData = await lineupsResponse.json();
          setMatchLineups(lineupsData.response || []);
        }
      } catch (error) {
        console.error('Error fetching match details:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMatchDetails();
    
    // Set up polling to refresh match details every minute
    const intervalId = setInterval(fetchMatchDetails, 60000);
    
    return () => clearInterval(intervalId);
  }, [match]);

  // Improved render match statistics function
  const renderMatchStats = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
        </div>
      );
    }
    
    if (!matchStats || matchStats.length < 2) {
      return (
        <div className="text-center text-gray-500 py-8">
          Ingen statistikk tilgjengelig for denne kampen ennå.
        </div>
      );
    }
    
    const homeStats = matchStats[0]?.statistics || [];
    const awayStats = matchStats[1]?.statistics || [];
    
    // Group statistics into categories
    const shotStats = homeStats.filter(stat => 
      ['Shots on Goal', 'Shots off Goal', 'Total Shots', 'Blocked Shots', 'Shots insidebox', 'Shots outsidebox'].includes(stat.type)
    );
    
    const possessionStats = homeStats.filter(stat => 
      ['Ball Possession', 'Total passes', 'Passes accurate', 'Passes %'].includes(stat.type)
    );
    
    const disciplineStats = homeStats.filter(stat => 
      ['Fouls', 'Yellow Cards', 'Red Cards', 'Offsides', 'Corner Kicks'].includes(stat.type)
    );
    
    const advancedStats = homeStats.filter(stat => 
      ['expected_goals', 'goals_prevented', 'Goalkeeper Saves'].includes(stat.type)
    );
    
    const renderStatCategory = (title: string, stats: Statistic[]) => {
      if (!stats || stats.length === 0) return null;
      
      return (
        <div className="mb-8">
          <h4 className="text-md font-semibold mb-4 text-gray-700 border-b pb-2">{title}</h4>
          <div className="space-y-4">
            {stats.map((stat, index) => {
              const homeStat = stat.value || 0;
              const awayStat = awayStats.find(s => s.type === stat.type)?.value || 0;
              
              // Convert to numbers for comparison
              const homeValue = typeof homeStat === 'string' ? 
                (homeStat.endsWith('%') ? parseInt(homeStat) : parseInt(homeStat) || 0) : 
                homeStat || 0;
              
              const awayValue = typeof awayStat === 'string' ? 
                (awayStat.endsWith('%') ? parseInt(awayStat) : parseInt(awayStat) || 0) : 
                awayStat || 0;
              
              // Calculate percentages for the progress bars
              const total = homeValue + awayValue;
              const homePercent = total > 0 ? (homeValue / total) * 100 : 50;
              const awayPercent = total > 0 ? (awayValue / total) * 100 : 50;
              
              // Determine if this stat should use a different color scheme
              const isSpecialStat = ['Ball Possession', 'Passes %', 'expected_goals'].includes(stat.type);
              const homeBarColor = isSpecialStat ? 'bg-indigo-600' : 'bg-blue-600';
              const awayBarColor = isSpecialStat ? 'bg-purple-600' : 'bg-red-600';
              
              return (
                <div key={index} className="bg-gray-50 rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <div className="w-1/4 text-center">
                      <span className={`text-xl font-bold ${homeValue > awayValue ? 'text-blue-600' : 'text-gray-700'}`}>
                        {homeStat}
                      </span>
                    </div>
                    <div className="w-2/4 text-center">
                      <span className="text-sm font-medium text-gray-600">{translateStatType(stat.type)}</span>
                    </div>
                    <div className="w-1/4 text-center">
                      <span className={`text-xl font-bold ${awayValue > homeValue ? 'text-red-600' : 'text-gray-700'}`}>
                        {awayStat}
                      </span>
                    </div>
                  </div>
                  <div className="flex h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`${homeBarColor} h-full rounded-l-full transition-all duration-500 ease-in-out`} 
                      style={{ width: `${homePercent}%` }}
                    ></div>
                    <div 
                      className={`${awayBarColor} h-full rounded-r-full transition-all duration-500 ease-in-out`} 
                      style={{ width: `${awayPercent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    };
    
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <div className="relative h-10 w-10 mr-2">
              <Image 
                src={match.teams.home.logo}
                alt={match.teams.home.name}
                fill
                className="object-contain"
              />
            </div>
            <span className="font-bold text-blue-600">{match.teams.home.name}</span>
          </div>
          <div className="text-center">
            <span className="text-xl font-bold">{match.goals.home} - {match.goals.away}</span>
          </div>
          <div className="flex items-center">
            <span className="font-bold text-red-600">{match.teams.away.name}</span>
            <div className="relative h-10 w-10 ml-2">
              <Image 
                src={match.teams.away.logo}
                alt={match.teams.away.name}
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
        
        {renderStatCategory('Skudd', shotStats)}
        {renderStatCategory('Ballbesittelse & Pasninger', possessionStats)}
        {renderStatCategory('Disiplin', disciplineStats)}
        {renderStatCategory('Avansert Statistikk', advancedStats)}
      </div>
    );
  };

  // Improved render match events function
  const renderMatchEvents = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
        </div>
      );
    }
    
    if (!matchEvents || matchEvents.length === 0) {
      return (
        <div className="text-center text-gray-500 py-8">
          Ingen hendelser registrert for denne kampen ennå.
        </div>
      );
    }
    
    // Sort events by time (descending)
    const sortedEvents = [...matchEvents].sort((a, b) => {
      // First by elapsed time
      const timeComparison = (b.time.elapsed + (b.time.extra || 0)) - (a.time.elapsed + (a.time.extra || 0));
      // If same time, sort by event type priority (goals first, then cards, then subs)
      if (timeComparison === 0) {
        const typePriority: Record<string, number> = { 'Goal': 1, 'Card': 2, 'Var': 3, 'Subst': 4 };
        return (typePriority[a.type] || 5) - (typePriority[b.type] || 5);
      }
      return timeComparison;
    });
    
    // Helper function to get event icon and background color
    const getEventStyle = (event: MatchEvent) => {
      switch (event.type) {
        case 'Goal':
          if (event.detail === 'Missed Penalty') {
            return { 
              icon: '⚽❌', 
              bgColor: 'bg-red-50', 
              borderColor: 'border-red-200',
              iconBg: 'bg-red-500'
            };
          } else if (event.detail === 'Penalty') {
            return { 
              icon: '⚽', 
              bgColor: 'bg-green-50', 
              borderColor: 'border-green-200',
              iconBg: 'bg-green-500'
            };
          } else if (event.detail === 'Own Goal') {
            return { 
              icon: '⚽', 
              bgColor: 'bg-orange-50', 
              borderColor: 'border-orange-200',
              iconBg: 'bg-orange-500'
            };
          } else {
            return { 
              icon: '⚽', 
              bgColor: 'bg-green-50', 
              borderColor: 'border-green-200',
              iconBg: 'bg-green-500'
            };
          }
        case 'Card':
          if (event.detail === 'Yellow Card') {
            return { 
              icon: '🟨', 
              bgColor: 'bg-yellow-50', 
              borderColor: 'border-yellow-200',
              iconBg: 'bg-yellow-500'
            };
          } else {
            return { 
              icon: '🟥', 
              bgColor: 'bg-red-50', 
              borderColor: 'border-red-200',
              iconBg: 'bg-red-500'
            };
          }
        case 'Subst':
          return { 
            icon: '🔄', 
            bgColor: 'bg-blue-50', 
            borderColor: 'border-blue-200',
            iconBg: 'bg-blue-500'
          };
        case 'Var':
          return { 
            icon: '📺', 
            bgColor: 'bg-purple-50', 
            borderColor: 'border-purple-200',
            iconBg: 'bg-purple-500'
          };
        default:
          return { 
            icon: '⚽', 
            bgColor: 'bg-gray-50', 
            borderColor: 'border-gray-200',
            iconBg: 'bg-gray-500'
          };
      }
    };
    
    // Helper function to get event title
    const getEventTitle = (event: MatchEvent) => {
      const teamName = event.team.name;
      
      switch (event.type) {
        case 'Goal':
          if (event.detail === 'Missed Penalty') {
            return `Straffebom - ${teamName}`;
          } else if (event.detail === 'Penalty') {
            return `Straffespark - ${teamName}`;
          } else if (event.detail === 'Own Goal') {
            return `Selvmål - ${teamName}`;
          } else {
            return `Mål - ${teamName}`;
          }
        case 'Card':
          if (event.detail === 'Yellow Card') {
            return `Gult kort til ${teamName}`;
          } else {
            return `Rødt kort til ${teamName}`;
          }
        case 'Subst':
          return `Spillerbytte - ${teamName}`;
        case 'Var':
          if (event.detail === 'Goal cancelled') {
            return `VAR: Mål annullert - ${teamName}`;
          } else if (event.detail === 'Penalty confirmed') {
            return `VAR: Straffespark bekreftet - ${teamName}`;
          } else {
            return `VAR - ${teamName}`;
          }
        default:
          return `Hendelse - ${teamName}`;
      }
    };
    
    return (
      <div className="space-y-4">
        {sortedEvents.map((event, index) => {
          const { icon, bgColor, borderColor, iconBg } = getEventStyle(event);
          const eventTime = event.time.elapsed + (event.time.extra ? `+${event.time.extra}` : '');
          
          return (
            <div key={index} className={`rounded-lg border ${borderColor} ${bgColor} overflow-hidden`}>
              <div className="flex items-start p-4">
                {/* Time indicator */}
                <div className="text-gray-500 font-medium text-right mr-3 mt-1 w-12">
                  {eventTime}&apos;
                </div>
                
                {/* Event icon */}
                <div className={`flex-shrink-0 w-10 h-10 ${iconBg} rounded-full flex items-center justify-center text-white mr-4`}>
                  {event.type === 'Subst' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  ) : event.type === 'Card' && event.detail === 'Yellow Card' ? (
                    <div className="w-5 h-7 bg-yellow-400 rounded-sm"></div>
                  ) : event.type === 'Card' && event.detail === 'Red Card' ? (
                    <div className="w-5 h-7 bg-red-600 rounded-sm"></div>
                  ) : event.type === 'Goal' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  ) : event.type === 'Var' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <span className="text-lg">{icon}</span>
                  )}
                </div>
                
                {/* Event details */}
                <div className="flex-grow">
                  {event.type === 'Subst' ? (
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center">
                        {event.assist?.id && (
                          <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-green-500 mr-3">
                            <Image 
                              src={getPlayerPhotoUrl(event.assist.id)}
                              alt={event.assist.name || 'Player'}
                              fill
                              className="object-cover"
                              onError={(e) => {
                                // Fallback if player image fails to load
                                (e.target as HTMLImageElement).src = '/player-placeholder.png';
                              }}
                            />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">Inn: {event.assist?.name || 'Ukjent spiller'}</div>
                          <div className="text-xs text-green-600">Innbytter</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        {event.player?.id && (
                          <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-red-500 mr-3">
                            <Image 
                              src={getPlayerPhotoUrl(event.player.id)}
                              alt={event.player.name || 'Player'}
                              fill
                              className="object-cover"
                              onError={(e) => {
                                // Fallback if player image fails to load
                                (e.target as HTMLImageElement).src = '/player-placeholder.png';
                              }}
                            />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">Ut: {event.player?.name || 'Ukjent spiller'}</div>
                          <div className="text-xs text-red-600">Byttet ut</div>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1">
                        {event.team.name} gjør et bytte.
                      </p>
                    </div>
                  ) : event.type === 'Card' ? (
                    <div className="flex items-center">
                      {event.player?.id && (
                        <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-gray-300 mr-3">
                          <Image 
                            src={getPlayerPhotoUrl(event.player.id)}
                            alt={event.player.name || 'Player'}
                            fill
                            className="object-cover"
                            onError={(e) => {
                              // Fallback if player image fails to load
                              (e.target as HTMLImageElement).src = '/player-placeholder.png';
                            }}
                          />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{event.player?.name || 'Ukjent spiller'}</div>
                        <p className="text-sm text-gray-600 mt-1">
                          {event.detail === 'Yellow Card' ? 'Gult kort' : 'Rødt kort'} til {event.team.name}.
                        </p>
                      </div>
                    </div>
                  ) : event.type === 'Goal' ? (
                    <div className="flex items-center">
                      {event.player?.id && (
                        <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-green-500 mr-3">
                          <Image 
                            src={getPlayerPhotoUrl(event.player.id)}
                            alt={event.player.name || 'Player'}
                            fill
                            className="object-cover"
                            onError={(e) => {
                              // Fallback if player image fails to load
                              (e.target as HTMLImageElement).src = '/player-placeholder.png';
                            }}
                          />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">
                          {event.detail === 'Own Goal' ? 'Selvmål: ' : ''}
                          {event.player?.name || 'Ukjent spiller'}
                        </div>
                        {event.assist?.name && (
                          <div className="flex items-center mt-1">
                            {event.assist?.id && (
                              <div className="relative h-8 w-8 rounded-full overflow-hidden border border-blue-300 mr-2">
                                <Image 
                                  src={getPlayerPhotoUrl(event.assist.id)}
                                  alt={event.assist.name}
                                  fill
                                  className="object-cover"
                                  onError={(e) => {
                                    // Fallback if player image fails to load
                                    (e.target as HTMLImageElement).src = '/player-placeholder.png';
                                  }}
                                />
                              </div>
                            )}
                            <span className="text-sm text-blue-600">Assist: {event.assist.name}</span>
                          </div>
                        )}
                        <p className="text-sm text-gray-600 mt-1">
                          {event.detail === 'Missed Penalty' ? 'Bommet på straffespark' : 
                           event.detail === 'Penalty' ? 'Scoret på straffespark' : 
                           event.detail === 'Own Goal' ? 'Selvmål' : 'Mål'} for {event.team.name}.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium">{getEventTitle(event)}</div>
                      <p className="text-sm text-gray-600 mt-1">
                        {event.detail} - {event.comments || ''}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Team logo */}
                <div className="ml-4 flex-shrink-0">
                  <div className="relative h-8 w-8">
                    <Image 
                      src={event.team.logo || '/placeholder-team.png'}
                      alt={event.team.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render match lineups
  const renderMatchLineups = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
        </div>
      );
    }
    
    if (!matchLineups || matchLineups.length === 0) {
      return (
        <div className="text-center text-gray-500 py-8">
          Lagoppstillinger er ikke tilgjengelige ennå.
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {matchLineups.map((team, index) => (
          <div key={index} className="border-b pb-6 last:border-0 last:pb-0">
            <div className="flex items-center mb-4">
              <div className="relative h-8 w-8 mr-2">
                <Image 
                  src={team.team.logo}
                  alt={team.team.name}
                  fill
                  className="object-contain"
                />
              </div>
              <h3 className="font-bold text-lg">{team.team.name}</h3>
              <span className="ml-auto text-sm text-gray-600">Formation: {team.formation}</span>
            </div>
            
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">Startoppstilling</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {team.startXI.map((player: LineupPlayer, idx: number) => (
                  <div key={idx} className="flex items-center p-2 bg-gray-50 rounded">
                    <span className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-xs font-medium mr-2">
                      {player.player.number}
                    </span>
                    <span className="flex-grow">{player.player.name}</span>
                    <span className="text-xs text-gray-500">{player.player.pos}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Innbyttere</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {team.substitutes.map((player: LineupPlayer, idx: number) => (
                  <div key={idx} className="flex items-center p-2 bg-gray-50 rounded">
                    <span className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-xs font-medium mr-2">
                      {player.player.number}
                    </span>
                    <span className="flex-grow">{player.player.name}</span>
                    <span className="text-xs text-gray-500">{player.player.pos}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* Tab navigation */}
      <div className="flex border-b mb-6">
        <button 
          className={`px-4 py-2 font-medium ${activeTab === 'statistics' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('statistics')}
        >
          Statistikk
        </button>
        <button 
          className={`px-4 py-2 font-medium ${activeTab === 'events' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('events')}
        >
          Hendelser
        </button>
        <button 
          className={`px-4 py-2 font-medium ${activeTab === 'lineups' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('lineups')}
        >
          Lagoppstillinger
        </button>
      </div>
      
      {/* Tab content */}
      <div>
        {activeTab === 'statistics' && (
          <div>
            <h3 className="text-lg font-bold mb-4">Kampstatistikk</h3>
            {renderMatchStats()}
          </div>
        )}
        
        {activeTab === 'events' && (
          <div>
            <h3 className="text-lg font-bold mb-4">Kampforløp</h3>
            {renderMatchEvents()}
          </div>
        )}
        
        {activeTab === 'lineups' && (
          <div>
            <h3 className="text-lg font-bold mb-4">Lagoppstillinger</h3>
            {renderMatchLineups()}
          </div>
        )}
      </div>
    </div>
  );
} 