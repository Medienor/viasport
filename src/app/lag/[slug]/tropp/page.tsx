import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { extractTeamId } from '@/utils/helpers';
import { getTeamData, fetchTeamSquad } from '@/utils/api';
import TabNav from '@/app/components/TabNav';
import { createPlayerSlug } from '@/lib/api';

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
    const [squadData, teamData] = await Promise.all([
      fetchTeamSquad(teamId),
      getTeamData(teamId)
    ]);

    console.log('Squad data:', squadData); // Debug log
    console.log('Team data:', teamData);   // Debug log
    
    if (!squadData?.response?.[0]?.players || !teamData?.team) {
      console.error('Missing required data:', { squadData, teamData });
      return notFound();
    }

    // Create the slug once and reuse it
    const slug = await Promise.resolve(params.slug);
    
    const tabs = [
      { name: 'Oversikt', href: `/lag/${params.slug}` },
      { name: 'Tropp', href: `/lag/${params.slug}/tropp` },
      { name: 'Resultater', href: `/lag/${params.slug}/resultater` },
      { name: 'Kamper', href: `/lag/${params.slug}/kamper` },
      { name: 'Tabell', href: `/lag/${params.slug}/tabell` },
    ];

    // Group players by position with Norwegian translations
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
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative h-16 w-16">
              <Image
                src={teamData.team.team.logo}
                alt={teamData.team.team.name}
                fill
                className="object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold">{teamData.team.team.name} - Spillertropp</h1>
          </div>
          <TabNav tabs={tabs} />
        </div>

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
                            src={player.photo}
                            alt={player.name}
                            fill
                            className="object-cover rounded-full"
                          />
                        </div>
                        <div>
                          <h3 className="font-medium hover:text-blue-600 transition-colors">
                            {player.name}
                          </h3>
                          <p className="text-sm text-gray-500">#{player.number || 'N/A'}</p>
                          <p className="text-sm text-gray-500">{positionTranslations[position]}</p>
                          <p className="text-sm text-gray-500">{player.nationality}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error in TeamSquadPage:', error);
    return notFound();
  }
} 