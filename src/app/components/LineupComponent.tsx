'use client';

import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';

interface Player {
  id: number;
  name: string;
  number: number;
  pos: string;
  grid?: string;
  photo: string;
  statistics?: PlayerStatistics[];
}

interface TeamLineup {
  team: {
    id: number;
    name: string;
    logo: string;
    colors?: {
      player: {
        primary: string;
        number: string;
        border: string;
      };
    };
  };
  formation: string;
  startXI: { player: Player }[];
  substitutes: { player: Player }[];
  coach: {
    id: number;
    name: string;
    photo?: string;
  };
}

interface LineupComponentProps {
  lineups: any;
  playerStats: any[];
  eventData?: Array<{
    type: string;
    time: {
      elapsed: number;
      extra?: number | null;
    };
    player: {
      id: number;
      name: string;
    };
    assist: {
      id: number;
      name: string;
    };
    detail: string;
  }>;
}

interface PlayerStatistics {
  rating: number;
  // ... other statistics
}

const createTeamSlug = (teamName: string, teamId: number) => {
  return `${teamName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${teamId}`;
};

export default function LineupComponent({ lineups, playerStats, eventData }: LineupComponentProps) {
  const [flippedCards, setFlippedCards] = useState<{ [key: string]: boolean }>({});

  // Calculate highest rating for each team
  const teamHighestRatings = lineups.reduce((acc: { [key: number]: number }, team: TeamLineup) => {
    const allPlayers = [...team.startXI, ...team.substitutes];
    const ratings = allPlayers.map(({ player }) => {
      const playerStat = playerStats
        .find(teamStats => teamStats.team.id === team.team.id)?.players
        .find(p => p.player.id === player.id);
      return parseFloat(playerStat?.statistics[0]?.games?.rating || '0');
    });
    acc[team.team.id] = Math.max(...ratings);
    return acc;
  }, {});

  if (!lineups || lineups.length === 0) {
    return <div className="text-center py-4">Ingen lagoppstilling tilgjengelig</div>;
  }

  const getGridPosition = (grid: string, isHome: boolean, formation: string, startXI: Array<any>) => {
    if (!grid) return { top: '50%', left: '50%' };
    
    const [row, col] = grid.split(':').map(Number);
    
    // Field dimensions (percentage-based)
    const fieldWidth = 70; // Using 70% of width (15% to 85%)
    
    // Calculate base positions
    let leftPercentage, topPercentage;
    
    // Count players in the same row
    const playersInRow = startXI.filter(p => p.player.grid?.split(':')[0] === row.toString()).length;
    
    // Horizontal positioning (col)
    if (playersInRow === 1) {
      // Single player in row (goalkeeper, striker, etc.) - always center
      leftPercentage = 50;
    } else if (playersInRow === 2) {
      // For 2 players, center them with appropriate spacing
      const spacing = 30; // Distance between the two players
      leftPercentage = col === 1 
        ? 50 - (spacing / 2)  // First player
        : 50 + (spacing / 2); // Second player
    } else {
      // For 3 or more players, spread across the width based on number of players
      const spacing = fieldWidth / (playersInRow - 1);
      leftPercentage = 15 + ((col - 1) * spacing);
    }
    
    // Vertical positioning (row)
    if (!isHome) {
      // Away team (bottom to top) - more spread out vertically
      switch(row) {
        case 1: topPercentage = 90; break; // GK
        case 2: topPercentage = 70; break; // Defense
        case 3: topPercentage = 50; break; // Midfield
        case 4: topPercentage = 30; break; // Forwards
        case 5: topPercentage = 15; break; // Striker
        default: topPercentage = 50;
      }
    } else {
      // Home team positions - more spread out vertically
      switch(row) {
        case 1: topPercentage = 15; break;
        case 2: topPercentage = 35; break;
        case 3: topPercentage = 55; break;
        case 4: topPercentage = 75; break;
        case 5: topPercentage = 90; break;
        default: topPercentage = 50;
      }
    }

    return {
      top: `${topPercentage}%`,
      left: `${leftPercentage}%`,
    };
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'bg-green-500';
    if (rating >= 7) return 'bg-green-400';
    if (rating >= 6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getPlayerPhotoUrl = (playerId: number) => {
    return `https://media.api-sports.io/football/players/${playerId}.png`;
  };

  const getPlayerSubstitutionTime = (playerId: number): { subIn?: number; subOut?: number } => {
    if (!eventData) return {};
    
    const substitutions = eventData.filter(event => event.type === 'subst');
    
    const subOut = substitutions.find(event => event.player.id === playerId)?.time.elapsed;
    const subIn = substitutions.find(event => event.assist.id === playerId)?.time.elapsed;
    
    return { subIn, subOut };
  };

  const getPlayerCard = (playerId: number): 'yellow' | 'red' | null => {
    if (!eventData) return null;
    
    const cardEvent = eventData.find(event => 
      event.type === 'Card' && 
      event.player.id === playerId
    );

    if (!cardEvent) return null;
    return cardEvent.detail === 'Yellow Card' ? 'yellow' : 'red';
  };

  const renderPlayerCard = (player: Player, position: any, team: TeamLineup, substituteInfo?: { subTime: number, otherPlayer: Player }) => {
    const playerStat = playerStats
      .find(teamStats => teamStats.team.id === team.team.id)?.players
      .find(p => p.player.id === player.id);
    
    const rating = parseFloat(playerStat?.statistics[0]?.games?.rating || '0');
    const isHighestRated = rating === teamHighestRatings[team.team.id] && rating > 0;
    const goalsScored = playerStat?.statistics[0]?.goals?.total || 0;
    const cardKey = `${player.id}-${substituteInfo?.otherPlayer?.id || ''}`;
    const isFlipped = flippedCards[cardKey];

    if (!substituteInfo) {
      return (
        <div className="absolute transform -translate-x-1/2 -translate-y-1/2" style={position}>
          <Link 
            href={`/spillerprofil/${player.id}`}
            className="block hover:opacity-90 transition-opacity"
          >
            <div className="w-full flex flex-col items-center">
              <div className="relative">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-white overflow-hidden border-2 border-white">
                  <img src={getPlayerPhotoUrl(player.id)} alt={player.name} className="w-full h-full object-cover" />
                </div>
                {rating > 0 && (
                  <div className="absolute -top-2 -right-2 flex items-center">
                    <div className={`w-5 h-5 sm:w-7 sm:h-7 rounded-full ${getRatingColor(rating)} 
                      flex items-center justify-center text-xs sm:text-sm font-bold text-white shadow-md`}>
                      {rating.toFixed(1)}
                    </div>
                    {isHighestRated && (
                      <span className="text-yellow-400 text-xs sm:text-sm -mr-2 ml-0.5">★</span>
                    )}
                  </div>
                )}
                {/* Add back goal icon */}
                {goalsScored > 0 && (
                  <div className="absolute -bottom-1 -left-1 bg-white rounded-full w-5 h-5 flex items-center justify-center text-sm shadow-md">
                    ⚽
                  </div>
                )}
                {/* Add back card icon */}
                {getPlayerCard(player.id) === 'yellow' && (
                  <div className="absolute -bottom-1 -left-1 bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                    <div className="w-3 h-4 bg-yellow-400 rounded-sm"></div>
                  </div>
                )}
                {getPlayerCard(player.id) === 'red' && (
                  <div className="absolute -bottom-1 -left-1 bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                    <div className="w-3 h-4 bg-red-600 rounded-sm"></div>
                  </div>
                )}
              </div>
              <span className="text-white text-[10px] sm:text-xs font-medium whitespace-nowrap bg-black/50 px-1.5 sm:px-2 py-0.5 rounded mt-1">
                {player.number} {player.name.split(' ').pop()}
              </span>
            </div>
          </Link>
        </div>
      );
    }

    // For substituted player, get the substitute's stats
    const substituteStats = playerStats
      .find(teamStats => teamStats.team.id === team.team.id)?.players
      .find(p => p.player.id === substituteInfo.otherPlayer.id);
    
    const substituteGoals = substituteStats?.statistics[0]?.goals?.total || 0;
    const substituteRating = parseFloat(substituteStats?.statistics[0]?.games?.rating || '0');

    return (
      <div className="absolute transform -translate-x-1/2 -translate-y-1/2" style={position}>
        <div 
          className="relative cursor-pointer"
          onClick={() => {
            setFlippedCards(prev => ({
              ...prev,
              [cardKey]: !prev[cardKey]
            }));
          }}
        >
          {/* Original player */}
          <div className={`transition-opacity duration-300 ${isFlipped ? 'opacity-0' : 'opacity-100'}`}>
            <div className="w-full flex flex-col items-center">
              <div className="relative">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-white overflow-hidden border-2 border-white">
                  <img src={getPlayerPhotoUrl(player.id)} alt={player.name} className="w-full h-full object-cover" />
                </div>
                {rating > 0 && (
                  <div className="absolute -top-2 -right-2 flex items-center">
                    <div className={`w-5 h-5 sm:w-7 sm:h-7 rounded-full ${getRatingColor(rating)} 
                      flex items-center justify-center text-xs sm:text-sm font-bold text-white shadow-md`}>
                      {rating.toFixed(1)}
                    </div>
                    {isHighestRated && (
                      <span className="text-yellow-400 text-xs sm:text-sm -mr-2 ml-0.5">★</span>
                    )}
                  </div>
                )}
                {/* Only show substitution time if substituteInfo exists */}
                {substituteInfo && (
                  <div className="absolute -top-1 -left-7 text-xs text-white font-medium">
                    {substituteInfo.subTime}'↓
                  </div>
                )}
                {/* Add back goal icon */}
                {goalsScored > 0 && (
                  <div className="absolute -bottom-1 -left-1 bg-white rounded-full w-5 h-5 flex items-center justify-center text-sm shadow-md">
                    ⚽
                  </div>
                )}
                {/* Add back card icon */}
                {getPlayerCard(player.id) === 'yellow' && (
                  <div className="absolute -bottom-1 -left-1 bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                    <div className="w-3 h-4 bg-yellow-400 rounded-sm"></div>
                  </div>
                )}
                {getPlayerCard(player.id) === 'red' && (
                  <div className="absolute -bottom-1 -left-1 bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                    <div className="w-3 h-4 bg-red-600 rounded-sm"></div>
                  </div>
                )}
              </div>
              <span className="text-white text-[10px] sm:text-xs font-medium whitespace-nowrap bg-black/50 px-1.5 sm:px-2 py-0.5 rounded mt-1">
                {player.number} {player.name.split(' ').pop()}
              </span>
            </div>
          </div>

          {/* Substitute player */}
          <div 
            className={`absolute top-0 left-0 w-full transition-opacity duration-300 ${isFlipped ? 'opacity-100' : 'opacity-0'}`}
          >
            <div className="w-full flex flex-col items-center">
              <div className="relative">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-white overflow-hidden border-2 border-white">
                  <img src={getPlayerPhotoUrl(substituteInfo.otherPlayer.id)} alt={substituteInfo.otherPlayer.name} className="w-full h-full object-cover" />
                </div>
                {substituteRating > 0 && (
                  <div className={`absolute -top-2 -right-2 w-5 h-5 sm:w-7 sm:h-7 rounded-full ${getRatingColor(substituteRating)} 
                    flex items-center justify-center text-xs sm:text-sm font-bold text-white`}>
                    {substituteRating.toFixed(1)}
                  </div>
                )}
                <div className="absolute -top-1 -left-7 text-xs text-white font-medium">
                  {substituteInfo.subTime}'↑
                </div>
                {/* Add back goal icon for substitute */}
                {substituteGoals > 0 && (
                  <div className="absolute -bottom-1 -left-1 bg-white rounded-full w-5 h-5 flex items-center justify-center text-sm shadow-md">
                    ⚽
                  </div>
                )}
                {/* Add back card icon for substitute */}
                {getPlayerCard(substituteInfo.otherPlayer.id) === 'yellow' && (
                  <div className="absolute -bottom-1 -left-1 bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                    <div className="w-3 h-4 bg-yellow-400 rounded-sm"></div>
                  </div>
                )}
                {getPlayerCard(substituteInfo.otherPlayer.id) === 'red' && (
                  <div className="absolute -bottom-1 -left-1 bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                    <div className="w-3 h-4 bg-red-600 rounded-sm"></div>
                  </div>
                )}
              </div>
              <span className="text-white text-[10px] sm:text-xs font-medium whitespace-nowrap bg-black/50 px-1.5 sm:px-2 py-0.5 rounded mt-1">
                {substituteInfo.otherPlayer.number} {substituteInfo.otherPlayer.name.split(' ').pop()}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTeamFormation = (team: TeamLineup, isHome: boolean) => {
    // Calculate team average rating
    const allPlayers = [...team.startXI, ...team.substitutes];
    const playerRatings = allPlayers
      .map(({ player }) => {
        const playerStat = playerStats
          .find(teamStats => teamStats.team.id === team.team.id)?.players
          .find(p => p.player.id === player.id);
        return parseFloat(playerStat?.statistics[0]?.games?.rating || '0');
      })
      .filter(rating => rating > 0); // Only include players who have ratings

    const teamAverageRating = playerRatings.length > 0
      ? (playerRatings.reduce((sum, rating) => sum + rating, 0) / playerRatings.length).toFixed(1)
      : null;

    return (
      <div>
        {/* Team header */}
        <div className="flex items-center gap-4 p-3 bg-[#0d9f68] rounded-t-lg">
          {/* Team Rating - removed shadow-md */}
          {teamAverageRating && (
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${getRatingColor(parseFloat(teamAverageRating))} 
              flex items-center justify-center text-xs sm:text-sm font-bold text-white`}>
              {teamAverageRating}
            </div>
          )}
          
          {/* Updated logo styling */}
          <img 
            src={team.team.logo} 
            alt={`${team.team.name} logo`}
            className="w-8 h-8 object-contain"
          />
          <div>
            <Link 
              href={`/lag/${createTeamSlug(team.team.name, team.team.id)}`} 
              className="hover:opacity-80 transition-opacity"
            >
              <h2 className="font-semibold text-white">{team.team.name}</h2>
            </Link>
            <p className="text-sm text-white/80">{team.formation}</p>
          </div>
        </div>

        {/* Soccer field */}
        <div className="relative aspect-[4/5] sm:aspect-[4/4] md:aspect-[4/3.5] bg-[#01935c] rounded-b-lg overflow-hidden">
          {/* Field markings */}
          <div className="absolute inset-0">
            {/* Center line */}
            <div className={`absolute ${isHome ? 'bottom-0' : 'top-0'} left-0 right-0 border-b-4 border-white/40`} />
            
            {/* Center circle (half) */}
            <div className={`absolute ${isHome ? 'bottom-0' : 'top-0'} left-1/2 -translate-x-1/2 ${isHome ? 'translate-y-1/2' : '-translate-y-1/2'} w-32 h-16 border-4 border-white/40 rounded-t-full ${isHome ? '' : 'rotate-180'}`} />
            
            {/* Penalty box - with rounded corners */}
            <div className={`absolute ${isHome ? 'top-0' : 'bottom-0'} left-1/2 -translate-x-1/2 w-3/4 h-1/3 border-4 border-white/40 ${isHome ? 'border-t-0 rounded-b-xl' : 'border-b-0 rounded-t-xl'}`}>
              {/* Small box - with rounded corners */}
              <div className={`absolute ${isHome ? 'top-0' : 'bottom-0'} left-1/2 -translate-x-1/2 w-1/3 h-1/2 border-4 border-white/40 ${isHome ? 'border-t-0 rounded-b-xl' : 'border-b-0 rounded-t-xl'}`} />
              
              {/* Penalty spot */}
              <div className={`absolute ${isHome ? 'top-2/3' : 'bottom-2/3'} left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white/40`} />
              
              {/* Penalty arc - with hidden straight edge */}
              <div 
                className={`absolute left-1/2 -translate-x-1/2 w-24 h-12 border-4 border-white/40`}
                style={{
                  borderRadius: isHome ? '0 0 24px 24px' : '24px 24px 0 0',
                  bottom: isHome ? '-48px' : 'auto',
                  top: isHome ? 'auto' : '-48px',
                  borderTop: isHome ? 'transparent' : '4px solid rgba(255, 255, 255, 0.4)',
                  borderBottom: isHome ? '4px solid rgba(255, 255, 255, 0.4)' : 'transparent'
                }}
              />
            </div>
          </div>

          {/* Players with updated positioning */}
          {team.startXI.map(({ player }) => {
            const position = getGridPosition(player.grid || '', isHome, team.formation, team.startXI);
            const { subOut } = getPlayerSubstitutionTime(player.id);
            
            // Find substitute if this player was subbed out
            const substitute = subOut && team.substitutes.find(({ player: sub }) => {
              const { subIn } = getPlayerSubstitutionTime(sub.id);
              return subIn === subOut;
            });

            return renderPlayerCard(
              player,
              position,
              team,  // Pass the team here
              substitute ? {
                subTime: subOut,
                otherPlayer: substitute.player
              } : undefined
            );
          })}
        </div>
      </div>
    );
  };

  const renderTeamList = (team: TeamLineup) => {
    // Separate players into substitutes (those who played) and benched (those who didn't)
    const playedSubstitutes = team.substitutes.filter(({ player }) => {
      const { subIn } = getPlayerSubstitutionTime(player.id);
      return subIn !== undefined;
    });

    const benchedPlayers = team.substitutes.filter(({ player }) => {
      const { subIn } = getPlayerSubstitutionTime(player.id);
      return subIn === undefined;
    });

    return (
      <div className="mt-8 space-y-6">
        {/* Substitutes Section */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Substitutes (Innbyttere)</h3>
          <div className="space-y-2">
            {playedSubstitutes.map(({ player }) => {
              const playerStat = playerStats
                .find(teamStats => teamStats.team.id === team.team.id)?.players
                .find(p => p.player.id === player.id);
              
              const rating = parseFloat(playerStat?.statistics[0]?.games?.rating || '0');
              const goalsScored = playerStat?.statistics[0]?.goals?.total || 0;
              const { subIn, subOut } = getPlayerSubstitutionTime(player.id);

              return (
                <Link 
                  href={`/spillerprofil/${player.id}`} 
                  key={player.id} 
                  className="block"
                >
                  <div className="flex items-center gap-3 bg-white hover:bg-gray-50 transition-colors rounded-lg p-3 shadow-sm">
                    <div className="flex items-center gap-3 flex-1">
                      <img 
                        src={getPlayerPhotoUrl(player.id)}
                        alt={player.name}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/default-player.png';
                        }}
                      />
                      
                      {rating > 0 && (
                        <div className={`w-8 h-8 rounded-full ${getRatingColor(rating)} 
                          flex items-center justify-center text-sm font-bold text-white`}>
                          {rating.toFixed(1)}
                        </div>
                      )}
                      
                      <span className="text-lg">{player.number}</span>
                      
                      <div>
                        <div className="font-medium">{player.name}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Add goal icon */}
                      {goalsScored > 0 && (
                        <div className="text-sm bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                          ⚽
                        </div>
                      )}
                      {subIn && (
                        <div className="text-green-600 text-sm bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                          ↑
                        </div>
                      )}
                      {subOut && (
                        <div className="text-red-600 text-sm bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                          ↓
                        </div>
                      )}
                      <div className="text-sm">
                        {subIn && `${subIn}'`}
                        {subOut && `${subOut}'`}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Benched Players Section */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Bench (Benket)</h3>
          <div className="space-y-2">
            {benchedPlayers.map(({ player }) => {
              const playerStat = playerStats
                .find(teamStats => teamStats.team.id === team.team.id)?.players
                .find(p => p.player.id === player.id);
              
              return (
                <Link 
                  href={`/spillerprofil/${player.id}`} 
                  key={player.id} 
                  className="block"
                >
                  <div className="flex items-center gap-3 bg-white hover:bg-gray-50 transition-colors rounded-lg p-3 shadow-sm">
                    <div className="flex items-center gap-3 flex-1">
                      <img 
                        src={getPlayerPhotoUrl(player.id)}
                        alt={player.name}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/default-player.png';
                        }}
                      />
                      
                      <span className="text-lg">{player.number}</span>
                      
                      <div>
                        <div className="font-medium">{player.name}</div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Home Team */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">{lineups[0].team.name}</h2>
        {renderTeamFormation(lineups[0], true)}
        {renderTeamList(lineups[0])}
      </div>

      {/* Away Team */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">{lineups[1].team.name}</h2>
        {renderTeamFormation(lineups[1], false)}
        {renderTeamList(lineups[1])}
      </div>
    </div>
  );
} 