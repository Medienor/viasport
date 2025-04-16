'use client';

import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';

interface PlayerStatsProps {
  playerStats: any;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export default function PlayerStats({ playerStats }: PlayerStatsProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'rating', direction: 'desc' });

  const handleSort = (key: string) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const getSortedPlayers = () => {
    const allPlayers = playerStats.flatMap((team: any) => 
      team.players.map((player: any) => ({
        ...player,
        teamInfo: team.team
      }))
    );

    // Filter out players with 0.0 rating before sorting
    const activePlayers = allPlayers.filter((player: any) => {
      const rating = parseFloat(player.statistics[0]?.games?.rating || '0');
      return rating > 0;
    });

    return activePlayers.sort((a: any, b: any) => {
      let aValue, bValue;

      switch (sortConfig.key) {
        case 'rating':
          aValue = parseFloat(a.statistics[0].games.rating || 0);
          bValue = parseFloat(b.statistics[0].games.rating || 0);
          break;
        case 'minutes':
          aValue = a.statistics[0].games.minutes || 0;
          bValue = b.statistics[0].games.minutes || 0;
          break;
        case 'goals':
          aValue = a.statistics[0].goals.total || 0;
          bValue = b.statistics[0].goals.total || 0;
          break;
        case 'assists':
          aValue = a.statistics[0].goals.assists || 0;
          bValue = b.statistics[0].goals.assists || 0;
          break;
        case 'shots':
          aValue = a.statistics[0].shots.total || 0;
          bValue = b.statistics[0].shots.total || 0;
          break;
        default:
          return 0;
      }

      if (sortConfig.direction === 'asc') {
        return aValue - bValue;
      }
      return bValue - aValue;
    });
  };

  const renderSortArrow = (key: string) => {
    if (sortConfig.key !== key) {
      return (
        <svg className="w-3 h-3 ml-1 inline-block text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10l5 5 5-5" />
        </svg>
      );
    }
    return sortConfig.direction === 'desc' ? (
      <svg className="w-3 h-3 ml-1 inline-block text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10l5 5 5-5" />
      </svg>
    ) : (
      <svg className="w-3 h-3 ml-1 inline-block text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l-5-5-5 5" />
      </svg>
    );
  };

  const getPlayerSummaries = (players: any[]) => {
    return players.reduce((summary, team) => {
      team.players.forEach((player: any) => {
        const stats = player.statistics[0];
        const rating = parseFloat(stats.games.rating || '0');
        
        // Best rating
        if (rating > (summary.bestRating?.rating || 0)) {
          summary.bestRating = { 
            player: player.player.name, 
            rating,
            team: team.team.name,
            position: stats.games.position
          };
        }
        
        // Most goals
        if ((stats.goals.total || 0) > (summary.mostGoals?.goals || 0)) {
          summary.mostGoals = {
            player: player.player.name,
            goals: stats.goals.total,
            team: team.team.name
          };
        }

        // Most minutes
        if ((stats.games.minutes || 0) > (summary.mostMinutes?.minutes || 0)) {
          summary.mostMinutes = {
            player: player.player.name,
            minutes: stats.games.minutes,
            team: team.team.name
          };
        }

        // Best goalkeeper (most saves)
        if (stats.games.position === 'G' && (stats.goals.saves || 0) > (summary.bestGoalkeeper?.saves || 0)) {
          summary.bestGoalkeeper = {
            player: player.player.name,
            saves: stats.goals.saves,
            conceded: stats.goals.conceded,
            team: team.team.name,
            rating
          };
        }

        // Most duels won
        if ((stats.duels?.won || 0) > (summary.mostDuels?.won || 0)) {
          summary.mostDuels = {
            player: player.player.name,
            won: stats.duels.won,
            total: stats.duels.total,
            team: team.team.name
          };
        }

        // Most tackles
        if ((stats.tackles?.total || 0) > (summary.mostTackles?.total || 0)) {
          summary.mostTackles = {
            player: player.player.name,
            tackles: stats.tackles.total,
            team: team.team.name
          };
        }

        // Best passing
        if (stats.passes?.total >= 30 && (parseFloat(stats.passes.accuracy) || 0) > (summary.bestPassing?.accuracy || 0)) {
          summary.bestPassing = {
            player: player.player.name,
            accuracy: parseFloat(stats.passes.accuracy),
            total: stats.passes.total,
            team: team.team.name
          };
        }
      });
      return summary;
    }, { 
      bestRating: null, 
      mostGoals: null, 
      mostMinutes: null,
      bestGoalkeeper: null,
      mostDuels: null,
      mostTackles: null,
      bestPassing: null
    });
  };

  return (
    <div className="mt-8">
      <div className="mb-10 mt-15">
        <h2 className="text-xl font-semibold">Spillerstatistikk</h2>
      </div>

      {/* Player Stats Table */}
      <div className="overflow-x-auto">
        <table className="w-full overflow-hidden">
          <thead>
            <tr className="text-sm text-gray-600">
              <th className="text-left py-2 font-medium text-gray-500">Spiller</th>
              <th 
                className="text-center py-2 cursor-pointer group hover:bg-gray-50 font-medium text-gray-500"
                onClick={() => handleSort('rating')}
              >
                <span className="inline-flex items-center">
                  Karakter {renderSortArrow('rating')}
                </span>
              </th>
              <th 
                className="text-center py-2 cursor-pointer group hover:bg-gray-50 font-medium text-gray-500"
                onClick={() => handleSort('minutes')}
              >
                <span className="inline-flex items-center">
                  Minutter {renderSortArrow('minutes')}
                </span>
              </th>
              <th 
                className="text-center py-2 cursor-pointer group hover:bg-gray-50 font-medium text-gray-500"
                onClick={() => handleSort('goals')}
              >
                <span className="inline-flex items-center">
                  Mål {renderSortArrow('goals')}
                </span>
              </th>
              <th 
                className="text-center py-2 cursor-pointer group hover:bg-gray-50 font-medium text-gray-500"
                onClick={() => handleSort('assists')}
              >
                <span className="inline-flex items-center">
                  Assists {renderSortArrow('assists')}
                </span>
              </th>
              <th 
                className="text-center py-2 cursor-pointer group hover:bg-gray-50 font-medium text-gray-500"
                onClick={() => handleSort('shots')}
              >
                <span className="inline-flex items-center">
                  Skudd {renderSortArrow('shots')}
                </span>
              </th>
              <th className="text-center py-2 font-medium text-gray-500">xG</th>
              <th className="text-center py-2 font-medium text-gray-500">xA</th>
              <th className="text-center py-2 font-medium text-gray-500">xG + xA</th>
            </tr>
          </thead>
          <tbody>
            {getSortedPlayers().map((player: any) => {
              const stats = player.statistics[0];
              const rating = parseFloat(stats.games.rating || 0);
              
              return (
                <tr 
                  key={player.player.id} 
                  className="border-t hover:bg-gray-50 transition-all duration-300 ease-in-out animate-fade-in"
                >
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <div className="group flex items-center gap-2">
                        <div className="relative">
                          <Link 
                            href={`/spillerprofil/${player.player.id}`}
                            className="block"
                          >
                            <div className="relative w-8 h-8 transition-opacity group-hover:opacity-70">
                              <Image
                                src={player.player.photo}
                                alt={player.player.name}
                                fill
                                className="rounded-full object-cover"
                              />
                              <div className="absolute -bottom-1 -right-1 w-3 h-3">
                                <Image
                                  src={player.teamInfo.logo}
                                  alt={player.teamInfo.name}
                                  fill
                                  className="rounded-full object-cover"
                                />
                              </div>
                            </div>
                          </Link>
                        </div>
                        <Link 
                          href={`/spillerprofil/${player.player.id}`}
                          className="hover:underline"
                        >
                          <span className="group-hover:opacity-70 transition-opacity">{player.player.name}</span>
                        </Link>
                      </div>
                    </div>
                  </td>
                  <td className="text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-white text-sm
                      ${rating >= 8 ? 'bg-green-500' : 
                        rating >= 7 ? 'bg-green-400' :
                        rating >= 6 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                      {rating.toFixed(1)}
                    </span>
                  </td>
                  <td className="text-center">{stats.games.minutes || 0}</td>
                  <td className="text-center">{stats.goals.total || 0}</td>
                  <td className="text-center">{stats.goals.assists || 0}</td>
                  <td className="text-center">{stats.shots.total || 0}</td>
                  <td className="text-center">-</td>
                  <td className="text-center">-</td>
                  <td className="text-center">-</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-16">
        <h2 className="text-xl font-semibold mb-4">Oppsummert</h2>
        
        <div className="space-y-4 text-gray-700">
          {(() => {
            const summaries = getPlayerSummaries(playerStats);
            
            return (
              <>
                {summaries.bestRating && (
                  <p>
                    <span className="font-medium">Kampens beste spiller:</span> {summaries.bestRating.player} 
                    ({summaries.bestRating.team}) med en karakter på {summaries.bestRating.rating.toFixed(1)} som {
                      summaries.bestRating.position === 'G' ? 'keeper' :
                      summaries.bestRating.position === 'D' ? 'forsvarer' :
                      summaries.bestRating.position === 'M' ? 'midtbanespiller' : 'spiss'
                    }
                  </p>
                )}
                
                {summaries.bestGoalkeeper && (
                  <p>
                    <span className="font-medium">Keeperprestasjon:</span> {summaries.bestGoalkeeper.player} 
                    ({summaries.bestGoalkeeper.team}) med {summaries.bestGoalkeeper.saves} redninger 
                    og {summaries.bestGoalkeeper.conceded} innslupne mål
                  </p>
                )}
                
                {summaries.mostGoals && summaries.mostGoals.goals > 0 && (
                  <p>
                    <span className="font-medium">Målscorer:</span> {summaries.mostGoals.player} 
                    ({summaries.mostGoals.team}) med {summaries.mostGoals.goals} mål
                  </p>
                )}
                
                {summaries.mostDuels && (
                  <p>
                    <span className="font-medium">Duellkonge:</span> {summaries.mostDuels.player} 
                    ({summaries.mostDuels.team}) vant {summaries.mostDuels.won} av {summaries.mostDuels.total} dueller
                  </p>
                )}

                {summaries.bestPassing && (
                  <p>
                    <span className="font-medium">Beste pasningsspiller:</span> {summaries.bestPassing.player} 
                    ({summaries.bestPassing.team}) med {summaries.bestPassing.accuracy}% presisjon på {summaries.bestPassing.total} pasninger
                  </p>
                )}
                
                {summaries.mostTackles && summaries.mostTackles.tackles > 0 && (
                  <p>
                    <span className="font-medium">Mest taklinger:</span> {summaries.mostTackles.player} 
                    ({summaries.mostTackles.team}) med {summaries.mostTackles.tackles} taklinger
                  </p>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
} 