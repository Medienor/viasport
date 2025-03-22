import { NextResponse } from 'next/server';
import { BASE_URL, headers } from '@/app/services/sportApi';

// TEMPORARY API DISABLE FLAG - set to true to disable API calls
const DISABLE_API_CALLS = true;

export async function GET() {
  // Skip API call if disabled
  if (DISABLE_API_CALLS) {
    console.log(`[API DISABLED] Live fixtures API call would have been made`);
    
    // Return mock data with a single live fixture
    return NextResponse.json([
      {
        fixture: {
          id: 1001,
          referee: "Mock Referee",
          timezone: "UTC",
          date: new Date().toISOString(),
          timestamp: Math.floor(Date.now() / 1000),
          periods: {
            first: Math.floor(Date.now() / 1000) - 2400,
            second: Math.floor(Date.now() / 1000) - 900
          },
          venue: {
            id: 555,
            name: "Mock Stadium",
            city: "Mock City"
          },
          status: {
            long: "Second Half",
            short: "2H",
            elapsed: 65
          }
        },
        league: {
          id: 39,
          name: "Premier League",
          country: "England",
          logo: "https://media.api-sports.io/football/leagues/39.png",
          flag: "https://media.api-sports.io/flags/gb.svg",
          season: 2023,
          round: "Regular Season - 15"
        },
        teams: {
          home: {
            id: 33,
            name: "Manchester United",
            logo: "https://media.api-sports.io/football/teams/33.png",
            winner: true
          },
          away: {
            id: 40,
            name: "Liverpool",
            logo: "https://media.api-sports.io/football/teams/40.png",
            winner: false
          }
        },
        goals: {
          home: 2,
          away: 1
        },
        score: {
          halftime: {
            home: 1,
            away: 0
          },
          fulltime: {
            home: null,
            away: null
          },
          extratime: {
            home: null,
            away: null
          },
          penalty: {
            home: null,
            away: null
          }
        }
      }
    ]);
  }
  
  try {
    const response = await fetch(`${BASE_URL}/fixtures?live=all`, { headers });
    const data = await response.json();
    
    // Check if data.response exists and is an array
    if (!data.response || !Array.isArray(data.response)) {
      console.error('Invalid API response format:', data);
      return NextResponse.json(
        { error: 'Invalid API response format', data: data }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json(data.response);
  } catch (err: unknown) {
    console.error('Error fetching live fixtures:', err); // Log the error
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch live fixtures' }, 
      { status: 500 }
    );
  }
}

export const revalidate = 30; // Revalidate every 30 seconds 