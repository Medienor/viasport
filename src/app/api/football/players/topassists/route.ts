import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Get query parameters from the request URL
    const url = new URL(request.url);
    const league = url.searchParams.get('league') || '39'; // Default to Premier League
    const season = url.searchParams.get('season') || '2023'; // Default to current season
    
    console.log(`Fetching top assists for league ${league} and season ${season}`);
    
    // Fetch data from the RapidAPI football API
    const response = await fetch(
      `https://api-football-v1.p.rapidapi.com/v3/players/topassists?league=${league}&season=${season}`,
      {
        headers: {
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
          'x-rapidapi-key': process.env.RAPIDAPI_KEY || '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90',
        },
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching top assists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top assists' },
      { status: 500 }
    );
  }
} 