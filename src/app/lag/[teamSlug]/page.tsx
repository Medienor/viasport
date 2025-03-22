import { Metadata } from 'next';
import { getTeamBySlug } from '@/app/services/sportApi';
import ClientHead from './ClientHead';
import TeamContent from './TeamContent';

// TEMPORARY API DISABLE FLAG - set to true to disable API calls
const DISABLE_API_CALLS = true;

export async function generateMetadata({ params }: { params: { teamSlug: string } }): Promise<Metadata> {
  const teamSlug = params.teamSlug;
  
  // Skip API call if disabled
  if (DISABLE_API_CALLS) {
    console.log(`[API DISABLED] Would have fetched team metadata for slug: ${teamSlug}`);
    
    // Generate mock team name from slug
    const teamName = teamSlug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return {
      title: `${teamName} på TV & stream - Kampprogram, tabell og kanaler`,
      description: `Se når ${teamName} spiller på TV og streaming. Finn kampprogram, tabell, og kanaler for alle ${teamName} kamper.`,
    };
  }
  
  try {
    const team = await getTeamBySlug(teamSlug);
    
    if (!team) {
      return {
        title: 'Team Not Found',
        description: 'The requested team could not be found.',
      };
    }
    
    return {
      title: `${team.name} på TV & stream - Kampprogram, tabell og kanaler`,
      description: `Se når ${team.name} spiller på TV og streaming. Finn kampprogram, tabell, og kanaler for alle ${team.name} kamper.`,
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Error Loading Team',
      description: 'There was an error loading the team information.',
    };
  }
}

export default async function TeamPage({ params }: { params: { teamSlug: string } }) {
  const teamSlug = params.teamSlug;
  
  // Skip API call if disabled
  if (DISABLE_API_CALLS) {
    console.log(`[API DISABLED] Would have fetched team data for slug: ${teamSlug}`);
    
    // Generate mock team name from slug
    const teamName = teamSlug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Create mock team data
    const mockTeam = {
      id: 1001,
      name: teamName,
      country: "England",
      founded: 1892,
      logo: "https://media.api-sports.io/football/teams/1001.png",
      venue: {
        id: 555,
        name: `${teamName} Stadium`,
        address: "123 Football Street",
        city: "Manchester",
        capacity: 75000,
        surface: "grass",
        image: "https://media.api-sports.io/football/venues/555.png"
      },
      leagueId: 39 // Premier League
    };
    
    return (
      <>
        <ClientHead teamName={mockTeam.name} />
        <TeamContent team={mockTeam} />
      </>
    );
  }
  
  try {
    const team = await getTeamBySlug(teamSlug);
    
    if (!team) {
      return <div className="container mx-auto px-4 py-8">Team not found</div>;
    }
    
    return (
      <>
        <ClientHead teamName={team.name} />
        <TeamContent team={team} />
      </>
    );
  } catch (error) {
    console.error('Error loading team:', error);
    return <div className="container mx-auto px-4 py-8">Error loading team information</div>;
  }
} 