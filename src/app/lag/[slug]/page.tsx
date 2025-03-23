import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import TeamStandings from '@/app/components/TeamStandings';

// Helper function to extract team ID from slug
function extractTeamId(slug: string): number | null {
  const match = slug.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

// Generate metadata for the page
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const teamId = extractTeamId(params.slug);
  if (!teamId) return { title: 'Lag ikke funnet' };

  try {
    // Use absolute URL for server components
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
      
    const response = await fetch(`${baseUrl}/api/teams?id=${teamId}`, { cache: 'no-store' });
    const data = await response.json();
    const team = data.response?.[0];

    if (!team) return { title: 'Lag ikke funnet' };

    return {
      title: `${team.team.name} på TV & Stream | Kampprogram, tabeller og resultater`,
      description: `Se når ${team.team.name} spiller på TV og stream. Få full oversikt over kampprogram, tabeller, resultater og statistikk.`,
      openGraph: {
        title: `${team.team.name} på TV & Stream | Kampprogram, tabeller og resultater`,
        description: `Se når ${team.team.name} spiller på TV og stream. Få full oversikt over kampprogram, tabeller, resultater og statistikk.`,
        images: [{ url: team.team.logo }],
        type: 'website',
      },
    };
  } catch (error) {
    console.error('Error fetching team metadata:', error);
    return { title: 'Lagprofil' };
  }
}

export default async function TeamPage({ params }: { params: { slug: string } }) {
  const teamId = extractTeamId(params.slug);
  
  if (!teamId) {
    return notFound();
  }

  try {
    // Use absolute URL for server components
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    // Fetch team data
    const teamResponse = await fetch(`${baseUrl}/api/teams?id=${teamId}`, { cache: 'no-store' });
    
    if (!teamResponse.ok) {
      throw new Error(`Team API responded with status: ${teamResponse.status}`);
    }
    
    const teamData = await teamResponse.json();
    const team = teamData.response?.[0]?.team;

    if (!team) {
      return notFound();
    }

    // Initialize with empty values in case API calls fail
    let leagues = [];
    let teamStats = null;
    let seasons = [];
    let fixtures = [];
    let pastFixtures = [];
    
    try {
      // Fetch team leagues
      const leaguesResponse = await fetch(`${baseUrl}/api/team-leagues?team=${teamId}`, { cache: 'no-store' });
      if (leaguesResponse.ok) {
        const leaguesData = await leaguesResponse.json();
        leagues = leaguesData.response || [];
      }
    } catch (error) {
      console.error('Error fetching team leagues:', error);
    }
    
    // Get the main league (usually the first one)
    const mainLeague = leagues[0]?.league;
    const currentYear = new Date().getFullYear();
    
    try {
      // Fetch team statistics for the main league
      if (mainLeague) {
        const statsResponse = await fetch(
          `${baseUrl}/api/teams/statistics?team=${teamId}&league=${mainLeague.id}&season=${currentYear}`,
          { cache: 'no-store' }
        );
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          teamStats = statsData.response;
        }
      }
    } catch (error) {
      console.error('Error fetching team statistics:', error);
    }

    try {
      // Fetch team seasons
      const seasonsResponse = await fetch(`${baseUrl}/api/team-seasons?team=${teamId}`, { cache: 'no-store' });
      if (seasonsResponse.ok) {
        const seasonsData = await seasonsResponse.json();
        seasons = seasonsData.response || [];
      }
    } catch (error) {
      console.error('Error fetching team seasons:', error);
    }

    try {
      // Fetch upcoming fixtures
      const fixturesResponse = await fetch(
        `${baseUrl}/api/fixtures?team=${teamId}&season=${currentYear}&next=5`,
        { cache: 'no-store' }
      );
      if (fixturesResponse.ok) {
        const fixturesData = await fixturesResponse.json();
        fixtures = fixturesData.response || [];
      }
    } catch (error) {
      console.error('Error fetching fixtures:', error);
    }

    try {
      // Fetch past fixtures
      const pastFixturesResponse = await fetch(
        `${baseUrl}/api/fixtures?team=${teamId}&season=${currentYear}&last=5`,
        { cache: 'no-store' }
      );
      if (pastFixturesResponse.ok) {
        const pastFixturesData = await pastFixturesResponse.json();
        pastFixtures = pastFixturesData.response || [];
      }
    } catch (error) {
      console.error('Error fetching past fixtures:', error);
    }

    // Get the team's league ID from the team data
    const leagueId = teamData?.league?.id || 39; // Default to Premier League if not found

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Team Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center">
            <div className="relative h-24 w-24 mr-6">
              <Image
                src={team.logo || '/images/team-placeholder.png'}
                alt={team.name}
                fill
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{team.name}</h1>
              <p className="text-gray-600">{team.country}</p>
              {team.founded && <p className="text-sm text-gray-500">Grunnlagt: {team.founded}</p>}
              {team.venue && <p className="text-sm text-gray-500">Stadion: {team.venue.name}</p>}
            </div>
          </div>
          
          {/* Navigation Tabs - Add right after team info */}
          <div className="mt-6 border-t pt-4">
            <div className="flex space-x-1">
              <Link 
                href={`/lag/${params.slug}`}
                className="px-4 py-2 text-sm font-medium rounded-t-lg bg-blue-500 text-white hover:bg-blue-600 transition"
              >
                Oversikt
              </Link>
              <Link 
                href={`/lag/${params.slug}/spillere`}
                className="px-4 py-2 text-sm font-medium rounded-t-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
              >
                Spillere
              </Link>
              <Link 
                href={`/lag/${params.slug}/overforinger`}
                className="px-4 py-2 text-sm font-medium rounded-t-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
              >
                Overføringer
              </Link>
              <Link 
                href={`/lag/${params.slug}/utilgjengelige`}
                className="px-4 py-2 text-sm font-medium rounded-t-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
              >
                Utilgjengelige spillere
              </Link>
            </div>
          </div>
        </div>

        {/* Team Standings */}
        {seasons.length > 0 && (
          <TeamStandings 
            teamId={teamId} 
            seasons={seasons} 
          />
        )}

        {/* Team Leagues */}
        {leagues.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Konkurranser</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {leagues.map((leagueData: any) => (
                <Link 
                  href={`/fotball/liga/${leagueData.league.name.toLowerCase().replace(/\s+/g, '-')}-${leagueData.league.id}`}
                  key={leagueData.league.id}
                  className="flex items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition"
                >
                  <div className="relative h-10 w-10 mr-3">
                    <Image
                      src={leagueData.league.logo || '/images/league-placeholder.png'}
                      alt={leagueData.league.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <p className="font-medium">{leagueData.league.name}</p>
                    <p className="text-xs text-gray-500">{leagueData.league.country}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Team Statistics */}
        {teamStats && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Lagstatistikk</h2>
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
          {fixtures && fixtures.length > 0 ? (
            <div className="space-y-4">
              {fixtures.map((fixture: any) => (
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
          {pastFixtures && pastFixtures.length > 0 ? (
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
                  {pastFixtures.map((fixture: any) => {
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
    );
  } catch (error) {
    console.error('Error loading team page:', error);
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-xl font-semibold text-red-600">Feil ved lasting av lagdata</h1>
          <p className="mt-2">Det oppstod et problem ved lasting av laginformasjonen. Vennligst prøv igjen senere.</p>
          <p className="mt-2 text-gray-500">Feildetaljer: {(error as Error).message}</p>
        </div>
      </div>
    );
  }
} 