import { Metadata } from 'next';
import { getTeamData, extractTeamId } from '@/utils/api';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const teamId = extractTeamId(params.slug);
    if (!teamId) {
      return {
        title: 'Tabell - Viasport'
      };
    }

    const teamData = await getTeamData(teamId);
    if (!teamData?.team?.team?.name) {
      return {
        title: 'Tabell - Viasport'
      };
    }

    // Get current season
    const currentYear = new Date().getFullYear();
    const seasonStart = new Date().getMonth() >= 6 ? currentYear : currentYear - 1;
    const seasonEnd = seasonStart + 1;

    return {
      title: `${teamData.team.team.name} - Tabellplassering for sesongen ${seasonStart}/${seasonEnd} | Viasport`,
      description: `Se tabellposisjon og ligaoversikt for ${teamData.team.team.name}. Full oversikt over alle ligaer laget deltar i.`
    };
  } catch {
    return {
      title: 'Tabell - Viasport'
    };
  }
}

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 