"use client"

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface ClientFixturesSectionProps {
  fixtures: {[key: string]: any[]};
  formattedDates: {[key: string]: string};
  totalFixtureCount: {[key: string]: number};
  popularLeagueIds: number[];
}

export default function ClientFixturesSection({
  fixtures,
  formattedDates,
  totalFixtureCount,
  popularLeagueIds
}: ClientFixturesSectionProps) {
  const router = useRouter();
  const MAX_FIXTURES_PER_DAY = 10;

  // Check if a league is in our popular leagues list
  const isPopularLeague = (leagueId: number) => {
    return popularLeagueIds.includes(leagueId);
  };

  // Generate a slug from a team name and ID
  const createTeamSlug = (name: string, id: number): string => {
    const nameSlug = name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
    
    return `${nameSlug}-${id}`;
  };

  // Generate a league slug from league name and ID
  const createLeagueSlug = (name: string, id: number): string => {
    const nameSlug = name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
    
    return `${nameSlug}-${id}`;
  };

  // Render a fixtures table for a specific date
  const renderFixturesTable = (dateKey: string) => {
    const dateFixtures = fixtures[dateKey] || [];
    const dateString = formattedDates[dateKey] || '';
    
    let title = '';
    if (dateKey === 'today') {
      title = `Kommende kamper i dag, ${dateString}`;
    } else if (dateKey === 'day1') {
      title = `Kommende kamper i morgen, ${dateString}`;
    } else {
      title = `Kommende kamper ${dateString}`;
    }
    
    return (
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
        
        {dateFixtures.length > 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tid
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Liga
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hjemmelag
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bortelag
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dateFixtures.map((fixture: any) => (
                    <tr 
                      key={fixture.fixture.id} 
                      className={`hover:bg-gray-50 cursor-pointer ${
                        isPopularLeague(fixture.league?.id) ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => router.push(`/fotball/kamp/${fixture.fixture.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {fixture.formattedTime}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {fixture.league?.logo && (
                            <div className="flex-shrink-0 h-6 w-6 relative">
                              <Image
                                src={fixture.league.logo}
                                alt={fixture.league?.name || 'League'}
                                fill
                                className="object-contain"
                              />
                            </div>
                          )}
                          <div className={`ml-3 text-sm ${
                            isPopularLeague(fixture.league?.id) ? 'font-semibold text-blue-800' : 'text-gray-900'
                          }`}>
                            <Link 
                              href={`/fotball/liga/${createLeagueSlug(fixture.league?.name || '', fixture.league?.id)}`}
                              className={`text-sm ${isPopularLeague(fixture.league?.id) 
                                ? 'font-semibold text-blue-600' 
                                : 'text-gray-900'}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {fixture.league?.name || 'Unknown League'}
                            </Link>
                          </div>
                        </div>
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
                              className="text-sm font-medium text-gray-900 hover:text-blue-600"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {fixture.teams?.home?.name || 'Home Team'}
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className="text-gray-500">vs</span>
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
                              className="text-sm font-medium text-gray-900 hover:text-blue-600"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {fixture.teams?.away?.name || 'Away Team'}
                            </Link>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <Link href="/fotball" className="text-blue-600 font-medium hover:text-blue-500">
                Se alle kamper {dateKey === 'today' ? 'i dag' : dateKey === 'day1' ? 'i morgen' : formattedDates[dateKey]} 
                {totalFixtureCount[dateKey] > MAX_FIXTURES_PER_DAY && 
                  ` (${totalFixtureCount[dateKey] - MAX_FIXTURES_PER_DAY} flere)`
                }
                <span aria-hidden="true"> →</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 bg-white shadow rounded-lg">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="mt-2">
              {dateKey === 'today' 
                ? 'Ingen kommende kamper i dag.'
                : dateKey === 'day1'
                  ? 'Ingen kommende kamper i morgen.'
                  : `Ingen kommende kamper ${dateString}.`
              }
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {renderFixturesTable('today')}
      {renderFixturesTable('day1')}
      {renderFixturesTable('day2')}
      {renderFixturesTable('day3')}
      {renderFixturesTable('day4')}
      {renderFixturesTable('day5')}
      {renderFixturesTable('day6')}
    </>
  );
} 