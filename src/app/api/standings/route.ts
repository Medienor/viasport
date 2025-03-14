import { NextRequest, NextResponse } from 'next/server';
import { headers as apiHeaders, BASE_URL } from '@/app/services/sportApi';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const league = searchParams.get('league');
    const season = searchParams.get('season');
    
    // Validate required parameters
    if (!league || !season) {
      return NextResponse.json(
        { error: 'Missing required parameters: league and season are required' },
        { status: 400 }
      );
    }
    
    // Construct the API URL
    const url = new URL(`${BASE_URL}/standings`);
    url.searchParams.append('league', league);
    url.searchParams.append('season', season);
    
    // Log the request for debugging
    console.log(`[API] Fetching standings for league ${league}, season ${season}`);
    
    // Make the request to the football API
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: apiHeaders,
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    // Check if the response is OK
    if (!response.ok) {
      console.error(`[API] Error fetching standings: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `Failed to fetch standings: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    // Parse the response
    const data = await response.json();
    
    // Log success
    console.log(`[API] Successfully fetched standings for league ${league}, season ${season}`);
    
    // Return the data
    return NextResponse.json(data);
  } catch (error) {
    // Log and return any errors
    console.error('[API] Error in standings endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 