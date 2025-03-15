// Remove "use client" directive if present

import { notFound } from 'next/navigation';
import Image from 'next/image';
import { fetchTeamData, fetchTeamLeagues, fetchTeamStandings, fetchTeamMatches, fetchTeamPlayers, fetchTeamTransfers, fetchTeamInjuries } from '@/lib/api';
import ClientHead from './ClientHead';
import TeamContent from './TeamContent';
import { getTeamIdFromSlug } from '@/lib/utils';

// This enables ISR - pages are cached and revalidated after 3600 seconds (1 hour)
export const revalidate = 43200;

// Generate static params for the most popular teams only (optional)
export async function generateStaticParams() {
  // Return params for only the most popular teams (e.g., top 100)
  // This is optional - you can remove this function if you don't want to pre-render any teams
  const popularTeams = [
    { teamSlug: 'manchester-united-33' },
    { teamSlug: 'liverpool-40' },
    { teamSlug: 'arsenal-42' },
    { teamSlug: 'manchester-city-50' },
    { teamSlug: 'barcelona-529' },
    { teamSlug: 'real-madrid-541' },
    // Add more popular teams as needed
  ];
  
  return popularTeams;
}

// This function runs on the server for each request
export default async function TeamPage({ params }: { params: { teamSlug: string } }) {
  // Wait for params to be fully resolved
  const resolvedParams = await Promise.resolve(params);
  const teamSlug = resolvedParams.teamSlug;
  
  try {
    // Extract team ID from slug (assuming format is "team-name-ID")
    console.log(`Processing team slug: ${teamSlug}`);
    
    const teamId = getTeamIdFromSlug(teamSlug);
    console.log(`Extracted team ID: ${teamId}`);
    
    if (!teamId || isNaN(teamId) || teamId <= 0) {
      console.error(`Invalid team ID extracted from slug: ${teamId}`);
      return notFound();
    }
    
    // Fetch team data first to check if it exists
    console.log(`Fetching basic team data for ID: ${teamId}`);
    const teamData = await fetchTeamData(teamId);
    
    console.log(`Team data fetch result:`, JSON.stringify(teamData, null, 2));
    
    // If team data couldn't be found, return 404
    if (!teamData || !teamData.team) {
      console.error(`Team data not found for ID: ${teamId}`);
      return notFound();
    }
    
    console.log(`Successfully found team: ${teamData.team.name}`);
    
    // Fetch all team data in parallel
    console.log(`Fetching additional data for team ID: ${teamId}`);
    const [leagues, standings, upcomingMatches, recentMatches, players, transfers, injuries] = await Promise.all([
      fetchTeamLeagues(teamId),
      fetchTeamStandings(teamId),
      fetchTeamMatches(teamId, 'upcoming'),
      fetchTeamMatches(teamId, 'past'),
      fetchTeamPlayers(teamId),
      fetchTeamTransfers(teamId),
      fetchTeamInjuries(teamId)
    ]);
    
    console.log(`Data fetch complete. Leagues: ${leagues.length}, Standings: ${standings.length}, Upcoming matches: ${upcomingMatches.length}, Recent matches: ${recentMatches.length}, Players: ${players.length}, Transfers: ${transfers.length}, Injuries: ${injuries.length}`);
    
    // Format and prepare data for the client component
    const formattedData = {
      team: teamData.team,
      leagues: leagues,
      standings: standings,
      upcomingMatches: upcomingMatches,
      recentMatches: recentMatches,
      players: players,
      transfers: transfers,
      injuries: injuries
    };
    
    return (
      <>
        {/* Client component for document title */}
        <ClientHead teamName={teamData.team.name} />
        
        <div className="bg-gray-100 min-h-screen">
          {/* Team header */}
          <div className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 mr-4">
                  {teamData.team.logo && (
                    <Image
                      src={teamData.team.logo}
                      alt={teamData.team.name}
                      width={96}
                      height={96}
                      className="object-contain"
                    />
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{teamData.team.name}</h1>
                  <div className="flex items-center mt-1 text-sm text-gray-500">
                    {teamData.team.country && (
                      <span className="flex items-center">
                        <span>{teamData.team.country}</span>
                      </span>
                    )}
                    {teamData.team.founded && (
                      <span className="ml-4">Grunnlagt: {teamData.team.founded}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Pass all data to the client component */}
          <TeamContent 
            teamData={formattedData}
            teamId={teamId}
          />
        </div>
      </>
    );
  } catch (error) {
    console.error("Error fetching team data:", error);
    return notFound();
  }
} 