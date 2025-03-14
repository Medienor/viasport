import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fixture = searchParams.get('fixture');
  
  if (!fixture) {
    return NextResponse.json({ error: 'Fixture ID is required' }, { status: 400 });
  }
  
  try {
    const apiKey = process.env.RAPIDAPI_KEY || '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90';
    
    const response = await fetch(`https://api-football-v1.p.rapidapi.com/v3/odds/live?fixture=${fixture}`, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
      }
    });
    
    if (!response.ok) {
      console.error('API response error:', response.status, response.statusText);
      return NextResponse.json({ error: 'Failed to fetch live odds data' }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error fetching live odds:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 