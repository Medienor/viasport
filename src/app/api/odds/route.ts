import { NextRequest, NextResponse } from 'next/server';

// TEMPORARY API DISABLE FLAG - set to true to disable API calls
const DISABLE_API_CALLS = true;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fixture = searchParams.get('fixture');
  
  if (!fixture) {
    return NextResponse.json({ error: 'Fixture ID is required' }, { status: 400 });
  }
  
  // Skip API call if disabled
  if (DISABLE_API_CALLS) {
    console.log(`[API DISABLED] Odds API call would have been made with: fixture=${fixture}`);
    
    // Return mock data
    return NextResponse.json({
      get: "odds",
      parameters: { fixture },
      errors: [],
      results: 1,
      paging: { current: 1, total: 1 },
      response: [{
        league: {
          id: 39,
          name: "Premier League",
          country: "England",
          logo: "https://media.api-sports.io/football/leagues/39.png",
          flag: "https://media.api-sports.io/flags/gb.svg",
          season: 2023
        },
        fixture: {
          id: parseInt(fixture),
          timezone: "UTC",
          date: "2023-04-16T13:00:00+00:00",
          timestamp: 1681650000
        },
        bookmakers: [
          {
            id: 1,
            name: "Mock Bookmaker",
            bets: [
              {
                id: 1,
                name: "Match Winner",
                values: [
                  {
                    value: "Home",
                    odd: "2.00"
                  },
                  {
                    value: "Draw",
                    odd: "3.40"
                  },
                  {
                    value: "Away",
                    odd: "3.60"
                  }
                ]
              }
            ]
          }
        ]
      }]
    });
  }
  
  try {
    const apiKey = process.env.RAPIDAPI_KEY || '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90';
    
    const response = await fetch(`https://api-football-v1.p.rapidapi.com/v3/odds?fixture=${fixture}`, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
      }
    });
    
    if (!response.ok) {
      console.error('API response error:', response.status, response.statusText);
      return NextResponse.json({ error: 'Failed to fetch odds data' }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error fetching odds:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 