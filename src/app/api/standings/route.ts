import { NextRequest, NextResponse } from 'next/server';
import { headers as apiHeaders, BASE_URL } from '@/app/services/sportApi';

// TEMPORARY API DISABLE FLAG - set to true to disable API calls
const DISABLE_API_CALLS = true;

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
    
    // Skip API call if disabled
    if (DISABLE_API_CALLS) {
      console.log(`[API DISABLED] Standings API call would have been made with: league=${league}, season=${season}`);
      
      // Return mock data
      return NextResponse.json({
        get: "standings",
        parameters: { league, season },
        errors: [],
        results: 1,
        paging: { current: 1, total: 1 },
        response: [{
          league: {
            id: parseInt(league),
            name: "API Disabled League",
            country: "Norway",
            logo: "/images/league-placeholder.png",
            flag: "/images/flag-placeholder.png",
            season: parseInt(season),
            standings: [
              [
                {
                  rank: 1,
                  team: {
                    id: 1,
                    name: "Team 1",
                    logo: "/images/team-placeholder.png"
                  },
                  points: 30,
                  goalsDiff: 15,
                  group: "Premier League",
                  form: "WWDWW",
                  status: "same",
                  description: "Promotion - Champions League",
                  all: {
                    played: 10,
                    win: 9,
                    draw: 3,
                    lose: 0,
                    goals: { for: 25, against: 10 }
                  },
                  home: {
                    played: 5,
                    win: 5,
                    draw: 0,
                    lose: 0,
                    goals: { for: 15, against: 5 }
                  },
                  away: {
                    played: 5,
                    win: 4,
                    draw: 1,
                    lose: 0,
                    goals: { for: 10, against: 5 }
                  },
                  update: "2023-04-16T00:00:00+00:00"
                },
                {
                  rank: 2,
                  team: {
                    id: 2,
                    name: "Team 2",
                    logo: "/images/team-placeholder.png"
                  },
                  points: 25,
                  goalsDiff: 10,
                  group: "Premier League",
                  form: "WDWLW",
                  status: "same",
                  description: "Promotion - Champions League",
                  all: {
                    played: 10,
                    win: 8,
                    draw: 1,
                    lose: 1,
                    goals: { for: 20, against: 10 }
                  },
                  home: {
                    played: 5,
                    win: 4,
                    draw: 1,
                    lose: 0,
                    goals: { for: 12, against: 4 }
                  },
                  away: {
                    played: 5,
                    win: 4,
                    draw: 0,
                    lose: 1,
                    goals: { for: 8, against: 6 }
                  },
                  update: "2023-04-16T00:00:00+00:00"
                }
              ]
            ]
          }
        }]
      });
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