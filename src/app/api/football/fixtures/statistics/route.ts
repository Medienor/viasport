import { NextResponse } from 'next/server';
import { headers, BASE_URL } from '@/app/services/sportApi';

// TEMPORARY API DISABLE FLAG - set to true to disable API calls
const DISABLE_API_CALLS = true;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fixtureId = searchParams.get('fixture');
  
  if (!fixtureId) {
    return NextResponse.json(
      { error: 'Fixture ID is required' },
      { status: 400 }
    );
  }
  
  // Skip API call if disabled
  if (DISABLE_API_CALLS) {
    console.log(`[API DISABLED] Fixture statistics API call would have been made with: fixture=${fixtureId}`);
    
    // Return mock data
    return NextResponse.json({
      get: "fixtures/statistics",
      parameters: { fixture: fixtureId },
      errors: [],
      results: 2,
      paging: { current: 1, total: 1 },
      response: [
        {
          team: {
            id: 33,
            name: "Manchester United",
            logo: "https://media.api-sports.io/football/teams/33.png"
          },
          statistics: [
            {
              type: "Shots on Goal",
              value: 5
            },
            {
              type: "Shots off Goal",
              value: 7
            },
            {
              type: "Total Shots",
              value: 12
            },
            {
              type: "Blocked Shots",
              value: 2
            },
            {
              type: "Shots insidebox",
              value: 8
            },
            {
              type: "Shots outsidebox",
              value: 4
            },
            {
              type: "Fouls",
              value: 10
            },
            {
              type: "Corner Kicks",
              value: 6
            },
            {
              type: "Offsides",
              value: 2
            },
            {
              type: "Ball Possession",
              value: "55%"
            },
            {
              type: "Yellow Cards",
              value: 2
            },
            {
              type: "Red Cards",
              value: 0
            },
            {
              type: "Goalkeeper Saves",
              value: 3
            },
            {
              type: "Total passes",
              value: 450
            },
            {
              type: "Passes accurate",
              value: 385
            },
            {
              type: "Passes %",
              value: "86%"
            }
          ]
        },
        {
          team: {
            id: 40,
            name: "Liverpool",
            logo: "https://media.api-sports.io/football/teams/40.png"
          },
          statistics: [
            {
              type: "Shots on Goal",
              value: 4
            },
            {
              type: "Shots off Goal",
              value: 6
            },
            {
              type: "Total Shots",
              value: 10
            },
            {
              type: "Blocked Shots",
              value: 3
            },
            {
              type: "Shots insidebox",
              value: 7
            },
            {
              type: "Shots outsidebox",
              value: 3
            },
            {
              type: "Fouls",
              value: 12
            },
            {
              type: "Corner Kicks",
              value: 5
            },
            {
              type: "Offsides",
              value: 3
            },
            {
              type: "Ball Possession",
              value: "45%"
            },
            {
              type: "Yellow Cards",
              value: 1
            },
            {
              type: "Red Cards",
              value: 0
            },
            {
              type: "Goalkeeper Saves",
              value: 5
            },
            {
              type: "Total passes",
              value: 380
            },
            {
              type: "Passes accurate",
              value: 310
            },
            {
              type: "Passes %",
              value: "82%"
            }
          ]
        }
      ]
    });
  }
  
  try {
    const response = await fetch(`${BASE_URL}/fixtures/statistics?fixture=${fixtureId}`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching fixture statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fixture statistics' },
      { status: 500 }
    );
  }
} 