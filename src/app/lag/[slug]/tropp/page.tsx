import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { extractTeamId } from '@/utils/helpers';
import { getTeamData, fetchTeamSquad } from '@/utils/api';
import { createPlayerSlug } from '@/lib/api';
import TeamHeaderNav from '@/app/components/TeamHeaderNav';

// This enables static generation
export const dynamic = 'force-static';
export const revalidate = 86400; // 24 hours in seconds

export default async function TeamSquadPage({ params }: { params: { slug: string } }) {
  const teamId = extractTeamId(params.slug);
  
  if (!teamId) {
    console.error('No team ID found:', params.slug);
    return notFound();
  }

  try {
    const [squadData, teamDataResult] = await Promise.all([
      fetchTeamSquad(teamId),
      getTeamData(teamId)
    ]);

    const teamInfo = teamDataResult?.team?.team;

    console.log('Squad data:', squadData); // Debug log
    console.log('Team data result:', teamDataResult);   // Debug log
    
    if (!squadData?.response?.[0]?.players || !teamInfo?.name || !teamInfo?.logo) {
      console.error('Missing required data:', { squadData, teamInfo });
      return notFound();
    }

    const slug = await Promise.resolve(params.slug);
    
    const tabs = [
      { name: 'Oversikt', href: `/lag/${params.slug}` },
      { name: 'Tropp', href: `/lag/${params.slug}/tropp` },
      { name: 'Resultater', href: `/lag/${params.slug}/resultater` },
      { name: 'Kamper', href: `/lag/${params.slug}/kamper` },
      { name: 'Tabell', href: `/lag/${params.slug}/tabell` },
    ];

    const players = squadData.response[0].players;
    const positionOrder = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'];
    const positionTranslations: { [key: string]: string } = {
      'Goalkeeper': 'Keeper',
      'Defender': 'Forsvar',
      'Midfielder': 'Midtbane',
      'Attacker': 'Angrep',
      'Unknown': 'Ukjent posisjon'
    };

    const playersByPosition = players.reduce((acc: any, player: any) => {
      const position = player.position || 'Unknown';
      if (!acc[position]) {
        acc[position] = [];
      }
      acc[position].push(player);
      return acc;
    }, {});

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TeamHeaderNav
          teamLogo={teamInfo.logo}
          teamName={teamInfo.name}
          tabs={tabs}
        />

        <h1 className="text-2xl font-bold mb-8 mt-4 lg:mt-0">Spillertropp</h1>

        <div className="mt-8">
          {positionOrder.map((position) => (
            playersByPosition[position] && (
              <div key={position} className="mb-8">
                <h2 className="text-xl font-semibold mb-4">
                  {positionTranslations[position]}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {playersByPosition[position].map((player: any) => (
                    <Link
                      key={player.id}
                      href={`/spillerprofil/${createPlayerSlug(player.name, player.id)}`}
                      className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="relative h-16 w-16 flex-shrink-0">
                          <Image
                            src={player.photo ? player.photo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net') : '/images/player-placeholder.png'}
                            alt={player.name}
                            fill
                            className="object-cover rounded-full bg-gray-100"
                          />
                        </div>
                        <div>
                          <h3 className="font-medium hover:text-blue-600 transition-colors">
                            {player.name}
                          </h3>
                          <p className="text-sm text-gray-500">#{player.number || 'N/A'}</p>
                          {player.age && <p className="text-sm text-gray-500">{player.age} år</p>}
                          {player.nationality && <p className="text-sm text-gray-500">{player.nationality}</p>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )
          ))}
          {Object.keys(playersByPosition).includes('Unknown') && playersByPosition['Unknown'].length > 0 && (
             <div key="Unknown" className="mb-8">
                <h2 className="text-xl font-semibold mb-4">
                  {positionTranslations['Unknown']}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {playersByPosition['Unknown'].map((player: any) => (
                     <Link
                      key={player.id}
                      href={`/spillerprofil/${createPlayerSlug(player.name, player.id)}`}
                      className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
                    >
                       <div className="flex items-center space-x-4">
                        <div className="relative h-16 w-16 flex-shrink-0">
                          <Image
                            src={player.photo ? player.photo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net') : '/images/player-placeholder.png'}
                            alt={player.name}
                            fill
                            className="object-cover rounded-full bg-gray-100"
                          />
                        </div>
                        <div>
                          <h3 className="font-medium hover:text-blue-600 transition-colors">
                            {player.name}
                          </h3>
                          <p className="text-sm text-gray-500">#{player.number || 'N/A'}</p>
                          {player.age && <p className="text-sm text-gray-500">{player.age} år</p>}
                          {player.nationality && <p className="text-sm text-gray-500">{player.nationality}</p>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error in TeamSquadPage:', error);
    return notFound();
  }
} 