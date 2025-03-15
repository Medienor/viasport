"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createTeamSlug, createLeagueSlug } from '@/app/utils/slugUtils';

interface ClientLiveMatchesProps {
  fixturesByLeague: Record<string, any[]>;
  sortedLeagues: string[];
  sport: string;
}

export default function ClientLiveMatches({
  fixturesByLeague,
  sortedLeagues,
  sport
}: ClientLiveMatchesProps) {
  const router = useRouter();
  const [localFixturesByLeague, setLocalFixturesByLeague] = useState(fixturesByLeague);
  const [localSortedLeagues, setLocalSortedLeagues] = useState(sortedLeagues);
  
  // Set up polling to refresh live match data every minute
  useEffect(() => {
    const refreshData = async () => {
      try {
        const response = await fetch(`/api/${sport}/live-matches`);
        const data = await response.json();
        
        if (data.fixturesByLeague && data.sortedLeagues) {
          setLocalFixturesByLeague(data.fixturesByLeague);
          setLocalSortedLeagues(data.sortedLeagues);
        }
      } catch (err) {
        console.error('Error refreshing live matches:', err);
      }
    };
    
    const intervalId = setInterval(refreshData, 60000);
    return () => clearInterval(intervalId);
  }, [sport]);
  
  // Handle match click
  const handleMatchClick = (matchId: number) => {
    router.push(`/${sport}/kamp/${matchId}`);
  };
  
  return (
    <>
      {localSortedLeagues.map((leagueId) => {
        const leagueFixtures = localFixturesByLeague[leagueId];
        const leagueInfo = leagueFixtures[0].league;
        
        return (
          <div key={leagueId} className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center">
                {leagueInfo.logo && (
                  <div className="flex-shrink-0 h-8 w-8 relative mr-3">
                    <Image
                      src={leagueInfo.logo}
                      alt={leagueInfo.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
                <h2 className="text-xl font-semibold text-gray-900">
                  <Link 
                    href={`/liga/${createLeagueSlug(leagueInfo.name)}-${leagueInfo.id}`}
                    className="hover:text-blue-600"
                  >
                    {leagueInfo.name}
                  </Link>
                </h2>
                <span className="ml-2 text-sm text-gray-500">({leagueFixtures.length} kamper)</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hjemmelag
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bortelag
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tid
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leagueFixtures.map((fixture: any) => (
                    <tr 
                      key={fixture.fixture.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleMatchClick(fixture.fixture.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="bg-red-600 text-white text-xs font-medium px-3 py-0.5 rounded-full flex items-center justify-center w-20">
                          <span className="inline-block w-1.5 h-1.5 bg-white bg-opacity-70 rounded-full animate-pulse mr-1.5"></span>
                          {fixture.fixture.status.elapsed || '0'}&apos;
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {fixture.teams?.home?.logo && (
                            <div className="flex-shrink-0 h-6 w-6 relative">
                              <Image
                                src={fixture.teams.home.logo}
                                alt={fixture.teams?.home?.name || 'Home team'}
                                fill
                                className="object-contain"
                              />
                            </div>
                          )}
                          <div className="ml-3 text-sm font-medium text-gray-900">
                            <Link 
                              href={`/lag/${createTeamSlug(fixture.teams?.home?.name || '')}-${fixture.teams?.home?.id}`}
                              className="mr-3 text-sm font-medium text-gray-900 hover:text-blue-600"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {fixture.teams?.home?.name || 'Home Team'}
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className="font-bold text-base">
                          {fixture.goals.home} - {fixture.goals.away}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {fixture.teams?.away?.logo && (
                            <div className="flex-shrink-0 h-6 w-6 relative">
                              <Image
                                src={fixture.teams.away.logo}
                                alt={fixture.teams?.away?.name || 'Away team'}
                                fill
                                className="object-contain"
                              />
                            </div>
                          )}
                          <div className="ml-3 text-sm font-medium text-gray-900">
                            <Link 
                              href={`/lag/${createTeamSlug(fixture.teams?.away?.name || '')}-${fixture.teams?.away?.id}`}
                              className="mr-3 text-sm font-medium text-gray-900 hover:text-blue-600"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {fixture.teams?.away?.name || 'Away Team'}
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {fixture.formattedTime}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </>
  );
} 