import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTeamData, extractTeamId } from '@/utils/api';
import TabNav from '@/app/components/TabNav';
import TeamStandings from '@/app/components/TeamStandings';

export const dynamic = 'force-static';
export const revalidate = 86400; // 24 hours

export default async function TeamTablePage({ params }: { params: { slug: string } }) {
  const teamId = extractTeamId(params.slug);
  
  if (!teamId) {
    return notFound();
  }

  const teamData = await getTeamData(teamId);
  if (!teamData?.team) {
    return notFound();
  }

  // Get current season
  const currentYear = new Date().getFullYear();
  
  // Generate available seasons based on league
  const seasons = teamData.team.league_id === 103 || teamData.team.league_id === 104
    ? [currentYear, currentYear + 1, currentYear + 2] // Norwegian leagues (single year format)
    : [currentYear - 1, currentYear]; // Other leagues (split year format)

  // Format the season display based on league type
  const seasonDisplay = teamData.team.league_id === 103 || teamData.team.league_id === 104
    ? `sesongen ${currentYear}`  // Norwegian leagues: just the year
    : `sesongen ${currentYear-1}/${currentYear}`; // Other leagues: split year format

  const tabs = [
    { name: 'Oversikt', href: `/lag/${params.slug}` },
    { name: 'Tropp', href: `/lag/${params.slug}/tropp` },
    { name: 'Resultater', href: `/lag/${params.slug}/resultater` },
    { name: 'Kamper', href: `/lag/${params.slug}/kamper` },
    { name: 'Tabell', href: `/lag/${params.slug}/tabell` },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Team Header */}
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
          <h1 className="text-2xl font-bold">
            {teamData.team.team.name} - Tabellplassering for {seasonDisplay}
          </h1>
        </div>
        <TabNav tabs={tabs} />
      </div>

      {/* Team Standings Component */}
      <TeamStandings 
        teamId={teamId}
        seasons={seasons}
        teamName={teamData.team.team.name}
        hideSeasonSelector={false}
      />
    </div>
  );
} 