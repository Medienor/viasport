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
        title: 'Kamper - Viasport'
      };
    }

    const teamData = await getTeamData(teamId);
    if (!teamData?.team?.team?.name) {
      return {
        title: 'Kamper - Viasport'
      };
    }

    return {
      title: `${teamData.team.team.name} - Kommende kamper | Viasport`,
      description: `Se kommende kamper og kampprogram for ${teamData.team.team.name}. Full oversikt over lagets fremtidige kamper.`
    };
  } catch {
    return {
      title: 'Kamper - Viasport'
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