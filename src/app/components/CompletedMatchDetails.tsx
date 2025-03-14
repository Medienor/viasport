'use client';

import { useEffect, useState, useCallback } from 'react';
import { BASE_URL, headers } from '../services/sportApi';

interface MatchEvent {
  time: {
    elapsed: number;
    extra?: number;
  };
  team: {
    id: number;
    name: string;
    logo: string;
  };
  player: {
    id: number;
    name: string;
  };
  assist?: {
    id: number;
    name: string;
  };
  type: string;
  detail: string;
  comments?: string;
}

// Define interfaces for the match object and its nested properties
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

interface Statistic {
  type: string;
  value: string | null;
}

interface TeamStatistics {
  team: Team;
  statistics: Statistic[];
}

interface Match {
  fixture: Fixture;
  teams: {
    home: Team;
    away: Team;
  };
  goals: Goals;
  statistics?: TeamStatistics[];
}

export default function CompletedMatchDetails({ match }: { match: Match }) {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<string>('');
  
  const fetchMatchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/fixtures/events?fixture=${match.fixture.id}`, { headers });
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.response && Array.isArray(data.response)) {
        setEvents(data.response);
        generateMatchSummary(data.response, match);
      }
    } catch (error) {
      console.error('Error fetching match events:', error);
    } finally {
      setLoading(false);
    }
  }, [match]);
  
  useEffect(() => {
    // Only fetch events if match is completed
    if (match?.fixture?.status?.short === 'FT') {
      fetchMatchEvents();
    } else {
      setLoading(false);
    }
  }, [match, fetchMatchEvents]);
  
  const generateMatchSummary = (events: MatchEvent[], match: Match) => {
    // Extract key events
    const goals = events.filter(event => event.type === 'Goal');
    const cards = events.filter(event => event.type === 'Card');
    const redCards = cards.filter(event => event.detail === 'Red Card');
    const homeGoals = goals.filter(event => event.team.id === match.teams.home.id);
    const awayGoals = goals.filter(event => event.team.id === match.teams.away.id);
    
    // Generate summary
    let summaryText = '';
    
    // Match result overview
    if (match.goals.home === match.goals.away) {
      summaryText += `${match.teams.home.name} og ${match.teams.away.name} delte poengene i en ${match.goals.home}-${match.goals.away} kamp`;
    } else if (match.goals.home > match.goals.away) {
      summaryText += `${match.teams.home.name} vant ${match.goals.home}-${match.goals.away} mot ${match.teams.away.name}`;
    } else {
      summaryText += `${match.teams.away.name} vant ${match.goals.away}-${match.goals.home} borte mot ${match.teams.home.name}`;
    }
    
    // Add venue if available
    if (match.fixture.venue && match.fixture.venue.name) {
      summaryText += ` på ${match.fixture.venue.name}`;
    }
    summaryText += '. ';
    
    // Goal scorers
    if (goals.length > 0) {
      // First half goals
      const firstHalfGoals = goals.filter(goal => goal.time.elapsed <= 45);
      if (firstHalfGoals.length > 0) {
        if (homeGoals.some(goal => goal.time.elapsed <= 45) && awayGoals.some(goal => goal.time.elapsed <= 45)) {
          summaryText += 'Begge lag scoret i første omgang. ';
        } else if (homeGoals.some(goal => goal.time.elapsed <= 45)) {
          summaryText += `${match.teams.home.name} tok ledelsen i første omgang. `;
        } else if (awayGoals.some(goal => goal.time.elapsed <= 45)) {
          summaryText += `${match.teams.away.name} tok ledelsen i første omgang. `;
        }
      }
      
      // Second half goals
      const secondHalfGoals = goals.filter(goal => goal.time.elapsed > 45);
      if (secondHalfGoals.length > 0) {
        summaryText += 'I andre omgang ';
        if (secondHalfGoals.length === 1) {
          const goal = secondHalfGoals[0];
          summaryText += `scoret ${goal.player.name} for ${goal.team.name}`;
          if (goal.assist) {
            summaryText += ` etter assist fra ${goal.assist.name}`;
          }
          summaryText += `. `;
        } else {
          summaryText += 'fortsatte målshowet med ';
          const homeSecondHalfGoals = homeGoals.filter(goal => goal.time.elapsed > 45);
          const awaySecondHalfGoals = awayGoals.filter(goal => goal.time.elapsed > 45);
          
          if (homeSecondHalfGoals.length > 0) {
            summaryText += `${homeSecondHalfGoals.length} mål fra ${match.teams.home.name}`;
            if (awaySecondHalfGoals.length > 0) {
              summaryText += ` og ${awaySecondHalfGoals.length} fra ${match.teams.away.name}`;
            }
          } else if (awaySecondHalfGoals.length > 0) {
            summaryText += `${awaySecondHalfGoals.length} mål fra ${match.teams.away.name}`;
          }
          summaryText += '. ';
        }
      }
      
      // Late goals (after 80 minutes)
      const lateGoals = goals.filter(goal => goal.time.elapsed >= 80);
      if (lateGoals.length > 0) {
        if (lateGoals.length === 1) {
          const goal = lateGoals[0];
          summaryText += `${goal.player.name} scoret sent (${goal.time.elapsed}') for ${goal.team.name}. `;
        } else {
          summaryText += 'Kampen hadde en dramatisk avslutning med sene mål. ';
        }
      }
    }
    
    // Red cards
    if (redCards.length > 0) {
      summaryText += 'Kampen ble preget av ';
      if (redCards.length === 1) {
        const card = redCards[0];
        summaryText += `at ${card.player.name} fikk rødt kort i det ${card.time.elapsed}. minutt. `;
      } else {
        summaryText += `${redCards.length} røde kort. `;
      }
    }
    
    // Match stats summary
    if (match.statistics && Array.isArray(match.statistics) && match.statistics.length === 2) {
      const homeStats = match.statistics[0].statistics;
      const awayStats = match.statistics[1].statistics;
      
      // Find possession stats
      const homePossession = homeStats.find((stat) => stat.type === 'Ball Possession');
      const awayPossession = awayStats.find((stat) => stat.type === 'Ball Possession');
      
      if (homePossession && awayPossession) {
        const homePossValue = parseInt(homePossession.value || '0');
        const awayPossValue = parseInt(awayPossession.value || '0');
        
        if (Math.abs(homePossValue - awayPossValue) >= 15) {
          if (homePossValue > awayPossValue) {
            summaryText += `${match.teams.home.name} dominerte ballbesittelsen med ${homePossValue}%. `;
          } else {
            summaryText += `${match.teams.away.name} dominerte ballbesittelsen med ${awayPossValue}%. `;
          }
        }
      }
      
      // Find shots stats
      const homeShots = homeStats.find((stat: Statistic) => stat.type === 'Total Shots');
      const awayShots = awayStats.find((stat: Statistic) => stat.type === 'Total Shots');
      
      if (homeShots && awayShots) {
        const homeShotsValue = parseInt(homeShots.value || '0');
        const awayShotsValue = parseInt(awayShots.value || '0');
        
        if (Math.abs(homeShotsValue - awayShotsValue) >= 5) {
          if (homeShotsValue > awayShotsValue) {
            summaryText += `${match.teams.home.name} skapte flest sjanser med ${homeShotsValue} skudd. `;
          } else {
            summaryText += `${match.teams.away.name} skapte flest sjanser med ${awayShotsValue} skudd. `;
          }
        }
      }
    }
    
    // Conclusion
    if (match.goals.home === match.goals.away) {
      summaryText += 'Uavgjort var et rettferdig resultat basert på kampbildet.';
    } else if (match.goals.home > match.goals.away) {
      if (match.goals.home - match.goals.away >= 3) {
        summaryText += `${match.teams.home.name} vant komfortabelt på hjemmebane.`;
      } else {
        summaryText += `${match.teams.home.name} sikret seg alle tre poengene.`;
      }
    } else {
      if (match.goals.away - match.goals.home >= 3) {
        summaryText += `${match.teams.away.name} vant overbevisende på bortebane.`;
      } else {
        summaryText += `${match.teams.away.name} tok med seg en viktig borteseier.`;
      }
    }
    
    setSummary(summaryText);
  };

  // Only show completed match details if the match is finished
  if (match?.fixture?.status?.short !== 'FT') {
    return null;
  }

  return (
    <div>
      {/* Match summary */}
      <div className="mb-6">
        <div className="flex justify-center items-center mb-4">
          <span className="bg-gray-200 text-gray-800 text-xs font-medium px-3 py-0.5 rounded-full">
            Slutt
          </span>
        </div>
        
        {/* Goals */}
        <div className="space-y-2">
          {events.filter(event => event.type === 'Goal').map((goal, index) => (
            <div key={`goal-${index}`} className="flex items-center">
              {goal.team.id === match.teams.home.id ? (
                <>
                  <div className="w-1/2 text-right pr-4">
                    <div className="flex items-center justify-end">
                      <span>{goal.player.name}</span>
                      <span className="ml-2 text-xs bg-gray-200 px-1 rounded">
                        {goal.time.elapsed}&apos;{goal.time.extra ? `+${goal.time.extra}` : ''}
                      </span>
                      <svg className="w-4 h-4 ml-2 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    </div>
                    {goal.assist && (
                      <div className="text-xs text-gray-500 mt-0.5">Assist: {goal.assist.name}</div>
                    )}
                  </div>
                  <div className="w-1/2 pl-4"></div>
                </>
              ) : (
                <>
                  <div className="w-1/2 text-right pr-4"></div>
                  <div className="w-1/2 pl-4">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                      <span className="mr-2 text-xs bg-gray-200 px-1 rounded">
                        {goal.time.elapsed}&apos;{goal.time.extra ? `+${goal.time.extra}` : ''}
                      </span>
                      <span>{goal.player.name}</span>
                    </div>
                    {goal.assist && (
                      <div className="text-xs text-gray-500 mt-0.5 ml-6">Assist: {goal.assist.name}</div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
          
          {/* Red cards */}
          {events.filter(event => event.type === 'Card' && event.detail === 'Red Card').map((card, index) => (
            <div key={`red-${index}`} className="flex items-center">
              {card.team.id === match.teams.home.id ? (
                <>
                  <div className="w-1/2 text-right pr-4">
                    <div className="flex items-center justify-end">
                      <span>{card.player.name}</span>
                      <span className="ml-2 text-xs bg-red-100 text-red-800 px-1 rounded">
                        {card.time.elapsed}&apos;{card.time.extra ? `+${card.time.extra}` : ''}
                      </span>
                      <div className="ml-2 w-3 h-4 bg-red-600 rounded"></div>
                    </div>
                  </div>
                  <div className="w-1/2 pl-4"></div>
                </>
              ) : (
                <>
                  <div className="w-1/2 text-right pr-4"></div>
                  <div className="w-1/2 pl-4">
                    <div className="flex items-center">
                      <div className="mr-2 w-3 h-4 bg-red-600 rounded"></div>
                      <span className="mr-2 text-xs bg-red-100 text-red-800 px-1 rounded">
                        {card.time.elapsed}&apos;{card.time.extra ? `+${card.time.extra}` : ''}
                      </span>
                      <span>{card.player.name}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Match stats */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-4">Kampstatistikk</h3>
        
        {match.statistics && Array.isArray(match.statistics) && match.statistics.length === 2 ? (
          <div className="space-y-4">
            {match.statistics[0].statistics.map((stat, index) => {
              const homeStat = stat.value || '0';
              const awayStat = match.statistics && match.statistics[1].statistics[index].value || '0';
              
              // Convert percentage strings to numbers for width calculation
              let homeWidth = '50%';
              let awayWidth = '50%';
              
              if (stat.type === 'Ball Possession') {
                const homeValue = parseInt(homeStat);
                const awayValue = parseInt(awayStat);
                homeWidth = `${homeValue}%`;
                awayWidth = `${awayValue}%`;
              } else if (stat.type === 'Total Shots' || stat.type === 'Shots on Goal' || 
                         stat.type === 'Corner Kicks' || stat.type === 'Yellow Cards') {
                const homeValue = parseInt(homeStat) || 0;
                const awayValue = parseInt(awayStat) || 0;
                const total = homeValue + awayValue;
                
                if (total > 0) {
                  homeWidth = `${(homeValue / total) * 100}%`;
                  awayWidth = `${(awayValue / total) * 100}%`;
                }
              }
              
              // Map API stat types to Norwegian translations
              const statLabels: {[key: string]: string} = {
                'Ball Possession': 'Ballbesittelse',
                'Total Shots': 'Skudd',
                'Shots on Goal': 'Skudd på mål',
                'Corner Kicks': 'Hjørnespark',
                'Yellow Cards': 'Gule kort',
                'Red Cards': 'Røde kort'
              };
              
              const statLabel = statLabels[stat.type] || stat.type;
              
              return (
                <div key={stat.type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{homeStat}</span>
                    <span className="font-medium">{statLabel}</span>
                    <span>{awayStat}</span>
                  </div>
                  <div className="flex h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="bg-blue-600" style={{ width: homeWidth }}></div>
                    <div className="bg-red-600" style={{ width: awayWidth }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-600 text-center py-4">Ingen statistikk tilgjengelig</p>
        )}
      </div>
      
      {/* Match summary */}
      <div>
        <h3 className="text-lg font-bold mb-4">Kampsammendrag</h3>
        
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <>
              {summary ? (
                <div>
                  <p>{summary}</p>
                  
                  <div className="mt-6">
                    <h4 className="font-bold mb-2">Nøkkelspillere</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {events
                        .filter(event => event.type === 'Goal')
                        .slice(0, 3)
                        .map((goal, index) => (
                          <li key={`key-player-${index}`}>
                            {goal.player.name} ({goal.team.name}) - Scoret i det {goal.time.elapsed}. minutt
                            {goal.assist ? ` etter assist fra ${goal.assist.name}` : ''}
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600 text-center py-4">
                  Ingen kampsammendrag tilgjengelig
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 