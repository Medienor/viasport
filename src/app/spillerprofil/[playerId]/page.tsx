import { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import PlayerProfile from './PlayerProfile';
import { fetchPlayerById, fetchPlayerTeams } from '@/lib/api';

// Define the page as dynamically rendered
export const dynamic = 'force-dynamic';
// Add revalidation to cache the page for a period of time (e.g., 24 hours)
export const revalidate = 86400; // 24 hours in seconds

// Generate metadata for the page
export async function generateMetadata(
  { params }: { params: { playerId: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  try {
    const playerId = parseInt(params.playerId.split('-').pop() || '0', 10);
    
    if (!playerId) {
      return {
        title: 'Spiller ikke funnet - ViaSport',
        description: 'Spillerprofilen du leter etter finnes ikke.'
      };
    }
    
    const playerData = await fetchPlayerById(playerId);
    
    if (!playerData) {
      return {
        title: 'Spiller ikke funnet - ViaSport',
        description: 'Spillerprofilen du leter etter finnes ikke.'
      };
    }
    
    // Create full name from firstname and lastname
    const fullName = getPlayerFullName(playerData.player);
    
    // Get parent metadata (for defaults)
    const previousImages = (await parent).openGraph?.images || [];
    
    return {
      title: `${fullName} - Spillerprofil | ViaSport`,
      description: `Se statistikk, karrierehistorikk og informasjon om ${fullName}. Fødselsdato: ${playerData.player.birth?.date || 'Ukjent'}, Nasjonalitet: ${playerData.player.nationality || 'Ukjent'}.`,
      openGraph: {
        title: `${fullName} - Spillerprofil | ViaSport`,
        description: `Se statistikk, karrierehistorikk og informasjon om ${fullName}. Fødselsdato: ${playerData.player.birth?.date || 'Ukjent'}, Nasjonalitet: ${playerData.player.nationality || 'Ukjent'}.`,
        images: playerData.player.photo ? [{ url: playerData.player.photo }] : previousImages,
        type: 'profile',
        firstName: playerData.player.firstname || '',
        lastName: playerData.player.lastname || '',
        username: playerData.player.name || '',
      },
      alternates: {
        canonical: `https://viasport.no/spillerprofil/${params.playerId}`,
      },
      robots: {
        index: true,
        follow: true,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${fullName} - Spillerprofil | ViaSport`,
        description: `Se statistikk, karrierehistorikk og informasjon om ${fullName}.`,
        images: playerData.player.photo ? [playerData.player.photo] : [],
      },
      other: {
        'og:locale': 'nb_NO',
      }
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Spillerprofil - ViaSport',
      description: 'Detaljert informasjon om fotballspillere.'
    };
  }
}

// Helper function to get player's full name
function getPlayerFullName(player: any): string {
  if (player.firstname && player.lastname) {
    return `${player.firstname} ${player.lastname}`;
  } else if (player.firstname) {
    return player.firstname;
  } else if (player.lastname) {
    return player.lastname;
  } else {
    return player.name || 'Ukjent spiller';
  }
}

export default async function PlayerPage({ params }: { params: { playerId: string } }) {
  try {
    const playerId = parseInt(params.playerId.split('-').pop() || '0', 10);
    
    if (!playerId) {
      notFound();
    }
    
    // Fetch player data
    const playerData = await fetchPlayerById(playerId);
    
    if (!playerData) {
      notFound();
    }
    
    // Fetch player teams data
    let playerTeamsData = null;
    try {
      playerTeamsData = await fetchPlayerTeams(playerId);
    } catch (error) {
      console.error('Error fetching player teams:', error);
      // Continue without teams data
    }
    
    return <PlayerProfile playerData={playerData} playerTeamsData={playerTeamsData} />;
  } catch (error) {
    console.error('Error loading player:', error);
    notFound();
  }
} 