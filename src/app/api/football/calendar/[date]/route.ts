import { NextRequest, NextResponse } from 'next/server';
import { BASE_URL, headers } from '@/app/services/sportApi';
import { MAJOR_LEAGUES } from '@/scripts/teamDataFetcher';

// Add interface for the match object
interface ApiMatch {
  league: {
    id: number;
    name: string;
    // Add other league properties as needed
  };
  // Add other match properties as needed
}

export async function GET(
  request: NextRequest,
  context: { params: { date: string } }
) {
  try {
    const date = context.params.date;
    console.log(`Fetching calendar matches for date: ${date}`);
    
    const response = await fetch(`${BASE_URL}/fixtures?date=${date}`, { 
      headers,
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Filter matches for major leagues with type annotation
    const filteredMatches = data.response.filter((match: ApiMatch) => 
      MAJOR_LEAGUES.some(league => league.id === match.league.id)
    );
    
    // Return filtered matches for the day (including live ones)
    return NextResponse.json({ response: filteredMatches });
  } catch (error) {
    console.error('Error in calendar API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar matches' },
      { status: 500 }
    );
  }
} 