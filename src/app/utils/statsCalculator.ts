interface Fixture {
  teams: {
    home: {
      id: number;
      winner: boolean | null;
    };
    away: {
      id: number;
      winner: boolean | null;
    };
  };
  goals: {
    home: number;
    away: number;
  };
  score: {
    halftime: {
      home: number;
      away: number;
    };
  };
}

export function calculateTeamStats(teamData: any) {
  const pastFixtures = teamData.fixtures?.past || [];
  const teamId = teamData.team.team.id;

  const defaultMinuteData = {
    '0-15': { total: 0, percentage: '0%' },
    '16-30': { total: 0, percentage: '0%' },
    '31-45': { total: 0, percentage: '0%' },
    '46-60': { total: 0, percentage: '0%' },
    '61-75': { total: 0, percentage: '0%' },
    '76-90': { total: 0, percentage: '0%' },
    '91-105': { total: 0, percentage: '0%' },
    '106-120': { total: 0, percentage: '0%' }
  };

  const stats = {
    fixtures: {
      played: { total: 0, home: 0, away: 0 },
      wins: { total: 0, home: 0, away: 0 },
      draws: { total: 0, home: 0, away: 0 },
      loses: { total: 0, home: 0, away: 0 }
    },
    goals: {
      for: { 
        total: { total: 0, home: 0, away: 0 },
        minute: { ...defaultMinuteData }
      },
      against: { 
        total: { total: 0, home: 0, away: 0 },
        minute: { ...defaultMinuteData }
      }
    },
    clean_sheet: { total: 0, home: 0, away: 0 }
  };

  pastFixtures.forEach((fixture: Fixture) => {
    const isHome = fixture.teams.home.id === teamId;
    const location = isHome ? 'home' : 'away';
    
    // Count matches played
    stats.fixtures.played.total++;
    stats.fixtures.played[location]++;

    // Get goals
    const goalsFor = isHome ? fixture.goals.home : fixture.goals.away;
    const goalsAgainst = isHome ? fixture.goals.away : fixture.goals.home;

    // Update goals
    stats.goals.for.total.total += goalsFor;
    stats.goals.for.total[location] += goalsFor;
    stats.goals.against.total.total += goalsAgainst;
    stats.goals.against.total[location] += goalsAgainst;

    // Update match results
    if (fixture.teams[location].winner === true) {
      stats.fixtures.wins.total++;
      stats.fixtures.wins[location]++;
    } else if (fixture.teams[location].winner === false) {
      stats.fixtures.loses.total++;
      stats.fixtures.loses[location]++;
    } else {
      stats.fixtures.draws.total++;
      stats.fixtures.draws[location]++;
    }

    // Update clean sheets
    if (goalsAgainst === 0) {
      stats.clean_sheet.total++;
      stats.clean_sheet[location]++;
    }
  });

  return stats;
} 