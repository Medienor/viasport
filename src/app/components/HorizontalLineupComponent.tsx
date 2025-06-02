'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

// --- Copied Interfaces ---
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
  lineups: TeamLineup[]; // Use the specific type
  playerStats: any[]; // Keep any for flexibility if structure varies
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
    team: { // Ensure team ID is available in event data
        id: number;
    };
  }>;
}

interface PlayerStatistics {
  rating: number;
  // ... other statistics
}

// --- Copied Helper Functions ---
const createTeamSlug = (teamName: string, teamId: number) => {
  return `${teamName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${teamId}`;
};

const getRatingColor = (rating: number) => {
  if (rating >= 8) return 'bg-green-500';
  if (rating >= 7) return 'bg-green-400';
  if (rating >= 6) return 'bg-yellow-500';
  return 'bg-red-500';
};

const getPlayerPhotoUrl = (playerId: number) => {
  return `https://viasport.b-cdn.net/football/players/${playerId}.png`;
};

const getPlayerSubstitutionTime = (playerId: number, eventData?: LineupComponentProps['eventData']): { subIn?: number; subOut?: number } => {
    if (!eventData) return {};

    const substitutions = eventData.filter(event => event.type === 'subst');

    // Find sub-out event where the player *leaving* is the playerId
    const subOutEvent = substitutions.find(event => event.player.id === playerId);
    const subOut = subOutEvent?.time.elapsed;

    // Find sub-in event where the player *entering* (assist field in API) is the playerId
    const subInEvent = substitutions.find(event => event.assist.id === playerId);
    const subIn = subInEvent?.time.elapsed;

    return { subIn, subOut };
};


const getPlayerCard = (playerId: number, eventData?: LineupComponentProps['eventData']): 'yellow' | 'red' | null => {
  if (!eventData) return null;

  const cardEvent = eventData.find(event =>
    event.type === 'Card' &&
    event.player.id === playerId
  );

  if (!cardEvent) return null;
  return cardEvent.detail === 'Yellow Card' ? 'yellow' : 'red';
};

// Add this custom hook at the top with other imports
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

// Add the new vertical position function
const getVerticalGridPosition = (grid: string, isHome: boolean, startXI: Array<{ player: Player }>) => {
    if (!grid) return { top: '50%', left: '50%' };

    const [row, position] = grid.split(':').map(Number);
    
    // Calculate how many players are in this row
    const playersInRow = startXI.filter(p => p.player.grid?.startsWith(`${row}:`)).length;
    
    // Horizontal position (side to side)
    const horizontalPadding = 15;
    const usableWidth = 100 - (2 * horizontalPadding);
    
    // Special handling for 2-player rows - keep them more central
    const leftPercentage = playersInRow === 1 
        ? 50  // Center single players
        : playersInRow === 2
            ? 35 + (position - 1) * 30  // More central positioning for 2-player rows
            : horizontalPadding + ((position - 1) * (usableWidth / (playersInRow - 1)));

    let topPercentage;
    if (isHome) {
        switch (row) {
            case 1: // Goalkeeper
                topPercentage = 95;
                break;
            case 2: // Defense line
                topPercentage = 85;
                break;
            case 3: // Defensive Mid line
                topPercentage = 75;
                break;
            case 4: // Attacking Mid line
                topPercentage = 65;
                break;
            case 5: // Striker line
                topPercentage = 55;
                break;
            default:
                topPercentage = 50;
        }
    } else {
        switch (row) {
            case 1: // Goalkeeper
                topPercentage = 5;
                break;
            case 2: // Defense line
                topPercentage = 15;
                break;
            case 3: // Defensive Mid line
                topPercentage = 25;
                break;
            case 4: // Attacking Mid line
                topPercentage = 35;
                break;
            case 5: // Striker line
                topPercentage = 45;
                break;
            default:
                topPercentage = 50;
        }
    }

    return {
        top: `${topPercentage}%`,
        left: `${leftPercentage}%`,
    };
};

// --- Main Horizontal Lineup Component ---
export default function HorizontalLineupComponent({ lineups, playerStats = [], eventData }: LineupComponentProps) {
  const [flippedCards, setFlippedCards] = useState<{ [key: string]: boolean }>({});
  const [isExpanded, setIsExpanded] = useState(false);
  const isMobile = useIsMobile();

  // Add early validation for lineups
  if (!lineups || !Array.isArray(lineups) || lineups.length < 2) {
    console.warn('HorizontalLineupComponent: Invalid lineups data', lineups);
    return (
      <div className="bg-white dark:bg-[#181818] rounded-lg border border-[#f3f4f6] dark:border-[#232323] p-6">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p>Lagoppstilling ikke tilgjengelig</p>
        </div>
      </div>
    );
  }

  // Validate that both teams have required data
  const homeTeam = lineups[0];
  const awayTeam = lineups[1];

  if (!homeTeam?.team || !awayTeam?.team || !homeTeam?.startXI || !awayTeam?.startXI) {
    console.warn('HorizontalLineupComponent: Missing team or startXI data', { homeTeam, awayTeam });
    return (
      <div className="bg-white dark:bg-[#181818] rounded-lg border border-[#f3f4f6] dark:border-[#232323] p-6">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p>Lagoppstilling ikke komplett</p>
        </div>
      </div>
    );
  }

  // Calculate highest rating for each team safely (copied & adapted)
  const teamHighestRatings = lineups.reduce((acc: { [key: number]: number }, team: TeamLineup) => {
    const startXI = Array.isArray(team.startXI) ? team.startXI : [];
    const substitutes = Array.isArray(team.substitutes) ? team.substitutes : [];
    const allPlayers = [...startXI, ...substitutes];
    const ratings = allPlayers.map(({ player }) => {
      const teamStats = playerStats?.find(ts => ts.team.id === team.team.id);
      const playerStat = teamStats?.players?.find((p: any) => p.player.id === player.id);
      return parseFloat(playerStat?.statistics?.[0]?.games?.rating || '0');
    });
    acc[team.team.id] = ratings.length > 0 ? Math.max(...ratings.filter(r => !isNaN(r))) : 0; // Added filter for NaN
    return acc;
  }, {});

  // --- NEW getGridPosition for Horizontal Layout ---
  const getGridPosition = (grid: string, isHome: boolean, startXI: Array<{ player: Player }>) => {
    if (!grid) return { top: '50%', left: '50%' };

    const [row, position] = grid.split(':').map(Number);
    
    // Calculate how many players are in this row
    const playersInRow = startXI.filter(p => p.player.grid?.startsWith(`${row}:`)).length;
    
    // Vertical position (left to right within row)
    const verticalPadding = 15;
    const usableHeight = 100 - (2 * verticalPadding);
    
    // Special handling for 2-player rows - keep them more central
    const topPercentage = playersInRow === 1 
        ? 50  // Center single players
        : playersInRow === 2
            ? 35 + (position - 1) * 30  // More central positioning for 2-player rows (35% to 65%)
            : verticalPadding + ((position - 1) * (usableHeight / (playersInRow - 1)));

    // Horizontal position (back to front)
    const horizontalPadding = 8;
    const fieldWidth = 38;
    
    let leftPercentage;
    if (isHome) {
        if (row === 1) {
            leftPercentage = horizontalPadding;  // Goalkeeper
        } else {
            leftPercentage = horizontalPadding + ((row - 1) * (fieldWidth / 4));
        }
    } else {
        if (row === 1) {
            leftPercentage = 100 - horizontalPadding;  // Goalkeeper
        } else {
            leftPercentage = 100 - (horizontalPadding + ((row - 1) * (fieldWidth / 4)));
        }
    }

    return {
        top: `${topPercentage}%`,
        left: `${leftPercentage}%`,
    };
  };

  // --- renderPlayerCard (Mostly Copied, check styles) ---
  const renderPlayerCard = (player: Player, position: any, team: TeamLineup, substituteInfo?: { subTime: number, otherPlayer: Player }) => {
    const playerStat = playerStats
      ?.find(teamStats => teamStats.team.id === team.team.id)?.players
      ?.find((p: any) => p.player.id === player.id);

    const rating = parseFloat(playerStat?.statistics?.[0]?.games?.rating || '0');
    const isHighestRated = teamHighestRatings[team.team.id] !== undefined && rating > 0 && rating === teamHighestRatings[team.team.id];
    const goalsScored = playerStat?.statistics?.[0]?.goals?.total || 0;
    const cardKey = `${team.team.id}-${player.id}-${substituteInfo?.otherPlayer?.id || 'sub'}`; // Ensure unique key per team/player/sub
    const isFlipped = flippedCards[cardKey];
    const playerCard = getPlayerCard(player.id, eventData);

    // Get substitute stats if applicable
    const substituteStats = substituteInfo ? playerStats
      ?.find(teamStats => teamStats.team.id === team.team.id)?.players
      ?.find((p: any) => p.player.id === substituteInfo.otherPlayer.id) : null;
    const substituteRating = parseFloat(substituteStats?.statistics?.[0]?.games?.rating || '0');
    const substituteGoals = substituteStats?.statistics?.[0]?.goals?.total || 0;
    const substituteCard = substituteInfo ? getPlayerCard(substituteInfo.otherPlayer.id, eventData) : null;

    // Determine which player's data to show initially (non-flipped state)
    const displayPlayer = isFlipped ? substituteInfo?.otherPlayer : player;
    const displayRating = isFlipped ? substituteRating : rating;
    const displayGoals = isFlipped ? substituteGoals : goalsScored;
    const displayCard = isFlipped ? substituteCard : playerCard;
    const displaySubTime = isFlipped ? substituteInfo?.subTime : getPlayerSubstitutionTime(player.id, eventData).subOut;
    const displaySubArrow = isFlipped ? '↑' : '↓'; // Arrow indicates action for the *displayed* player

    // Only render the card if we have a player to display
    if (!displayPlayer) return null;

    return (
      <div
        className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
        style={position}
        onClick={substituteInfo ? () => { // Only allow flipping if there's a substitute
            setFlippedCards(prev => ({
              ...prev,
              [cardKey]: !prev[cardKey]
            }));
          } : undefined} // No onClick if not substitutable
      >
        <div className="relative w-full flex flex-col items-center">
          {/* Player Image Container */}
          <div className="relative">
            <div className={`
              w-8 h-8 sm:w-8 sm:h-8 md:w-10 md:h-10 
              rounded-full 
              bg-white/90 
              overflow-hidden 
              border-[1px] 
              ${substituteInfo ? 'border-blue-400 group-hover:border-blue-500' : 'border-white'} 
              transition-all 
              duration-200 
              shadow-lg 
              hover:scale-110
              group-hover:shadow-xl
            `}>
              <img
                src={getPlayerPhotoUrl(displayPlayer.id)}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>

            {/* Rating Badge - keep in bottom right */}
            {displayRating > 0 && (
              <div className="absolute -bottom-1 -right-1 flex items-center z-10">
                <div className={`
                  w-4 h-4 sm:w-5 sm:h-5 
                  rounded-full 
                  ${getRatingColor(displayRating)} 
                  flex items-center justify-center 
                  text-[8px] sm:text-[10px] font-bold 
                  text-white 
                  shadow-lg
                  border border-white
                `}>
                  {displayRating.toFixed(1)}
                </div>
              </div>
            )}

            {/* Highest Rated Star - moved to top right */}
            {(isHighestRated && !isFlipped) && (
              <div className="absolute -top-1 -right-1 z-10">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full flex items-center justify-center">
                  <span className="text-yellow-400 text-[8px] sm:text-[10px]">★</span>
                </div>
              </div>
            )}

            {/* Substitution Time/Arrow */}
            {substituteInfo && displaySubTime && (
              <div className={`
                absolute -top-1 ${isFlipped ? '-left-3' : '-left-3'} 
                text-[7px] sm:text-[8px] 
                font-medium px-1 py-0.5 rounded 
                ${isFlipped ? 'bg-green-600/80' : 'bg-red-600/80'} 
                text-white shadow z-10
              `}>
                {displaySubTime}'{displaySubArrow}
              </div>
            )}

            {/* Goal Icon - moved to bottom left */}
            {displayGoals > 0 && (
              <div className="absolute -bottom-1 -left-1 flex items-center justify-center z-10">
                <div className="bg-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[8px] sm:text-[10px] shadow-sm border border-white">
                  <img 
                    src="/images/channels/ball.svg" 
                    alt="Goal"
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3"
                  />
                  {displayGoals > 1 && <span className="ml-0.5 font-bold text-[8px]">{displayGoals}</span>}
                </div>
              </div>
            )}

            {/* Card Icon - adjust if needed based on goal icon */}
            {displayCard && (
              <div className={`absolute -top-1 -left-1 bg-white rounded-full w-3 h-3 sm:w-3.5 sm:h-3.5 flex items-center justify-center shadow-md z-10 border border-white`}>
                <div className={`w-1 h-2 sm:w-1.5 sm:h-2.5 rounded-sm ${displayCard === 'yellow' ? 'bg-yellow-400' : 'bg-red-600'}`}></div>
              </div>
            )}
          </div>

          {/* Player Name */}
          <span className="
            text-white 
            text-[8px] sm:text-[9px] md:text-[10px]
            font-medium 
            whitespace-nowrap 
            px-1
            mt-1
          ">
            <span className="font-bold">{displayPlayer.number}</span> {displayPlayer.name.split(' ').pop()}
          </span>
        </div>
      </div>
    );
  };


  // --- Render the Horizontal Formation ---
  const renderHorizontalFormation = (homeTeam: TeamLineup, awayTeam: TeamLineup) => {
    // Calculate average ratings
    const calculateAverageRating = (team: TeamLineup) => {
      const startXI = Array.isArray(team.startXI) ? team.startXI : [];
      // Include substitutes who played if eventData is available
      const playedSubIds = new Set(
          eventData?.filter(e => e.type === 'subst' && e.team.id === team.team.id).map(e => e.assist.id) ?? []
      );
      const relevantPlayers = [...startXI, ...(Array.isArray(team.substitutes) ? team.substitutes : [])]
          .filter(({ player }, index, self) =>
              // Keep starting XI OR played substitutes
              (startXI.some(p => p.player.id === player.id) || playedSubIds.has(player.id)) &&
              // Deduplicate
              index === self.findIndex(p => p.player.id === player.id)
          );

      const playerRatings = relevantPlayers
        .map(({ player }) => {
          const teamStats = playerStats?.find(ts => ts.team.id === team.team.id);
          const playerStat = teamStats?.players?.find((p: any) => p.player.id === player.id);
          return parseFloat(playerStat?.statistics?.[0]?.games?.rating || '0');
        })
        .filter(rating => rating > 0 && !isNaN(rating)); // Only include valid, positive ratings

      return playerRatings.length > 0
        ? (playerRatings.reduce((sum, rating) => sum + rating, 0) / playerRatings.length)
        : null; // Return null if no ratings
    };

    const homeAvgRating = calculateAverageRating(homeTeam);
    const awayAvgRating = calculateAverageRating(awayTeam);

    const homeStartXI = Array.isArray(homeTeam.startXI) ? homeTeam.startXI : [];
    const awayStartXI = Array.isArray(awayTeam.startXI) ? awayTeam.startXI : [];

    return (
      <div className="bg-white shadow overflow-hidden rounded-t-lg">
        {/* Team Headers */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 p-2 sm:p-3 bg-[#018b57] text-white">
          {/* Home Team Header */}
          <div className="flex items-center gap-2 sm:gap-3 justify-start">
            {homeAvgRating !== null && (
              <div className={`flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full ${getRatingColor(homeAvgRating)}
                flex items-center justify-center text-[10px] sm:text-xs font-bold text-white`}>
                {homeAvgRating.toFixed(1)}
              </div>
            )}
            <img
              src={homeTeam.team.logo}
              alt={`${homeTeam.team.name} logo`}
              className="w-6 h-6 sm:w-8 sm:h-8 object-contain flex-shrink-0"
            />
            <div className="min-w-0">
              <Link
                href={`/lag/${createTeamSlug(homeTeam.team.name, homeTeam.team.id)}`}
                className="hover:opacity-80 transition-opacity"
              >
                <h2 className="font-semibold text-xs sm:text-sm truncate" title={homeTeam.team.name}>{homeTeam.team.name}</h2>
              </Link>
              <p className="text-[10px] sm:text-xs text-white/80">{homeTeam.formation}</p>
            </div>
          </div>

          {/* Center - VS text only on mobile */}
          <div className="text-center text-xs font-semibold sm:hidden">VS</div>
          {/* Empty div for desktop to maintain grid */}
          <div className="hidden sm:block" />

          {/* Away Team Header */}
          <div className="flex items-center gap-2 sm:gap-3 justify-end text-right">
            <div className="min-w-0">
              <Link
                href={`/lag/${createTeamSlug(awayTeam.team.name, awayTeam.team.id)}`}
                className="hover:opacity-80 transition-opacity"
              >
                <h2 className="font-semibold text-xs sm:text-sm truncate" title={awayTeam.team.name}>{awayTeam.team.name}</h2>
              </Link>
              <p className="text-[10px] sm:text-xs text-white/80">{awayTeam.formation}</p>
            </div>
            <img
              src={awayTeam.team.logo}
              alt={`${awayTeam.team.name} logo`}
              className="w-6 h-6 sm:w-8 sm:h-8 object-contain flex-shrink-0"
            />
            {awayAvgRating !== null && (
              <div className={`flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full ${getRatingColor(awayAvgRating)}
                flex items-center justify-center text-[10px] sm:text-xs font-bold text-white`}>
                {awayAvgRating.toFixed(1)}
              </div>
            )}
          </div>
        </div>

        {/* Updated Soccer Field Container */}
        <div className={`
          relative 
          ${isMobile 
            ? 'aspect-[9/16] sm:aspect-[10/16]' // Vertical aspect ratio for mobile
            : 'aspect-[16/10] sm:aspect-[16/9] md:aspect-[16/8]' // Horizontal aspect ratio for desktop
          }
          bg-gradient-to-b from-[#01935c] to-[#017a4d] 
          overflow-hidden
        `}>
          {/* Field Markings */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Conditional field markings based on orientation */}
            {isMobile ? (
              <>
                {/* Vertical field stripes */}
                <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_40px,rgba(255,255,255,0.03)_40px,rgba(255,255,255,0.03)_80px)]" />
                
                {/* Center line */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-white/30" />
                
                {/* Center circle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30%] h-auto aspect-square border-[2px] border-white/30 rounded-full" />
                
                {/* Top (away) penalty box */}
                <div className="absolute left-[20%] right-[20%] top-0 h-[15%] border-[2px] border-white/30 rounded-b-xl">
                  {/* Top goal box */}
                  <div className="absolute left-[35%] right-[35%] top-0 h-[40%] border-[2px] border-white/30 rounded-b-lg" />
                </div>
                
                {/* Bottom (home) penalty box */}
                <div className="absolute left-[20%] right-[20%] bottom-0 h-[15%] border-[2px] border-white/30 rounded-t-xl">
                  {/* Bottom goal box */}
                  <div className="absolute left-[35%] right-[35%] bottom-0 h-[40%] border-[2px] border-white/30 rounded-t-lg" />
                </div>

                {/* Goals */}
                <div className="absolute left-[40%] right-[40%] top-0 h-[1%] border-[2px] border-white/30" />
                <div className="absolute left-[40%] right-[40%] bottom-0 h-[1%] border-[2px] border-white/30" />
              </>
            ) : (
              <>
                {/* Field stripes */}
                <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_40px,rgba(255,255,255,0.03)_40px,rgba(255,255,255,0.03)_80px)]" />
                
                {/* Center line */}
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-white/30" />
                
                {/* Center circle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[15%] h-auto aspect-square border-[2px] border-white/30 rounded-full" />
                
                {/* Left (home) penalty box */}
                <div className="absolute top-[20%] bottom-[20%] left-0 w-[15%] border-[2px] border-white/30 rounded-r-xl">
                    {/* Left goal box */}
                    <div className="absolute top-[35%] bottom-[35%] left-0 w-[40%] border-[2px] border-white/30 rounded-r-lg" />
                </div>
                
                {/* Right (away) penalty box */}
                <div className="absolute top-[20%] bottom-[20%] right-0 w-[15%] border-[2px] border-white/30 rounded-l-xl">
                    {/* Right goal box */}
                    <div className="absolute top-[35%] bottom-[35%] right-0 w-[40%] border-[2px] border-white/30 rounded-l-lg" />
                </div>

                {/* Goals */}
                <div className="absolute top-[40%] bottom-[40%] left-0 w-[1%] border-[2px] border-white/30" />
                <div className="absolute top-[40%] bottom-[40%] right-0 w-[1%] border-[2px] border-white/30" />
              </>
            )}
          </div>

          {/* Players */}
          {lineups.map((team, teamIndex) => {
            const isHome = teamIndex === 0;
            
            // Add safety check for team.startXI
            if (!team?.startXI || !Array.isArray(team.startXI)) {
              console.warn(`Team ${teamIndex} missing startXI data:`, team);
              return null;
            }

            return team.startXI.map(({ player }) => {
              if (!player?.grid) return null;
              
              // Get position based on layout
              const position = isMobile
                ? getVerticalGridPosition(player.grid, isHome, team.startXI)
                : getGridPosition(player.grid, isHome, team.startXI);

              const { subOut } = getPlayerSubstitutionTime(player.id, eventData);
              const substituteEvent = subOut 
                ? eventData?.find(e => e.type === 'subst' && e.player.id === player.id && e.time.elapsed === subOut) 
                : undefined;
              const substitutePlayer = substituteEvent 
                ? team.substitutes?.find(sub => sub.player.id === substituteEvent.assist.id)?.player 
                : undefined;

              return (
                <div key={`${teamIndex}-${player.id}`} style={{ zIndex: 10 }}>
                  {renderPlayerCard(
                    player,
                    position,
                    team,
                    substitutePlayer && subOut ? { subTime: subOut, otherPlayer: substitutePlayer } : undefined
                  )}
                </div>
              );
            });
          })}
        </div>
      </div>
    );
  };

  // --- renderTeamList (Adjusted for smaller elements, added Coach heading) ---
  const renderTeamList = (team: TeamLineup) => {
    const substitutes = Array.isArray(team.substitutes) ? team.substitutes : [];

    // Separate players into substitutes (those who played) and benched (those who didn't)
    const playedSubstitutes = substitutes.filter(({ player }) => {
        const { subIn } = getPlayerSubstitutionTime(player.id, eventData);
        return subIn !== undefined;
    }).sort((a, b) => {
        const timeA = getPlayerSubstitutionTime(a.player.id, eventData).subIn ?? 999;
        const timeB = getPlayerSubstitutionTime(b.player.id, eventData).subIn ?? 999;
        return timeA - timeB;
    });

    const benchedPlayers = substitutes.filter(({ player }) => {
        const { subIn } = getPlayerSubstitutionTime(player.id, eventData);
        return subIn === undefined;
    });

    return (
        <div className="space-y-2">
            {/* Played Substitutes Section */}
            {playedSubstitutes.length > 0 && (
                <div>
                    {playedSubstitutes.map(({ player }, index) => {
                        const teamStats = playerStats?.find(ts => ts.team.id === team.team.id);
                        const playerStat = teamStats?.players?.find((p: any) => p.player.id === player.id);
                        const rating = parseFloat(playerStat?.statistics?.[0]?.games?.rating || '0');
                        const goalsScored = playerStat?.statistics?.[0]?.goals?.total || 0;
                        const { subIn, subOut } = getPlayerSubstitutionTime(player.id, eventData);
                        const playerCard = getPlayerCard(player.id, eventData);

                        return (
                            <Link
                                href={`/spillerprofil/${player.id}`}
                                key={`sub-${player.id}`}
                                className="block hover:bg-gray-50 dark:hover:bg-transparent transition-colors border-b border-[#f3f4f6] dark:border-[#232323]"
                            >
                                <div className="flex items-center gap-2 p-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className="relative">
                                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0 bg-gray-200 overflow-hidden border border-[#f3f4f6] dark:border-[#232323]">
                                                <img
                                                    src={getPlayerPhotoUrl(player.id)}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            </div>
                                            {rating > 0 && (
                                                <div className="absolute -bottom-1 -right-1 flex items-center">
                                                    <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full ${getRatingColor(rating)} 
                                                        flex items-center justify-center text-[8px] sm:text-[10px] font-bold text-white border border-white dark:border-[#232323]`}>
                                                        {rating.toFixed(1)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 w-5 text-center flex-shrink-0">{player.number}</span>
                                        <div className="min-w-0">
                                            <div className="font-medium text-xs sm:text-sm truncate text-gray-800 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-gray-100" title={player.name}>
                                                {player.name}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        {playerCard && (
                                            <div className="bg-white dark:bg-[#2c2c2c] rounded-full w-5 h-5 flex items-center justify-center shadow-sm" title={playerCard.type === 'Yellow Card' ? 'Gult Kort' : 'Rødt Kort'}>
                                                <div className={`w-2.5 h-3.5 rounded-sm ${playerCard.type === 'Yellow Card' ? 'bg-yellow-400' : 'bg-red-500'}`}></div>
                                            </div>
                                        )}
                                        {goalsScored > 0 && (
                                            <div className="bg-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-sm" title={`Mål (${goalsScored})`}>
                                                <img 
                                                    src="/images/channels/ball.svg" 
                                                    alt="Goal"
                                                    className="w-3 h-3"
                                                />
                                                {goalsScored > 1 && <span className="ml-0.5 font-bold text-[9px]">{goalsScored}</span>}
                                            </div>
                                        )}
                                        {subIn !== undefined && (
                                            <div className="flex items-center gap-1 text-green-600 text-[11px] sm:text-xs font-medium bg-white border border-gray-200 rounded-full px-1.5 py-0.5" title={`Innbyttet ${subIn}'`}>
                                                ↑<span className="hidden sm:inline">{subIn}'</span>
                                            </div>
                                        )}
                                        {subOut !== undefined && (
                                            <div className="flex items-center gap-1 text-red-600 text-[11px] sm:text-xs font-medium bg-white dark:bg-[#2c2c2c] border border-gray-200 dark:border-[#232323] rounded-full px-1.5 py-0.5" title={`Utbyttet ${subOut}'`}>
                                                ↓<span className="hidden sm:inline">{subOut}'</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Benched Players Section */}
            {benchedPlayers.length > 0 && (
                <div>
                    {benchedPlayers.map(({ player }, index) => {
                        const teamStats = playerStats?.find(ts => ts.team.id === team.team.id);
                        const playerStat = teamStats?.players?.find((p: any) => p.player.id === player.id);
                        const rating = parseFloat(playerStat?.statistics?.[0]?.games?.rating || '0');
                        const goalsScored = playerStat?.statistics?.[0]?.goals?.total || 0;
                        const { subIn, subOut } = getPlayerSubstitutionTime(player.id, eventData);
                        const playerCard = getPlayerCard(player.id, eventData);

                        return (
                            <Link
                                href={`/spillerprofil/${player.id}`}
                                key={`bench-${player.id}`}
                                className="block hover:bg-gray-50 dark:hover:bg-transparent transition-colors border-b border-[#f3f4f6] dark:border-[#232323]"
                            >
                                <div className="flex items-center gap-2 p-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className="relative">
                                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0 bg-gray-200 overflow-hidden border border-[#f3f4f6] dark:border-[#232323]">
                                                <img
                                                    src={getPlayerPhotoUrl(player.id)}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            </div>
                                            {rating > 0 && (
                                                <div className="absolute -bottom-1 -right-1 flex items-center">
                                                    <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full ${getRatingColor(rating)} 
                                                        flex items-center justify-center text-[8px] sm:text-[10px] font-bold text-white border border-white dark:border-[#232323]`}>
                                                        {rating.toFixed(1)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 w-5 text-center flex-shrink-0">{player.number}</span>
                                        <div className="min-w-0">
                                            <div className="font-medium text-xs sm:text-sm truncate text-gray-800 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-gray-100" title={player.name}>
                                                {player.name}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        {playerCard && (
                                            <div className="bg-white dark:bg-[#2c2c2c] rounded-full w-5 h-5 flex items-center justify-center shadow-sm" title="Rødt Kort">
                                                <div className="w-2.5 h-3.5 rounded-sm bg-red-500"></div>
                                            </div>
                                        )}
                                        {goalsScored > 0 && (
                                            <div className="bg-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-sm" title={`Mål (${goalsScored})`}>
                                                <img 
                                                    src="/images/channels/ball.svg" 
                                                    alt="Goal"
                                                    className="w-3 h-3"
                                                />
                                                {goalsScored > 1 && <span className="ml-0.5 font-bold text-[9px]">{goalsScored}</span>}
                                            </div>
                                        )}
                                        {subIn !== undefined && (
                                            <div className="flex items-center gap-1 text-green-600 text-[11px] sm:text-xs font-medium bg-white border border-gray-200 rounded-full px-1.5 py-0.5" title={`Innbyttet ${subIn}'`}>
                                                ↑<span className="hidden sm:inline">{subIn}'</span>
                                            </div>
                                        )}
                                        {subOut !== undefined && (
                                            <div className="flex items-center gap-1 text-red-600 text-[11px] sm:text-xs font-medium bg-white dark:bg-[#2c2c2c] border border-gray-200 dark:border-[#232323] rounded-full px-1.5 py-0.5" title={`Utbyttet ${subOut}'`}>
                                                ↓<span className="hidden sm:inline">{subOut}'</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
  };

  // Component Return with additional safety checks
  return (
    <div className="space-y-0">
      {/* Only render if we have valid data */}
      {homeTeam && awayTeam ? (
        <>
          {/* Render the combined horizontal formation */}
          {renderHorizontalFormation(homeTeam, awayTeam)}

          {/* Substitutes Section */}
          <div className="bg-white dark:bg-[#181818] rounded-b-lg border border-[#f3f4f6] dark:border-[#232323]">
            {/* Mobile/Tablet Toggle Header */}
            <div 
              className="md:hidden cursor-pointer border-b border-[#f3f4f6] dark:border-[#232323]"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <div className="flex items-center justify-between px-4 py-4">
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300">Innbyttere og Trenere</h4>
                <ChevronDownIcon 
                  className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
                    isExpanded ? 'transform rotate-180' : ''
                  }`}
                />
              </div>
            </div>

            {/* Desktop Header */}
            <div className="hidden md:block text-center py-4 border-b border-[#f3f4f6] dark:border-[#232323]">
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300">Innbyttere</h4>
            </div>

            {/* Content that collapses on mobile */}
            <div className={`${!isExpanded ? 'hidden md:block' : 'block'}`}>
              {/* Grid for both teams */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 md:gap-x-8 gap-y-4 px-3 sm:px-4 py-4">
                {/* Home Team Section */}
                <div>
                  {/* Coach */}
                  {homeTeam.coach && (
                    <>
                      <div className="text-center mb-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Trener</span>
                      </div>
                      <Link
                        href="#"
                        className="block border-b border-[#f3f4f6] dark:border-[#232323]"
                      >
                        <div className="flex items-center gap-2 p-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0 bg-gray-200 overflow-hidden border border-[#f3f4f6] dark:border-[#232323]">
                              <img
                                src={homeTeam.coach.photo || '/default-coach.png'}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-xs sm:text-sm truncate text-gray-800 dark:text-gray-200">
                                {homeTeam.coach.name}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </>
                  )}
                  
                  {/* Players */}
                  <div className="mt-4">
                    {renderTeamList(homeTeam)}
                  </div>
                </div>

                {/* Away Team Section */}
                <div>
                  {/* Coach */}
                  {awayTeam.coach && (
                    <>
                      <div className="text-center mb-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Trener</span>
                      </div>
                      <Link
                        href="#"
                        className="block border-b border-[#f3f4f6] dark:border-[#232323]"
                      >
                        <div className="flex items-center gap-2 p-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0 bg-gray-200 overflow-hidden border border-[#f3f4f6] dark:border-[#232323]">
                              <img
                                src={awayTeam.coach.photo || '/default-coach.png'}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-xs sm:text-sm truncate text-gray-800 dark:text-gray-200">
                                {awayTeam.coach.name}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </>
                  )}
                  
                  {/* Players */}
                  <div className="mt-4">
                    {renderTeamList(awayTeam)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-[#181818] rounded-lg border border-[#f3f4f6] dark:border-[#232323] p-6">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <p>Kunne ikke laste lagoppstilling</p>
          </div>
        </div>
      )}
    </div>
  );
} 