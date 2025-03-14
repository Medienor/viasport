"use client"

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ClientMatchListProps {
  fixturesByLeague: any;
  sortedLeagues: string[];
  error: string | null;
  formattedDisplayDate: string;
}

export default function ClientMatchList({
  fixturesByLeague,
  sortedLeagues,
  error,
  formattedDisplayDate
}: ClientMatchListProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  // Helper functions moved to client component
  function formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function createTeamSlug(teamName: string, teamId: number): string {
    const nameSlug = teamName
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
    
    return `${nameSlug}-${teamId}`;
  }

  function createLeagueSlug(leagueName: string, leagueId: number): string {
    const nameSlug = leagueName
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
    
    return `${nameSlug}-${leagueId}`;
  }
  
  const handleMatchClick = (matchId: number) => {
    setIsLoading(true);
    router.push(`/fotball/kamp/${matchId}`);
  };
  
  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white shadow rounded-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4">Laster inn kamp...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-8 text-center text-red-500 bg-white shadow rounded-lg">
        <p>{error}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <h1 className="text-lg font-bold text-gray-900">Fotballkamper i morgen - {formattedDisplayDate}</h1>
      
      {sortedLeagues.length === 0 ? (
        <div className="p-8 text-center text-gray-500 bg-white shadow rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="mt-2">Ingen kamper i morgen.</p>
        </div>
      ) : (
        sortedLeagues.map((leagueId) => {
          const leagueFixtures = fixturesByLeague[leagueId];
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
                      href={`/fotball/liga/${createLeagueSlug(leagueInfo.name, leagueInfo.id)}`}
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
                        Tid
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
                        Status
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTime(fixture.fixture.date)}
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
                                href={`/lag/${createTeamSlug(fixture.teams?.home?.name || '', fixture.teams?.home?.id)}`}
                                className="mr-3 text-sm font-medium text-gray-900 hover:text-blue-600"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {fixture.teams?.home?.name || 'Home Team'}
                              </Link>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          {fixture.fixture.status.short === 'NS' ? (
                            <span className="text-gray-500">vs</span>
                          ) : (
                            <span className="font-medium">
                              {fixture.goals.home ?? 0} - {fixture.goals.away ?? 0}
                            </span>
                          )}
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
                                href={`/lag/${createTeamSlug(fixture.teams?.away?.name || '', fixture.teams?.away?.id)}`}
                                className="mr-3 text-sm font-medium text-gray-900 hover:text-blue-600"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {fixture.teams?.away?.name || 'Away Team'}
                              </Link>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {fixture.fixture.status.short === 'LIVE' || 
                           fixture.fixture.status.short === '1H' || 
                           fixture.fixture.status.short === '2H' || 
                           fixture.fixture.status.short === 'HT' ? (
                            <span className="bg-red-600 text-white text-xs font-medium px-3 py-0.5 rounded-full flex items-center justify-center w-16">
                              <span className="inline-block w-1.5 h-1.5 bg-white bg-opacity-70 rounded-full animate-pulse mr-1.5"></span>
                              {fixture.fixture.status.elapsed || '0'}
                            </span>
                          ) : fixture.fixture.status.short === 'FT' || 
                             fixture.fixture.status.short === 'AET' || 
                             fixture.fixture.status.short === 'PEN' ? (
                            <span className="bg-gray-200 text-gray-800 text-xs font-medium px-3 py-0.5 rounded-full">
                              {fixture.fixture.status.short}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-sm">
                              {fixture.fixture.status.short === 'NS' ? 'Ikke startet' : fixture.fixture.status.short}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
} 