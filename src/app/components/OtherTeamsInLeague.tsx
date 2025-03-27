"use client";

import { useState, useEffect } from 'react';

// Declare the global window property
declare global {
  interface Window {
    leagueStandings: any;
  }
}

interface OtherTeamsProps {
  currentTeamId: number;
}

export default function OtherTeamsInLeague({ currentTeamId }: OtherTeamsProps) {
  const [leagueData, setLeagueData] = useState<any>(null);

  useEffect(() => {
    // Initial check
    if (window.leagueStandings) {
      console.log('✅ Found initial league standings!');
      setLeagueData(window.leagueStandings);
    }

    // Set up an interval to check for changes
    const interval = setInterval(() => {
      if (window.leagueStandings && 
          JSON.stringify(window.leagueStandings) !== JSON.stringify(leagueData)) {
        console.log('🔄 League standings updated!');
        setLeagueData(window.leagueStandings);
      }
    }, 500);

    // Cleanup
    return () => clearInterval(interval);
  }, [leagueData]); // Add leagueData as dependency to watch for changes

  if (!leagueData) {
    console.log('⏳ Waiting for league data...');
    return null;
  }

  console.log('🔍 Current Team ID:', currentTeamId);
  console.log('📊 League Data:', leagueData);

  const standingData = leagueData[0];
  console.log('🏆 Standing Data:', standingData);

  const league = standingData?.league;
  console.log('⚽ League:', league);

  const standingGroup = league?.standings?.[0] || [];
  console.log('📋 Standing Group:', standingGroup);

  if (!standingGroup.length) {
    console.log('❌ No standings found, returning null');
    return null;
  }

  console.log('✅ Rendering component with league name:', league.name);

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">
        Andre lag i {league.name}
      </h2>
      <ul className="space-y-2">
        {standingGroup
          .filter((standing: any) => {
            console.log('🔄 Filtering team:', standing.team.name, standing.team.id !== currentTeamId);
            return standing.team.id !== currentTeamId;
          })
          .map((standing: any) => (
            <li key={standing.team.id}>
              <a 
                href={`/lag/${standing.team.name.toLowerCase()
                  .replace(/\s+/g, '-')
                  .replace(/\//g, '')}-${standing.team.id}`}
                className="hover:underline"
              >
                {standing.team.name}
              </a>
            </li>
          ))}
      </ul>
    </div>
  );
} 