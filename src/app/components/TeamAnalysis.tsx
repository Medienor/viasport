"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface TeamAnalysisProps {
  team: any;
  leagues: any[];
  fixtures: any;
}

// Define major leagues by their API-Football IDs
const MAJOR_LEAGUES = {
  // Top 5 European Leagues
  PREMIER_LEAGUE: 39,
  LA_LIGA: 140,
  BUNDESLIGA: 78,
  SERIE_A: 135,
  LIGUE_1: 61,
  
  // Norwegian Leagues
  ELITESERIEN: 103,
  OBOS_LIGAEN: 104,  // 1. Division
  SECOND_DIVISION: [473, 474],  // 2. Division Groups
  THIRD_DIVISION: [774, 775, 776, 777, 778, 779],  // 3. Division Groups
  TOPPSERIEN: 725,  // Women's top division
};

export default function TeamAnalysis({ team, leagues, fixtures }: TeamAnalysisProps) {
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAndAnalyze = async () => {
      try {
        // Add defensive checks for required props
        if (!team?.team?.id || !leagues || !fixtures) {
          console.warn('TeamAnalysis: Missing required props', { team: !!team, leagues: !!leagues, fixtures: !!fixtures });
          setAnalysisText(null);
          return;
        }

        // Find the main league by checking if the league ID matches any major league
        const mainLeague = leagues.find(league => {
          const leagueId = league.league.id;
          return (
            // Check if league ID matches any of the major leagues
            Object.values(MAJOR_LEAGUES).flat().includes(leagueId) &&
            league.league.type === 'League'
          );
        });

        if (!mainLeague) {
          console.log('No main league found');
          return;
        }

        // Add defensive check for seasons
        if (!mainLeague.seasons || !Array.isArray(mainLeague.seasons) || mainLeague.seasons.length === 0) {
          console.warn('TeamAnalysis: No valid seasons found for main league', mainLeague);
          return;
        }

        // Fetch standings data
        const response = await fetch(`/api/standings?league=${mainLeague.league.id}&season=${mainLeague.seasons[0].year}`);
        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.response || !data.response[0]?.league?.standings?.[0]) {
          return;
        }

        const standings = data.response[0].league.standings[0];
        const currentStanding = standings.find((s: any) => s.team.id === team.team.id);

        if (!currentStanding) {
          return;
        }

        const recentForm = currentStanding.form?.split('').reverse() || [];
        
        // Add defensive check for fixtures.past
        if (!fixtures.past || !Array.isArray(fixtures.past)) {
          console.warn('TeamAnalysis: fixtures.past is not a valid array', fixtures.past);
          setAnalysisText(null);
          return;
        }

        const recentResults = fixtures.past
          .filter((f: any) => f.league_id === mainLeague.league.id || f.league?.id === mainLeague.league.id)
          .slice(0, 5)
          .reverse();

        let text = '';
        
        // Position analysis
        const position = currentStanding.rank;
        const totalTeams = standings.length;
        const pointsFromTop = standings[0].points - currentStanding.points;
        const pointsFromBottom = currentStanding.points - standings[standings.length - 1].points;

        // Find teams with same points as current team
        const teamsWithSamePoints = standings.filter(
          (s: any) => s.points === currentStanding.points && s.team.id !== team.team.id
        );

        // Generate position context
        if (position === 1) {
          if (teamsWithSamePoints.length > 0) {
            const tiedTeams = teamsWithSamePoints
              .map((s: any) => s.team.name)
              .join(' og ');
            text = `${team.team.name} deler førsteplassen i ${mainLeague.league.name} med ${tiedTeams}`;
          } else {
            text = `${team.team.name} leder nå ${mainLeague.league.name}`;
          }
        } else if (position <= 3) {
          text = `${team.team.name} ligger på en sterk ${position}. plass i ${mainLeague.league.name}`;
        } else if (position <= totalTeams / 2) {
          text = `${team.team.name} befinner seg på ${position}. plass i ${mainLeague.league.name}`;
        } else if (position === totalTeams) {
          text = `${team.team.name} ligger sist i ${mainLeague.league.name}`;
        } else {
          text = `${team.team.name} ligger på ${position}. plass i ${mainLeague.league.name}`;
        }

        // Add points context
        if (position === 1) {
          if (teamsWithSamePoints.length === 0) {
            const pointsToSecond = currentStanding.points - standings[1].points;
            text += ` med ${pointsToSecond} poeng ned til andreplassen`;
          } else {
            text += ` med ${currentStanding.points} poeng`;
          }
        } else if (position > totalTeams / 2) {
          text += ` med ${currentStanding.points} poeng, ${pointsFromBottom} poeng over nedrykksplass`;
        } else {
          text += ` med ${currentStanding.points} poeng, ${pointsFromTop} poeng bak serieleder`;
        }

        // Recent form analysis
        const lastFiveResults = recentResults.map((match: any) => {
          // Handle both API structure (teams.home/teams.away) and Supabase structure (home_team_id/away_team_id)
          let isHome: boolean;
          let homeGoals: number | null;
          let awayGoals: number | null;
          let opponentName: string;

          if (match.teams?.home?.id !== undefined) {
            // API structure: teams.home/teams.away
            isHome = match.teams.home.id === team.team.id;
            homeGoals = match.goals?.home ?? null;
            awayGoals = match.goals?.away ?? null;
            opponentName = isHome ? match.teams.away?.name : match.teams.home?.name;
          } else if (match.home_team_id !== undefined) {
            // Supabase structure: home_team_id/away_team_id
            isHome = match.home_team_id === team.team.id;
            homeGoals = match.score?.fulltime?.home ?? null;
            awayGoals = match.score?.fulltime?.away ?? null;
            opponentName = isHome ? match.away_team?.name : match.home_team?.name;
          } else {
            // Fallback for unknown structure
            console.warn('Unknown fixture structure:', match);
            return null;
          }

          // Skip if we don't have valid data
          if (homeGoals === null || awayGoals === null || !opponentName) {
            return null;
          }

          const score = isHome ? 
            `${homeGoals}-${awayGoals}` : 
            `${awayGoals}-${homeGoals}`;
          
          const result = isHome ? 
            (homeGoals > awayGoals ? 'seier' : homeGoals < awayGoals ? 'tap' : 'uavgjort') :
            (awayGoals > homeGoals ? 'seier' : awayGoals < homeGoals ? 'tap' : 'uavgjort');
          
          return { score, opponent: opponentName, result };
        }).filter(Boolean); // Remove null entries

        // Form context
        const wins = recentForm.filter((r: string) => r === 'W').length;
        const losses = recentForm.filter((r: string) => r === 'L').length;
        
        text += `. I de siste fem kampene har laget `;
        
        if (wins >= 4) {
          text += `vist strålende form med ${wins} seire`;
        } else if (wins >= 3) {
          text += `vist god form med ${wins} seire`;
        } else if (losses >= 4) {
          text += `slitt med ${losses} tap`;
        } else if (losses >= 3) {
          text += `hatt en utfordrende periode med ${losses} tap`;
        } else {
          text += `vist varierende form`;
        }

        // Add specific match details
        if (lastFiveResults.length > 0) {
          text += `. Siste kamp endte med ${lastFiveResults[lastFiveResults.length - 1].result} ${lastFiveResults[lastFiveResults.length - 1].score} mot ${lastFiveResults[lastFiveResults.length - 1].opponent}`;
        }

        setAnalysisText(text + '.');
      } catch (error) {
        console.error('Error in analysis:', error);
        setAnalysisText(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAndAnalyze();
  }, [team, leagues, fixtures]);

  if (loading) {
    return <p className="text-gray-500 dark:text-gray-400">Laster analyse...</p>;
  }

  if (!analysisText) {
    return null;
  }

  return (
    <div>
      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">
          Tabellplassering for {team.team.name}
        </h2>
        <div className="prose prose-lg max-w-none dark:prose-invert">
          <p>{analysisText}</p>
        </div>
      </div>

      {/* Team History and Facts Section */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">
          Historien og fakta om {team.team.name}
        </h2>
        <div className="prose prose-lg max-w-none dark:prose-invert">
          <p>
            {`${team.team.name} ${team.team.founded ? `ble grunnlagt i ${team.team.founded} og ` : ''}`}
            {team.venue ? 
              `spiller sine hjemmekamper på ${team.venue.name}` +
              `${team.venue.capacity ? ` som har en kapasitet på ${team.venue.capacity.toLocaleString('no-NO')} tilskuere` : ''}.` +
              `${team.venue.city ? ` Stadion ligger i ${team.venue.city}` : ''}` +
              `${team.venue.address ? `, ${team.venue.address}` : ''}.`
              : '.'
            }
          </p>
          {team.venue?.surface && (
            <p>
              {`Hjemmebanen har ${
                team.venue.surface === 'grass' ? 'naturgressbane' : 
                team.venue.surface === 'artificial grass' ? 'kunstgressbane' : 
                team.venue.surface
              }.`}
            </p>
          )}
        </div>
      </div>

      {/* New section for upcoming matches */}
      {fixtures.upcoming && fixtures.upcoming.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4 dark:text-white">
            Kommende kamper for {team.team.name} du bør følge med på
          </h2>
          <ul className="space-y-3">
            {fixtures.upcoming
              .slice(0, 5) // Take only top 5 matches
              .map((match: any) => {
                // Handle both API structure (teams.home/teams.away) and Supabase structure (home_team_id/away_team_id)
                let isHome: boolean;
                let opponentName: string;
                let fixtureId: number;

                if (match.teams?.home?.id !== undefined) {
                  // API structure: teams.home/teams.away
                  isHome = match.teams.home.id === team.team.id;
                  const opponent = isHome ? match.teams.away : match.teams.home;
                  opponentName = opponent?.name;
                  fixtureId = match.fixture?.id;
                } else if (match.home_team_id !== undefined) {
                  // Supabase structure: home_team_id/away_team_id
                  isHome = match.home_team_id === team.team.id;
                  const opponent = isHome ? match.away_team : match.home_team;
                  opponentName = opponent?.name;
                  fixtureId = match.id;
                } else {
                  // Skip unknown structure
                  return null;
                }

                // Skip if we don't have valid data
                if (!opponentName || !fixtureId) {
                  return null;
                }
                
                return (
                  <li key={fixtureId}>
                    <Link 
                      href={`/fotball/kamp/${fixtureId}`}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                    >
                      {`${isHome ? team.team.name : opponentName} mot ${isHome ? opponentName : team.team.name}`}
                    </Link>
                  </li>
                );
              })
              .filter(Boolean)} {/* Remove null entries */}
          </ul>
        </div>
      )}
    </div>
  );
} 