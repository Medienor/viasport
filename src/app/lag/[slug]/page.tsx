import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import TeamStandings from '@/app/components/TeamStandings';
import { readFile, readdir } from 'fs/promises';
import path from 'path';

// Add this constant at the top level
const DATA_DIR = path.join(process.cwd(), 'data', 'teams');

// Add this function to generate static paths
export async function generateStaticParams() {
  try {
    const files = await readdir(DATA_DIR);
    return files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const teamId = file.replace('.json', '');
        // You'll need to implement this function to get team names from the JSON files
        return {
          slug: `team-${teamId}` // This should match your URL structure
        };
      });
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

// Helper function to extract team ID from slug
function extractTeamId(slug: string): number | null {
  console.log('Processing slug:', slug);
  const match = slug.match(/-(\d+)$/);
  const id = match ? parseInt(match[1], 10) : null;
  console.log('Extracted ID:', id);
  return id;
}

// Helper function to get team data
async function getTeamData(teamId: number) {
  try {
    const filePath = path.join(DATA_DIR, `${teamId}.json`);
    const rawData = await readFile(filePath, 'utf-8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Error reading team data:', error);
    return null;
  }
}

// This enables static generation
export const dynamic = 'force-static';
export const revalidate = 86400; // 24 hours in seconds

// Generate metadata for the page
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const teamId = extractTeamId(params.slug);
  if (!teamId) return { title: 'Lag ikke funnet' };

  const data = await getTeamData(teamId);
  if (!data?.team?.team?.name) return { title: 'Lag ikke funnet' };

  return {
    title: `${data.team.team.name} på TV & Stream`,
    description: `Se når ${data.team.team.name} spiller på TV og stream.`,
    openGraph: {
      title: `${data.team.team.name} på TV & Stream`,
      description: `Se når ${data.team.team.name} spiller på TV og stream.`,
      images: [{ url: data.team.team.logo || '/images/team-placeholder.png' }],
    },
  };
}

export default async function TeamPage({ params }: { params: { slug: string } }) {
  const teamId = extractTeamId(params.slug);
  
  if (!teamId) {
    console.error('No team ID found in slug:', params.slug);
    return notFound();
  }

  const data = await getTeamData(teamId);
  
  if (!data || !data.team?.team?.name) {
    console.error('Invalid team data for ID:', teamId);
    return notFound();
  }

  const {
    team,
    leagues = [],
    fixtures = { upcoming: [], past: [] },
    statistics: teamStats = null
  } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Team Header */}
        <div className="flex items-center mb-6">
          <div className="relative h-16 w-16 mr-4">
            <Image
              src={team.team.logo}
              alt={team.team.name}
              fill
              className="object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{team.team.name}</h1>
            {team.venue?.name && (
              <p className="text-gray-500">{team.venue.name}</p>
            )}
          </div>
        </div>
        
        {/* Navigation Tabs - Add right after team info */}
        <div className="mt-6 border-t pt-4">
          <div className="overflow-x-auto -mx-6 px-6 md:overflow-x-visible md:px-0 md:mx-0">
            <div className="flex space-x-1 min-w-max md:min-w-0">
              <Link 
                href={`/lag/${params.slug}`}
                className="px-4 py-2 text-sm font-medium rounded-t-lg bg-blue-500 text-white hover:bg-blue-600 transition whitespace-nowrap"
              >
                Oversikt
              </Link>
              <Link 
                href={`/lag/${params.slug}/spillere`}
                className="px-4 py-2 text-sm font-medium rounded-t-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition whitespace-nowrap"
              >
                Spillere
              </Link>
              <Link 
                href={`/lag/${params.slug}/overforinger`}
                className="px-4 py-2 text-sm font-medium rounded-t-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition whitespace-nowrap"
              >
                Overføringer
              </Link>
              <Link 
                href={`/lag/${params.slug}/utilgjengelige`}
                className="px-4 py-2 text-sm font-medium rounded-t-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition whitespace-nowrap"
              >
                Utilgjengelige spillere
              </Link>
            </div>
          </div>
        </div>

        {/* Team Standings */}
        {data.seasons.length > 0 && (
          <TeamStandings 
            teamId={teamId} 
            seasons={data.seasons}
            teamName={team.team.name}
          />
        )}

        {/* Team Leagues */}
        {leagues.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Competitions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {leagues.map((league: any) => (
                <div key={league.league.id} className="p-4 border rounded-lg">
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
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Statistics */}
        {teamStats && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-lg font-medium mb-2">Sesongprestasjon</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-sm text-gray-500">Spilt</p>
                    <p className="text-xl font-bold">{teamStats.fixtures?.played?.total || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Vunnet</p>
                    <p className="text-xl font-bold text-green-600">{teamStats.fixtures?.wins?.total || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tapt</p>
                    <p className="text-xl font-bold text-red-600">{teamStats.fixtures?.loses?.total || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-lg font-medium mb-2">Mål</h3>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div>
                    <p className="text-sm text-gray-500">Scoret</p>
                    <p className="text-xl font-bold text-green-600">{teamStats.goals?.for?.total?.total || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Sluppet inn</p>
                    <p className="text-xl font-bold text-red-600">{teamStats.goals?.against?.total?.total || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-lg font-medium mb-2">Form</h3>
                <div className="text-center">
                  <p className="text-xl font-bold flex justify-center space-x-1">
                    {teamStats.form?.split('').map((result: string, index: number) => {
                      let bgColor = 'bg-gray-200';
                      let textColor = 'text-gray-700';
                      
                      if (result === 'W') {
                        bgColor = 'bg-green-500';
                        textColor = 'text-white';
                      } else if (result === 'L') {
                        bgColor = 'bg-red-500';
                        textColor = 'text-white';
                      } else if (result === 'D') {
                        bgColor = 'bg-yellow-500';
                        textColor = 'text-white';
                      }
                      
                      return (
                        <span 
                          key={index} 
                          className={`${bgColor} ${textColor} w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold`}
                        >
                          {result === 'W' ? 'V' : result === 'L' ? 'T' : result === 'D' ? 'U' : result}
                        </span>
                      );
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fixtures */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Kommende kamper</h2>
          {fixtures.upcoming && fixtures.upcoming.length > 0 ? (
            <div className="space-y-4">
              {fixtures.upcoming.map((fixture: any) => (
                <Link 
                  href={`/fotball/kamp/${fixture.fixture.id}`}
                  key={fixture.fixture.id}
                  className="block hover:bg-gray-50 transition rounded-md border border-gray-200 overflow-hidden"
                >
                  <div className="flex items-center justify-between p-4">
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
                      <div className="text-sm text-gray-500">
                        {new Date(fixture.fixture.date).toLocaleDateString('no-NO', {
                          day: '2-digit',
                          month: '2-digit'
                        })}
                      </div>
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
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Ingen kommende kamper tilgjengelig</p>
          )}
        </div>

        {/* Past Matches */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Siste kamper</h2>
          {fixtures.past && fixtures.past.length > 0 ? (
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
                            <span className={`text-sm ${fixture.teams.home.id === teamId ? 'font-bold' : ''}`}>
                              {fixture.teams.home.name}
                            </span>
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-center ${resultClass}`}>
                          {fixture.goals.home} - {fixture.goals.away}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end">
                            <span className={`text-sm ${fixture.teams.away.id === teamId ? 'font-bold' : ''}`}>
                              {fixture.teams.away.name}
                            </span>
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
          ) : (
            <p className="text-gray-500">Ingen tidligere kamper tilgjengelig</p>
          )}
        </div>
      </div>
    </div>
  );
} 