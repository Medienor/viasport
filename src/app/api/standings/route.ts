import { NextRequest, NextResponse } from 'next/server';
import { headers, BASE_URL } from '@/app/services/sportApi';

// Remove the API disable flag
// const DISABLE_API_CALLS = true;

export const revalidate = 86400; // 24 hours

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const leagueId = searchParams.get('league');
  const season = searchParams.get('season');
  
  if (!leagueId || !season) {
    return NextResponse.json(
      { error: 'Missing required parameters: league and season' },
      { status: 400 }
    );
  }
  
  try {
    const response = await fetch(`${BASE_URL}/standings?league=${leagueId}&season=${season}`, {
      headers,
      next: { revalidate: 86400 } // 24 hours cache
    });
    
    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching standings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch standings data' },
      { status: 500 }
    );
  }
} 