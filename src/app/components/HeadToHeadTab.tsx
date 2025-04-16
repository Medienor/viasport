'use client';

import HeadToHeadFixtures from './HeadToHeadFixtures';

interface HeadToHeadTabProps {
  match: any;
  teamColors: {
    home: string;
    away: string;
  };
}

// Add the helper function
const isLightColor = (color: string): boolean => {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate relative luminance using WCAG formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.55;
};

export default function HeadToHeadTab({ match, teamColors }: HeadToHeadTabProps) {
  if (!match.head_to_head || match.head_to_head.length === 0) {
    return (
      <div className="text-gray-500 italic">
        Ingen tidligere oppgjør funnet mellom lagene.
      </div>
    );
  }

  // Calculate head to head stats
  const h2hStats = match.head_to_head.reduce((stats: any, game: any) => {
    const homeTeamId = match.teams.home.id;
    if (game.teams.home.id === homeTeamId && game.goals.home > game.goals.away) {
      stats.homeWins++;
    } else if (game.teams.away.id === homeTeamId && game.goals.away > game.goals.home) {
      stats.homeWins++;
    } else if (game.goals.home === game.goals.away) {
      stats.draws++;
    } else {
      stats.awayWins++;
    }
    return stats;
  }, { homeWins: 0, draws: 0, awayWins: 0 });

  return (
    <div className="bg-white rounded-lg">
      <div className="flex justify-center gap-20 mb-8">
        <div className="text-center">
          <img
            src={match.teams.home.logo}
            alt={match.teams.home.name}
            className="w-16 h-16 mx-auto mb-4 object-contain"
          />
          <div 
            className="text-2xl font-bold rounded-[50px] px-6 py-2"
            style={{ 
              backgroundColor: teamColors.home,
              color: isLightColor(teamColors.home) ? '#000' : '#fff'
            }}
          >
            {h2hStats.homeWins}
          </div>
          <div className="mt-2 text-sm">Seier</div>
        </div>

        <div className="text-center">
          <div className="w-16 h-16 mb-4"></div>
          <div className="bg-white border border-gray-200 text-2xl font-bold rounded-[50px] px-6 py-2">
            {h2hStats.draws}
          </div>
          <div className="mt-2 text-sm">Uavgjort</div>
        </div>

        <div className="text-center">
          <img
            src={match.teams.away.logo}
            alt={match.teams.away.name}
            className="w-16 h-16 mx-auto mb-4 object-contain"
          />
          <div 
            className="text-2xl font-bold rounded-[50px] px-6 py-2"
            style={{ 
              backgroundColor: teamColors.away,
              color: isLightColor(teamColors.away) ? '#000' : '#fff'
            }}
          >
            {h2hStats.awayWins}
          </div>
          <div className="mt-2 text-sm">Seier</div>
        </div>
      </div>

      <HeadToHeadFixtures matches={match.head_to_head} />
    </div>
  );
} 