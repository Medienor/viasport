import { NextResponse } from 'next/server';

// TEMPORARY API DISABLE FLAG - set to true to disable API calls
const DISABLE_API_CALLS = true;

export async function GET(
  request: Request,
  { params }: { params: { leagueId: string } }
) {
  try {
    console.log(`API route: Fetching teams for league ${params.leagueId}`);
    
    const leagueId = parseInt(params.leagueId);
    
    if (isNaN(leagueId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid league ID' },
        { status: 400 }
      );
    }
    
    // Skip API call if disabled
    if (DISABLE_API_CALLS) {
      console.log(`[API DISABLED] Teams API call would have been made for league ${leagueId}`);
      
      // Return mock data
      return NextResponse.json({
        success: true,
        count: 2,
        response: [
          {
            team: {
              id: 33,
              name: "Manchester United",
              code: "MUN",
              country: "England",
              founded: 1878,
              national: false,
              logo: "https://media.api-sports.io/football/teams/33.png"
            },
            venue: {
              id: 556,
              name: "Old Trafford",
              address: "Sir Matt Busby Way",
              city: "Manchester",
              capacity: 76212,
              surface: "grass",
              image: "https://media.api-sports.io/football/venues/556.png"
            }
          },
          {
            team: {
              id: 40,
              name: "Liverpool",
              code: "LIV",
              country: "England",
              founded: 1892,
              national: false,
              logo: "https://media.api-sports.io/football/teams/40.png"
            },
            venue: {
              id: 550,
              name: "Anfield",
              address: "Anfield Road",
              city: "Liverpool",
              capacity: 54074,
              surface: "grass",
              image: "https://media.api-sports.io/football/venues/550.png"
            }
          }
        ]
      });
    }
    
    // Get current season
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const seasonYear = currentDate.getMonth() >= 6 ? currentYear : currentYear - 1;
    
    console.log(`API route: Using season year ${seasonYear} for league ${leagueId}`);
    
    // Direct API call to debug
    const response = await fetch(`https://api-football-v1.p.rapidapi.com/v3/teams?league=${leagueId}&season=${seasonYear}`, {
      headers: {
        'x-rapidapi-key': '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90',
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
      }
    });
    
    console.log(`API route: Direct API response status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`API route: Direct API response data:`, data);
    
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error(`API Error for league teams ${leagueId}:`, data.errors);
      return NextResponse.json(
        { success: false, message: 'API Error', errors: data.errors },
        { status: 500 }
      );
    }
    
    const teams = data.response || [];
    console.log(`API route: Found ${teams.length} teams for league ${leagueId}`);
    
    return NextResponse.json({
      success: true,
      count: teams.length,
      response: teams
    });
  } catch (error) {
    console.error(`Error in teams API route for league ${params.leagueId}:`, error);
    return NextResponse.json(
      { success: false, message: 'Error fetching teams' },
      { status: 500 }
    );
  }
} 