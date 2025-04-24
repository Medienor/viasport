import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTeamData, extractTeamId } from '@/utils/api';
import TabNav from '@/app/components/TabNav';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import TeamHeaderNav from '@/app/components/TeamHeaderNav';

export const dynamic = 'force-static';
export const revalidate = 86400; // 24 hours

export default async function TeamFixturesPage({ params }: { params: { slug: string } }) {
  const teamId = extractTeamId(params.slug);
  
  if (!teamId) {
    return notFound();
  }

  const teamData = await getTeamData(teamId);
  if (!teamData?.team) {
    return notFound();
  }

  const fixtures = teamData.fixtures.upcoming;

  const tabs = [
    { name: 'Oversikt', href: `/lag/${params.slug}` },
    { name: 'Tropp', href: `/lag/${params.slug}/tropp` },
    { name: 'Resultater', href: `/lag/${params.slug}/resultater` },
    { name: 'Kamper', href: `/lag/${params.slug}/kamper` },
    { name: 'Tabell', href: `/lag/${params.slug}/tabell` },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TeamHeaderNav
        teamLogo={teamData.team.team.logo}
        teamName={`${teamData.team.team.name} - Kommende kamper`}
        tabs={tabs}
      />

      {/* Fixtures List */}
      <div className="space-y-2">
        {fixtures.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Ingen kommende kamper er planlagt</p>
          </div>
        ) : (
          fixtures.map((fixture: any) => {
            const matchDate = new Date(fixture.fixture.date);
            
            return (
              <Link
                key={fixture.fixture.id}
                href={`/fotball/kamp/${fixture.fixture.id}`}
                className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                {/* Desktop View */}
                <div className="hidden sm:grid grid-cols-[1fr_auto_1fr] gap-4 p-4">
                  {/* Left - Date and League */}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {format(matchDate, 'd. MMMM yyyy', { locale: nb })}
                    </span>
                    <span className="text-xs text-gray-500">
                      {fixture.league.name}
                    </span>
                  </div>

                  {/* Center - Match */}
                  <div className="flex items-center justify-center gap-8 w-[500px]">
                    {/* Home Team */}
                    <div className="w-[180px] flex items-center justify-end">
                      <span className="font-medium text-sm truncate">
                        {fixture.teams.home.name}
                      </span>
                      <div className="relative h-6 w-6 ml-2 flex-shrink-0">
                        <Image
                          src={fixture.teams.home.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')}
                          alt={fixture.teams.home.name}
                          fill
                          className="object-contain"
                        />
                      </div>
                    </div>

                    {/* Time */}
                    <div className="w-[60px] px-3 py-1 bg-gray-100 rounded font-medium text-center">
                      {format(matchDate, 'HH:mm')}
                    </div>

                    {/* Away Team */}
                    <div className="w-[180px] flex items-center">
                      <div className="relative h-6 w-6 mr-2 flex-shrink-0">
                        <Image
                          src={fixture.teams.away.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')}
                          alt={fixture.teams.away.name}
                          fill
                          className="object-contain"
                        />
                      </div>
                      <span className="font-medium text-sm truncate">
                        {fixture.teams.away.name}
                      </span>
                    </div>
                  </div>

                  {/* Right - Venue Info */}
                  <div className="text-right text-sm text-gray-500">
                    {fixture.fixture.venue.name}
                  </div>
                </div>

                {/* Mobile View */}
                <div className="sm:hidden p-4 space-y-2">
                  {/* Date and Competition */}
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-900">
                      {format(matchDate, 'd. MMMM yyyy', { locale: nb })}
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(matchDate, 'HH:mm')}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {fixture.league.name}
                  </div>

                  {/* Teams */}
                  <div className="flex items-center gap-3">
                    <div className="relative h-6 w-6 flex-shrink-0">
                      <Image
                        src={fixture.teams.home.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')}
                        alt={fixture.teams.home.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {fixture.teams.home.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative h-6 w-6 flex-shrink-0">
                      <Image
                        src={fixture.teams.away.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')}
                        alt={fixture.teams.away.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {fixture.teams.away.name}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
} 