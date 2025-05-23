import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const teamId = searchParams.get('team');

  if (!teamId) {
    return NextResponse.json(
      { error: 'Team ID is required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://api-football-v1.p.rapidapi.com/v3/transfers?team=${teamId}`,
      {
        headers: {
          'x-rapidapi-key': process.env.RAPID_API_KEY || '',
          'x-rapidapi-host': process.env.RAPID_API_HOST || 'api-football-v1.p.rapidapi.com'
        },
        next: { revalidate: 3600 } // Cache for 1 hour
      }
    );

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching transfers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transfers data' },
      { status: 500 }
    );
  }
} 