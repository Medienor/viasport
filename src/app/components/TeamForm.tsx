import React from 'react';
import Link from 'next/link';

interface Fixture {
  id: number;
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

interface TeamFormProps {
  homeForm: Fixture[];
  awayForm: Fixture[];
  homeTeamId: number;
  awayTeamId: number;
}

// Helper to determine result and style
const getResultStyle = (fixture: Fixture, perspectiveTeamId: number): { text: string; className: string } => {
  const homeGoals = fixture.goals.home;
  const awayGoals = fixture.goals.away;

  if (homeGoals === null || awayGoals === null) {
    return { text: '?', className: 'bg-gray-400 text-white' }; // Unknown result
  }

  const scoreText = `${homeGoals} - ${awayGoals}`;

  if (fixture.teams.home.id === perspectiveTeamId) { // Perspective is home team
    if (homeGoals > awayGoals) return { text: scoreText, className: 'bg-green-600 text-white' }; // Win
    if (homeGoals < awayGoals) return { text: scoreText, className: 'bg-red-600 text-white' }; // Loss
    return { text: scoreText, className: 'bg-gray-500 text-white' }; // Draw
  } else { // Perspective is away team
    if (awayGoals > homeGoals) return { text: scoreText, className: 'bg-green-600 text-white' }; // Win
    if (awayGoals < homeGoals) return { text: scoreText, className: 'bg-red-600 text-white' }; // Loss
    return { text: scoreText, className: 'bg-gray-500 text-white' }; // Draw
  }
};

// Helper function to create URL-friendly slug (reuse if you have it elsewhere)
function createMatchSlug(homeName: string, awayName: string, matchId: number) {
    const format = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `${format(homeName)}-vs-${format(awayName)}-${matchId}`;
}


const TeamForm: React.FC<TeamFormProps> = ({ homeForm, awayForm, homeTeamId, awayTeamId }) => {
  const renderFormColumn = (form: Fixture[], perspectiveTeamId: number) => (
    <div className="space-y-3 flex-1">
      {form.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Ingen nylige kamper funnet.</p>}
      {form.map((fixture) => {
        const opponent = fixture.teams.home.id === perspectiveTeamId ? fixture.teams.away : fixture.teams.home;
        const result = getResultStyle(fixture, perspectiveTeamId);
        const fixtureLink = `/fotball/kamp/${fixture.id}`;

        return (
          <Link
            href={fixtureLink}
            key={fixture.id}
            className="flex items-center justify-between text-sm hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded transition-colors duration-150"
          >
            <span className={`text-right ${fixture.teams.home.id === perspectiveTeamId ? 'font-medium' : ''} flex-1 truncate pr-2 dark:text-gray-200`}>
              {fixture.teams.home.name}
            </span>
            <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${result.className}`}>
              {result.text}
            </span>
            <span className={`text-left ${fixture.teams.away.id === perspectiveTeamId ? 'font-medium' : ''} flex-1 truncate pl-2 dark:text-gray-200`}>
              {fixture.teams.away.name}
            </span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="mt-6 p-4 md:p-6 bg-white dark:bg-[#222222] rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4 text-center text-gray-800 dark:text-gray-100">Lag form</h3>
      <div className="flex flex-col sm:flex-row gap-6 md:gap-10">
        {/* Home Team Form */}
        {renderFormColumn(homeForm, homeTeamId)}
        {/* Divider (optional) */}
        <div className="hidden sm:block border-l border-[#e5e7eb] dark:border-gray-700"></div>
        {/* Away Team Form */}
        {renderFormColumn(awayForm, awayTeamId)}
      </div>
    </div>
  );
};

export default TeamForm; 