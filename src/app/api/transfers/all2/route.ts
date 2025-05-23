import { NextRequest, NextResponse } from 'next/server';
import { ELITESERIEN_TEAMS } from '@/lib/constants';

// Cache the data for 24 hours
export const revalidate = 86400; // 24 hours in seconds

// Direct API call function for server-side use
async function fetchTeamTransfers(teamId: number) {
  try {
    // Use the correct environment variables
    const apiKey = process.env.RAPID_API_KEY || '';
    const apiHost = process.env.RAPID_API_HOST || 'api-football-v1.p.rapidapi.com';
    const url = `https://${apiHost}/v3/transfers?team=${teamId}`;
    
    console.log(`Fetching transfers for team ${teamId} with API key: ${apiKey ? 'Present' : 'Missing'}`);
    
    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': apiHost
      },
      next: { revalidate }
    });

    if (!response.ok) {
      console.error(`API error for team ${teamId}: ${response.status} ${response.statusText}`);
      return { response: [] };
    }

    const data = await response.json();
    
    // Check if we have actual data
    if (!data || !data.response || !Array.isArray(data.response)) {
      console.error(`Invalid data format for team ${teamId}:`, data);
      return { response: [] };
    }
    
    console.log(`Successfully fetched ${data.response.length} transfers for team ${teamId}`);
    return data;
  } catch (error) {
    console.error(`Error fetching transfers for team ${teamId}:`, error);
    return { response: [] };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Create an array of promises for all team requests - we can do parallel requests
    // since your rate limit is high enough (900/minute)
    const promises = ELITESERIEN_TEAMS.map(team => 
      fetchTeamTransfers(team.id)
        .then(data => ({ teamId: team.id, data: data.response || [] }))
        .catch(err => {
          console.error(`Error processing transfers for team ${team.id}:`, err);
          return { teamId: team.id, data: [] };
        })
    );
    
    // Wait for all promises to resolve
    const results = await Promise.all(promises);
    
    // Convert results to a record object
    const transfersRecord: Record<number, any[]> = {};
    let totalTransfers = 0;
    
    results.forEach(result => {
      transfersRecord[result.teamId] = result.data;
      totalTransfers += result.data.length;
    });
    
    console.log(`Total transfers fetched: ${totalTransfers}`);
    
    // Check if we have any data
    if (totalTransfers === 0) {
      console.error('No transfer data was retrieved for any team');
      return NextResponse.json(
        { success: false, error: 'No transfer data available' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      data: transfersRecord,
      timestamp: Date.now(),
      count: totalTransfers
    });
  } catch (error) {
    console.error('Error fetching all transfers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transfers' },
      { status: 500 }
    );
  }
} 