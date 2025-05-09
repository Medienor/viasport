'use client';

import Image from 'next/image';
import { useState } from 'react';
import PlayerStats from './PlayerStats';

interface MatchStatsProps {
  match: any; // TODO: Type this properly
  teamColors: {
    home: string;
    away: string;
  };
}

// Add this helper function at the top of the file
const isLightColor = (color: string): boolean => {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate relative luminance using WCAG formula
  // https://www.w3.org/TR/WCAG20-TECHS/G17.html#G17-tests
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.55; // threshold can be adjusted (0.55 is a good starting point)
};

export default function MatchStats({ match, teamColors }: MatchStatsProps) {
  console.log('Match data:', match);
  console.log('Player statistics:', match.player_statistics);

  // Helper function to determine which value is better
  const getBetterValue = (stat: string, value1: string | number, value2: string | number) => {
    const num1 = typeof value1 === 'string' ? parseFloat(value1) : value1;
    const num2 = typeof value2 === 'string' ? parseFloat(value2) : value2;
    const higherIsBetter = !['Big Chances Missed', 'Fouls'].includes(stat);
    
    if (isNaN(num1) || isNaN(num2)) return null;
    return higherIsBetter ? (num1 > num2 ? 'home' : num1 < num2 ? 'away' : null) 
                         : (num1 < num2 ? 'home' : num1 > num2 ? 'away' : null);
  };

  if (!match.fixture_statistics) {
    return <div className="text-gray-500 dark:text-gray-400 text-center py-4">Ingen statistikk tilgjengelig</div>;
  }

  return (
    <>
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Kampstatistikk</h2>

        {/* Teams header */}
        <div className="flex items-center justify-between mb-6">
          {match.fixture_statistics.map((team: any) => (
            <div key={team.team.id} className="flex items-center">
              <Image
                src={team.team.logo}
                alt={team.team.name}
                width={24}
                height={24}
                className="object-contain"
              />
              <span className="ml-2 font-medium text-sm md:text-base text-gray-900 dark:text-[#AAA]">{team.team.name}</span>
            </div>
          ))}
        </div>

        {/* Main stats */}
        <div className="space-y-8">
          {/* Possession bar */}
          <div>
            <div className="text-center mb-2 font-medium text-gray-900 dark:text-gray-100">Ballbesittelse</div>
            <div className="h-10 flex gap-[5px] rounded-[50px] overflow-hidden">
              <div 
                className="flex items-center justify-start pl-6 font-medium rounded-l-[50px]"
                style={{ 
                  width: match.fixture_statistics[0].statistics.find((s: any) => s.type === 'Ball Possession')?.value.replace('%', '') + '%',
                  backgroundColor: teamColors.home,
                  color: isLightColor(teamColors.home) ? '#000' : '#fff'
                }}
              >
                {match.fixture_statistics[0].statistics.find((s: any) => s.type === 'Ball Possession')?.value}
              </div>
              <div 
                className="flex items-center justify-end pr-6 font-medium rounded-r-[50px]"
                style={{ 
                  width: match.fixture_statistics[1].statistics.find((s: any) => s.type === 'Ball Possession')?.value.replace('%', '') + '%',
                  backgroundColor: teamColors.away,
                  color: isLightColor(teamColors.away) ? '#000' : '#fff'
                }}
              >
                {match.fixture_statistics[1].statistics.find((s: any) => s.type === 'Ball Possession')?.value}
              </div>
            </div>
          </div>

          {/* Stats with pill design */}
          <div className="space-y-4">
            {[
              { label: 'Forventet mål (xG)', type: 'expected_goals' },
              { label: 'Totale skudd', type: 'Total Shots' },
              { label: 'Skudd på mål', type: 'Shots on Goal' },
              { label: 'Store sjanser', type: 'Big Chances' },
              { label: 'Misbrukte store sjanser', type: 'Big Chances Missed' },
              { label: 'Skudd utenfor mål', type: 'Shots off Goal' },
              { label: 'Skudd blokkert', type: 'Blocked Shots' },
              { label: 'Skudd innenfor 16m', type: 'Shots insidebox' },
              { label: 'Skudd utenfor 16m', type: 'Shots outsidebox' },
              { label: 'Frispark', type: 'Fouls' },
              { label: 'Hjørnespark', type: 'Corner Kicks' },
              { label: 'Offside', type: 'Offsides' },
              { label: 'Redninger', type: 'Goalkeeper Saves' },
              { label: 'Pasninger', type: 'Total passes' },
              { 
                label: 'Vellykkede pasninger', 
                type: 'Passes accurate', 
                format: (value: string, teamIndex: number) => {
                  const percentage = match.fixture_statistics[teamIndex].statistics.find(
                    (s: any) => s.type === 'Passes %'
                  )?.value;
                  return `${value} (${percentage})`;
                }
              },
            ].map((stat) => {
              const homeValue = match.fixture_statistics[0].statistics.find((s: any) => s.type === stat.type)?.value;
              const awayValue = match.fixture_statistics[1].statistics.find((s: any) => s.type === stat.type)?.value;
              const betterTeam = getBetterValue(stat.type, homeValue, awayValue);

              return (
                <div key={stat.type} className="flex items-center justify-between">
                  <div className="w-32 text-right">
                    <span 
                      className={`font-medium ${betterTeam === 'home' ? 'inline-flex items-center justify-center px-2 py-0.5 rounded-full' : 'text-gray-900 dark:text-gray-300'}`}
                      style={{ 
                        backgroundColor: betterTeam === 'home' ? teamColors.home : 'transparent',
                        color: betterTeam === 'home' 
                          ? (isLightColor(teamColors.home) ? '#000' : '#fff') 
                          : undefined
                      }}
                    >
                      {stat.format 
                        ? stat.format(homeValue, 0)
                        : homeValue
                      }
                    </span>
                  </div>
                  <span className="text-sm text-center flex-1 mx-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                    {stat.label}
                  </span>
                  <div className="w-32">
                    <span 
                      className={`font-medium ${betterTeam === 'away' ? 'inline-flex items-center justify-center px-2 py-0.5 rounded-full' : 'text-gray-900 dark:text-gray-300'}`}
                      style={{ 
                        backgroundColor: betterTeam === 'away' ? teamColors.away : 'transparent',
                        color: betterTeam === 'away' 
                          ? (isLightColor(teamColors.away) ? '#000' : '#fff') 
                          : undefined
                      }}
                    >
                      {stat.format
                        ? stat.format(awayValue, 1)
                        : awayValue
                      }
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      <PlayerStats playerStats={match.player_statistics} />
    </>
  );
} 