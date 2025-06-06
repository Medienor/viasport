import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// RapidAPI configuration
const RAPIDAPI_KEY = '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90';
const RAPIDAPI_HOST = 'api-football-v1.p.rapidapi.com';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const league = searchParams.get('league');
    const season = searchParams.get('season');

    if (!league || !season) {
      return NextResponse.json(
        { error: 'League ID and season are required' },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `standings-${league}-${season}`;
    const cached = cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`[API] Cache hit for standings league ${league}, season ${season}`);
      return NextResponse.json(cached.data);
    }

    console.log(`[API] Cache miss for standings league ${league}, season ${season}, fetching from RapidAPI`);

    // Fetch from RapidAPI
    const response = await fetch(
      `https://api-football-v1.p.rapidapi.com/v3/standings?league=${league}&season=${season}`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': RAPIDAPI_HOST,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`RapidAPI responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Cache the response
    cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    console.log(`[API] Cached standings data for league ${league}, season ${season}`);
    
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[API] Error fetching standings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch standings data' },
      { status: 500 }
    );
  }
} 