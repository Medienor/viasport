import { NextRequest, NextResponse } from 'next/server';
import { headers, BASE_URL } from '@/app/services/sportApi';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const teamId = searchParams.get('team');
  const season = searchParams.get('season');
  
  if (!teamId || !season) {
    return NextResponse.json(
      { error: 'Missing required parameters: team and season' },
      { status: 400 }
    );
  }
  
  try {
    const response = await fetch(`${BASE_URL}/leagues?team=${teamId}&season=${season}`, {
      headers,
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching leagues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leagues data' },
      { status: 500 }
    );
  }
} 