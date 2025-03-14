import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const teamId = searchParams.get('team');
  
  if (!teamId) {
    return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
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