import type { Metadata } from 'next';
import { extractTeamId, getTeamData } from '@/utils/api';

type Props = {
  children: React.ReactNode;
  params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const teamId = extractTeamId(params.slug);
    if (!teamId) {
      return {
        title: 'Resultater - Viasport'
      };
    }

    const teamData = await getTeamData(teamId);
    if (!teamData?.team?.team?.name) {
      return {
        title: 'Resultater - Viasport'
      };
    }

    return {
      title: `${teamData.team.team.name} - Resultater og kamphistorikk | Viasport`,
      description: `Se de siste resultatene og kamphistorikken til ${teamData.team.team.name}. Full oversikt over lagets kamper og resultater.`
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Resultater - Viasport'
    };
  }
}

export default function ResultaterLayout({ children }: Props) {
  return children;
} 