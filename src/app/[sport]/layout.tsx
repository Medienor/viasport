import { Metadata } from 'next';
import SportLayoutClient from './SportLayoutClient';

export async function generateMetadata({ params }: { params: { sport: string } }): Promise<Metadata> {
  // Only set default metadata if we're not on a league page
  if (!params.sport.includes('liga')) {
    return {
      title: 'ViaSport - Sportsendinger på TV og streaming',
      description: 'Finn ut når og hvor du kan se sport på TV og streaming. Kampoppsett, kanaler og tidspunkter for direktesendinger.',
      openGraph: {
        title: 'ViaSport - Sportsendinger på TV og streaming',
        description: 'Finn ut når og hvor du kan se sport på TV og streaming. Kampoppsett, kanaler og tidspunkter for direktesendinger.',
        type: 'website'
      },
      robots: 'index, follow'
    };
  }
  
  // Return empty object to let the child page handle its own metadata
  return {};
}

export default function SportLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <SportLayoutClient>{children}</SportLayoutClient>;
} 