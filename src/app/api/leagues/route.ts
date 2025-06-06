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
    const teamId = searchParams.get('team');

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `leagues-${teamId}`;
    const cached = cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`[API] Cache hit for leagues team ${teamId}`);
      return NextResponse.json(cached.data);
    }

    console.log(`[API] Cache miss for leagues team ${teamId}, fetching from RapidAPI`);

    // Fetch from RapidAPI
    const response = await fetch(
      `https://api-football-v1.p.rapidapi.com/v3/leagues?team=${teamId}`,
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

    console.log(`[API] Cached leagues data for team ${teamId}`);
    
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[API] Error fetching leagues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leagues data' },
      { status: 500 }
    );
  }
} 