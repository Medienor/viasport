import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const teamId = searchParams.get('team');
  const season = searchParams.get('season');
  const next = searchParams.get('next');
  const last = searchParams.get('last');
  
  if (!teamId) {
    return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
  }
  
  try {
    console.log(`Fetching fixtures for team: ${teamId}, season: ${season}, next: ${next}, last: ${last}`);
    
    let url = `https://api-football-v1.p.rapidapi.com/v3/fixtures?team=${teamId}`;
    
    if (season) {
      url += `&season=${season}`;
    }
    
    if (next) {
      url += `&next=${next}`;
    }
    
    if (last) {
      url += `&last=${last}`;
    }
    
    console.log(`API URL: ${url}`);
    
    const response = await fetch(url, { 
      headers: {
        'x-rapidapi-key': '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90',
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching fixtures:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch fixtures', 
      message: (error as Error).message 
    }, { status: 500 });
  }
} 