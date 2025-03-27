import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import TeamStandings from '@/app/components/TeamStandings';
import { readFile, readdir } from 'fs/promises';
import path from 'path';
import TeamStats from '@/app/components/TeamStats';
import TeamAnalysis from '@/app/components/TeamAnalysis';
import { extractTeamId } from '@/utils/helpers';
import { getTeamData } from '@/utils/api';
import TabNav from '@/app/components/TabNav';
import { calculateTeamStats } from '@/app/utils/statsCalculator';
import OtherTeamsInLeague from '@/app/components/OtherTeamsInLeague';

// Add this constant at the top level
const DATA_DIR = path.join(process.cwd(), 'data', 'teams');

// Helper function to create URL-friendly slug
function createTeamSlug(teamName: string, teamId: number) {
  return `${teamName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${teamId}`;
}

// Update the generateStaticParams function
export async function generateStaticParams() {
  try {
    const files = await readdir(DATA_DIR);
    return files
      .filter(file => file.endsWith('.json'))
      .map(async (file) => {
        const teamId = file.replace('.json', '');
        const data = await getTeamData(parseInt(teamId));
        const teamName = data?.team?.team?.name || '';
        return {
          slug: createTeamSlug(teamName, parseInt(teamId))
        };
      });
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

// This enables static generation
export const dynamic = 'force-static';
export const revalidate = 86400; // 24 hours in seconds

export default async function TeamPage({ params }: { params: { slug: string } }) {
  // Wait for params
  const slug = await params.slug;
  const teamId = extractTeamId(slug);
  
  if (!teamId) {
    console.error('No team ID found in slug:', slug);
    return notFound();
  }

  const data = await getTeamData(teamId);
  
  // Calculate statistics from fixtures
  const calculatedStats = calculateTeamStats(data);

  if (!data || !data.team?.team?.name) {
    console.error('Invalid team data for ID:', teamId);
    return notFound();
  }

  const {
    team,
    leagues = [],
    fixtures = { upcoming: [], past: [] },
  } = data;

  // More debug logging
  console.log('Extracted Data:', {
    teamName: team.team.name,
    hasLeagues: leagues.length > 0,
    hasFixtures: fixtures.upcoming.length + fixtures.past.length,
    hasStats: !!calculatedStats
  });

  // Add proper typing to the map function
  const seasonYears = leagues[0]?.seasons?.map((season: Season) => season.year) || [];

  const tabs = [
    { name: 'Oversikt', href: `/lag/${slug}` },
    { name: 'Tropp', href: `/lag/${slug}/tropp` },
    { name: 'Resultater', href: `/lag/${slug}/resultater` },
    { name: 'Kamper', href: `/lag/${slug}/kamper` },
    { name: 'Tabell', href: `/lag/${slug}/tabell` },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative h-16 w-16">
            <Image
              src={team.team.logo || '/images/team-placeholder.png'}
              alt={team.team.name}
              fill
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold">{team.team.name} på TV og Live Stream</h1>
        </div>
        <TabNav tabs={tabs} />
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column - Standings (40%) */}
        <div className="lg:w-[40%]">
          <TeamStandings
            teamId={team.team.id}
            teamName={team.team.name}
            seasons={seasonYears}
            hideSeasonSelector={true}
          />
        </div>

        {/* Right Column - Main Content (60%) */}
        <div className="lg:w-[60%] space-y-8">
          {/* Upcoming Matches */}
          {fixtures.upcoming.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Kommende kamper</h2>
              <div className="space-y-4">
                {fixtures.upcoming.map((fixture: any) => (
                  <div 
                    key={fixture.fixture.id}
                    className="block hover:bg-gray-50 transition rounded-md border border-gray-200 overflow-hidden bg-white relative"
                  >
                    {/* Date Badge */}
                    <div className="absolute top-0 left-0 bg-gray-100 px-3 py-1 text-xs text-gray-600 rounded-br">
                      {new Date(fixture.fixture.date).toLocaleDateString('no-NO', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })} {new Date(fixture.fixture.date).toLocaleTimeString('no-NO', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>

                    {/* Match Content */}
                    <Link 
                      href={`/fotball/kamp/${fixture.fixture.id}`}
                      className="block p-4 pt-8"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 w-2/5">
                          <div className="relative h-8 w-8 flex-shrink-0">
                            <Image
                              src={fixture.teams.home.logo || '/images/team-placeholder.png'}
                              alt={fixture.teams.home.name}
                              fill
                              className="object-contain"
                            />
                          </div>
                          <span className={`font-medium truncate ${fixture.teams.home.id === teamId ? 'font-bold' : ''}`}>
                            {fixture.teams.home.name}
                          </span>
                        </div>
                        
                        <div className="text-center w-1/5">
                          <div className="font-bold">
                            {fixture.fixture.status?.short === 'FT' ? 
                              `${fixture.goals.home} - ${fixture.goals.away}` : 
                              new Date(fixture.fixture.date).toLocaleTimeString('no-NO', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            }
                          </div>
                          {fixture.league && (
                            <div className="text-xs text-gray-500 mt-1">
                              {fixture.league.name}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-end space-x-3 w-2/5">
                          <span className={`font-medium text-right truncate ${fixture.teams.away.id === teamId ? 'font-bold' : ''}`}>
                            {fixture.teams.away.name}
                          </span>
                          <div className="relative h-8 w-8 flex-shrink-0">
                            <Image
                              src={fixture.teams.away.logo || '/images/team-placeholder.png'}
                              alt={fixture.teams.away.name}
                              fill
                              className="object-contain"
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Turneringer Section - Moved below upcoming matches */}
          {leagues.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Turneringer</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {leagues.map((league: any) => (
                  <Link 
                    key={league.league.id}
                    href={`/fotball/liga/${league.league.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${league.league.id}`}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition bg-white"
                  >
                    <div className="flex items-center">
                      <div className="relative h-8 w-8 mr-3">
                        <Image
                          src={league.league.logo}
                          alt={league.league.name}
                          fill
                          className="object-contain"
                        />
                      </div>
                      <div>
                        <h3 className="font-medium">{league.league.name}</h3>
                        <p className="text-sm text-gray-500">{league.country.name}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent Results */}
          {fixtures.past.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Siste kamper</h2>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dato
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Turnering
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hjemmelag
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Resultat
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bortelag
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {fixtures.past.map((fixture: any) => {
                        // Determine result from team's perspective
                        let resultClass = 'text-yellow-600'; // Draw
                        if (fixture.teams.home.id === teamId) {
                          if (fixture.goals.home > fixture.goals.away) {
                            resultClass = 'text-green-600'; // Win
                          } else if (fixture.goals.home < fixture.goals.away) {
                            resultClass = 'text-red-600'; // Loss
                          }
                        } else {
                          if (fixture.goals.away > fixture.goals.home) {
                            resultClass = 'text-green-600'; // Win
                          } else if (fixture.goals.away < fixture.goals.home) {
                            resultClass = 'text-red-600'; // Loss
                          }
                        }

                        return (
                          <tr key={fixture.fixture.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(fixture.fixture.date).toLocaleDateString('no-NO', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {fixture.league.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="relative h-6 w-6 mr-2 flex-shrink-0">
                                  <Image
                                    src={fixture.teams.home.logo || '/images/team-placeholder.png'}
                                    alt={fixture.teams.home.name}
                                    fill
                                    className="object-contain"
                                  />
                                </div>
                                <Link 
                                  href={`/lag/${createTeamSlug(fixture.teams.home.name, fixture.teams.home.id)}`}
                                  className={`text-sm hover:underline ${fixture.teams.home.id === teamId ? 'font-bold' : ''}`}
                                >
                                  {fixture.teams.home.name}
                                </Link>
                              </div>
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-center ${resultClass}`}>
                              {fixture.goals.home} - {fixture.goals.away}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end">
                                <Link 
                                  href={`/lag/${createTeamSlug(fixture.teams.away.name, fixture.teams.away.id)}`}
                                  className={`text-sm hover:underline ${fixture.teams.away.id === teamId ? 'font-bold' : ''}`}
                                >
                                  {fixture.teams.away.name}
                                </Link>
                                <div className="relative h-6 w-6 ml-2 flex-shrink-0">
                                  <Image
                                    src={fixture.teams.away.logo || '/images/team-placeholder.png'}
                                    alt={fixture.teams.away.name}
                                    fill
                                    className="object-contain"
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Team Statistics */}
          <TeamStats statistics={calculatedStats} />

          {/* Team Standing Analysis Section */}
          {leagues.length > 0 && (
            <TeamAnalysis 
              team={team} 
              leagues={leagues} 
              fixtures={fixtures} 
            />
          )}

          {/* Next Match Information Section */}
          {fixtures.upcoming.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-semibold mb-4">
                Når spiller {team.team.name} sin neste kamp?
              </h2>
              <div className="prose prose-lg max-w-none">
                {(() => {
                  const nextMatch = fixtures.upcoming[0];
                  const secondMatch = fixtures.upcoming[1];
                  const thirdMatch = fixtures.upcoming[2];
                  
                  const formatMatchDate = (date: string) => {
                    return new Date(date).toLocaleDateString('no-NO', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                  };

                  let text = `${team.team.name} spiller sin neste kamp `;
                  
                  if (nextMatch) {
                    const isHome = nextMatch.teams.home.id === team.team.id;
                    const opponent = isHome ? nextMatch.teams.away.name : nextMatch.teams.home.name;
                    const venue = isHome ? 'hjemme' : 'borte';
                    
                    text += `${venue} mot ${opponent} ${formatMatchDate(nextMatch.fixture.date)}`;
                    
                    if (nextMatch.league) {
                      text += ` i ${nextMatch.league.name}`;
                    }
                    
                    if (secondMatch) {
                      const secondIsHome = secondMatch.teams.home.id === team.team.id;
                      const secondOpponent = secondIsHome ? secondMatch.teams.away.name : secondMatch.teams.home.name;
                      text += `. Deretter venter ${secondOpponent} ${formatMatchDate(secondMatch.fixture.date)}`;
                      
                      if (thirdMatch) {
                        const thirdIsHome = thirdMatch.teams.home.id === team.team.id;
                        const thirdOpponent = thirdIsHome ? thirdMatch.teams.away.name : thirdMatch.teams.home.name;
                        text += `, før de møter ${thirdOpponent} ${formatMatchDate(thirdMatch.fixture.date)}`;
                      }
                    }
                    
                    text += '.';
                  }

                  return <p>{text}</p>;
                })()}
              </div>
            </div>
          )}

          {/* Add the new component */}
          <OtherTeamsInLeague currentTeamId={teamId} />
        </div>
      </div>
    </div>
  );
} 