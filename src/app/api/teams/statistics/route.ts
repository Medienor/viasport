import { NextResponse } from 'next/server';
import { headers, BASE_URL } from '@/app/services/sportApi';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const team = searchParams.get('team');
  const league = searchParams.get('league');
  const season = searchParams.get('season');
  const date = searchParams.get('date');
  
  if (!team || !league || !season) {
    return NextResponse.json(
      { error: 'Team, league, and season parameters are required' },
      { status: 400 }
    );
  }
  
  try {
    let url = `${BASE_URL}/teams/statistics?team=${team}&league=${league}&season=${season}`;
    
    // Add date parameter if provided
    if (date) {
      url += `&date=${date}`;
    }
    
    console.log(`Fetching team statistics: ${url}`);
    
    const response = await fetch(url, {
      headers
    });
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching team statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team statistics', message: (error as Error).message },
      { status: 500 }
    );
  }
} 