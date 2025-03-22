import { NextRequest, NextResponse } from 'next/server';

// TEMPORARY API DISABLE FLAG - set to true to disable API calls
const DISABLE_API_CALLS = true;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const teamId = searchParams.get('team');
  
  if (!teamId) {
    return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
  }
  
  // Skip API call if disabled
  if (DISABLE_API_CALLS) {
    console.log(`[API DISABLED] Team seasons API call would have been made with: team=${teamId}`);
    
    // Return mock data
    return NextResponse.json({
      get: "teams/seasons",
      parameters: { team: teamId },
      errors: [],
      results: 5,
      paging: { current: 1, total: 1 },
      response: [2023, 2022, 2021, 2020, 2019]
    });
  }
  
  try {
    const response = await fetch(
      `https://api-football-v1.p.rapidapi.com/v3/teams/seasons?team=${teamId}`,
      { 
        headers: {
          'x-rapidapi-key': '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90',
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
        }
      }
    );
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching team seasons:', error);
    return NextResponse.json({ error: 'Failed to fetch team seasons' }, { status: 500 });
  }
} 