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

// Add weekday mapping at the top of the file
const weekdayToUrl: { [key: string]: string } = {
  'mandag': 'mandag',
  'tirsdag': 'tirsdag',
  'onsdag': 'onsdag',
  'torsdag': 'torsdag',
  'fredag': 'fredag',
  'lørdag': 'lordag',
  'søndag': 'sondag'
};

function formatNorwegianDate(date: Date): string {
  return date.toLocaleDateString('no-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Oslo'
  });
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

  // Group fixtures by league
  const groupFixturesByLeague = (dateFixtures: any[]) => {
    return dateFixtures.reduce((acc, fixture) => {
      const leagueId = fixture.league.id;
      if (!acc[leagueId]) {
        acc[leagueId] = {
          league: fixture.league,
          fixtures: []
        };
      }
      acc[leagueId].fixtures.push(fixture);
      return acc;
    }, {});
  };

  const renderFixturesTable = (dateKey: string) => {
    const dateFixtures = fixtures[dateKey] || [];
    const groupedFixtures = groupFixturesByLeague(dateFixtures);
    
    return (
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {dateKey === 'today' 
            ? 'Kamper i dag'
            : dateKey === 'day1'
              ? 'Kamper i morgen'
              : `Kamper ${formattedDates[dateKey]}`}
        </h2>
        
        <div className="space-y-4">
          {Object.values(groupedFixtures).map((group: any) => (
            <div key={group.league.id} className="bg-white rounded-lg overflow-hidden">
              {/* League header */}
              <div className="bg-gray-50 px-4 py-2 flex items-center">
                <Image
                  src={group.league.logo}
                  alt={group.league.name}
                  width={20}
                  height={20}
                  className="mr-2"
                />
                <span className="font-medium text-gray-900">{group.league.name}</span>
              </div>
              
              {/* Fixtures */}
              <div className="divide-y divide-gray-100">
                {group.fixtures.map((fixture: any) => (
                  <Link
                    key={fixture.fixture.id}
                    href={`/fotball/kamp/${fixture.fixture.id}`}
                    className="flex items-center px-4 py-3 hover:bg-gray-50"
                  >
                    {/* Match time/status */}
                    <div className="w-16 text-sm text-gray-600">
                      {fixture.formattedTime}
                    </div>
                    
                    {/* Teams and score */}
                    <div className="flex-1 flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        {/* Home team */}
                        <div className="flex items-center space-x-2 w-[45%] justify-end">
                          <span className="text-right">{fixture.teams.home.name}</span>
                          <Image
                            src={fixture.teams.home.logo}
                            alt={fixture.teams.home.name}
                            width={24}
                            height={24}
                            className="min-w-[24px]"
                          />
                        </div>

                        {/* Score */}
                        <div className="w-[10%] text-center font-medium">
                          {fixture.fixture.status.short === 'FT' ? (
                            <span>{fixture.score.fulltime.home} - {fixture.score.fulltime.away}</span>
                          ) : (
                            <span>-</span>
                          )}
                        </div>

                        {/* Away team */}
                        <div className="flex items-center space-x-2 w-[45%]">
                          <Image
                            src={fixture.teams.away.logo}
                            alt={fixture.teams.away.name}
                            width={24}
                            height={24}
                            className="min-w-[24px]"
                          />
                          <span>{fixture.teams.away.name}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
          
          {dateFixtures.length === 0 && (
            <div className="text-center py-8 bg-white rounded-lg">
              <p className="text-gray-500">Ingen kamper denne dagen</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderFixturesTable('today')}
      {renderFixturesTable('day1')}
    </div>
  );
} 