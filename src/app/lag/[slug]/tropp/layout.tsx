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
        title: 'Tropp - Viasport'
      };
    }

    const teamData = await getTeamData(teamId);
    if (!teamData?.team?.team?.name) {
      return {
        title: 'Tropp - Viasport'
      };
    }

    // Get current date
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    // If we're after July 1st, use next season
    const seasonStart = currentDate.getMonth() >= 6 ? currentYear : currentYear - 1;
    const seasonEnd = seasonStart + 1;

    return {
      title: `${teamData.team.team.name} - Spillere og tropp ${seasonStart}/${seasonEnd} | Viasport` ,
      description: `Se hele spillertroppen til ${teamData.team.team.name} for sesongen ${seasonStart}/${seasonEnd}. Få full oversikt over alle spillerne på laget.`
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Tropp - Viasport'
    };
  }
}

export default function TroppLayout({ children }: Props) {
  return children;
} 