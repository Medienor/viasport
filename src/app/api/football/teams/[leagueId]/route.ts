import { NextResponse } from 'next/server';

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