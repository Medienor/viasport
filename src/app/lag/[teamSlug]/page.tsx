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
  console.log(`==== TEAM PAGE RENDER START ====`);
  console.log(`Raw params received:`, JSON.stringify(params));
  
  // Wait for params to be fully resolved
  const resolvedParams = await Promise.resolve(params);
  console.log(`Resolved params:`, JSON.stringify(resolvedParams));
  
  const teamSlug = resolvedParams.teamSlug;
  console.log(`Processing team slug: "${teamSlug}"`);
  
  try {
    // Extract team ID from slug (assuming format is "team-name-ID")
    console.log(`Attempting to extract team ID from slug: "${teamSlug}"`);
    
    const teamId = getTeamIdFromSlug(teamSlug);
    console.log(`Extracted team ID: ${teamId} (type: ${typeof teamId})`);
    
    if (!teamId || isNaN(teamId) || teamId <= 0) {
      console.error(`Invalid team ID extracted from slug: ${teamId}, returning 404`);
      return notFound();
    }
    
    // Fetch team data first to check if it exists
    console.log(`Fetching basic team data for ID: ${teamId}`);
    let teamData;
    try {
      teamData = await fetchTeamData(teamId);
      console.log(`Team data fetch completed. Response status: ${teamData ? 'success' : 'empty'}`);
    } catch (fetchError) {
      console.error(`Error during fetchTeamData:`, fetchError);
      throw fetchError;
    }
    
    // Log the first part of the team data to avoid huge logs
    if (teamData) {
      console.log(`Team data preview:`, JSON.stringify({
        team: teamData.team ? {
          id: teamData.team.id,
          name: teamData.team.name,
          // Include a few key properties
        } : null
      }));
    }
    
    // If team data couldn't be found, return 404
    if (!teamData || !teamData.team) {
      console.error(`Team data not found for ID: ${teamId}, returning 404`);
      return notFound();
    }
    
    console.log(`Successfully found team: "${teamData.team.name}" (ID: ${teamData.team.id})`);
    
    // Fetch all team data in parallel
    console.log(`Starting parallel data fetch for team ID: ${teamId}`);
    
    try {
      const [leagues, standings, upcomingMatches, recentMatches, players, transfers, injuries] = await Promise.all([
        fetchTeamLeagues(teamId),
        fetchTeamStandings(teamId),
        fetchTeamMatches(teamId, 'upcoming'),
        fetchTeamMatches(teamId, 'past'),
        fetchTeamPlayers(teamId),
        fetchTeamTransfers(teamId),
        fetchTeamInjuries(teamId)
      ]);
      
      console.log(`Parallel data fetch complete with results:`);
      console.log(`- Leagues: ${leagues?.length || 0}`);
      console.log(`- Standings: ${standings?.length || 0}`);
      console.log(`- Upcoming matches: ${upcomingMatches?.length || 0}`);
      console.log(`- Recent matches: ${recentMatches?.length || 0}`);
      console.log(`- Players: ${players?.length || 0}`);
      console.log(`- Transfers: ${transfers?.length || 0}`);
      console.log(`- Injuries: ${injuries?.length || 0}`);
      
      // Format and prepare data for the client component
      const formattedData = {
        team: teamData.team,
        leagues: leagues || [],
        standings: standings || [],
        upcomingMatches: upcomingMatches || [],
        recentMatches: recentMatches || [],
        players: players || [],
        transfers: transfers || [],
        injuries: injuries || []
      };
      
      console.log(`Rendering team page for "${teamData.team.name}"`);
      console.log(`==== TEAM PAGE RENDER COMPLETE ====`);
      
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
    } catch (parallelFetchError) {
      console.error(`Error during parallel data fetch:`, parallelFetchError);
      throw parallelFetchError;
    }
  } catch (error) {
    console.error(`==== TEAM PAGE ERROR ====`);
    console.error(`Error fetching team data for slug "${teamSlug}":`, error);
    console.error(`Stack trace:`, error instanceof Error ? error.stack : 'No stack trace available');
    console.error(`==== TEAM PAGE ERROR END ====`);
    return notFound();
  }
} 