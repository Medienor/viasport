import { Metadata } from 'next';
import { extractTeamId } from '@/utils/helpers';
import { getTeamData } from '@/utils/api';

type Props = {
  params: { slug: string }
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const teamId = extractTeamId(params.slug);
  
  if (!teamId) {
    return {
      title: 'Fotball på TV',
      description: 'Se når favorittlaget ditt spiller på TV og stream.',
    };
  }

  const data = await getTeamData(teamId);
  
  if (!data?.team?.team?.name) {
    return {
      title: 'Fotball på TV',
      description: 'Se når favorittlaget ditt spiller på TV og stream.',
    };
  }

  const title = `${data.team.team.name} på TV & stream - Kampprogram, kanal og tid`;
  
  return {
    title: title,
    description: `Se når ${data.team.team.name} spiller på TV og stream. Finn kampprogram, kanaler og tidspunkt for alle ${data.team.team.name} sine kamper.`,
    openGraph: {
      title: title,
      description: `Se når ${data.team.team.name} spiller på TV og stream. Finn kampprogram, kanaler og tidspunkt for alle ${data.team.team.name} sine kamper.`,
      images: [{ url: data.team.team.logo || '/images/team-placeholder.png' }],
    },
  };
}

export default function TeamLayout({ children }: Props) {
  return children;
} 