import { NextRequest, NextResponse } from 'next/server';
import { BASE_URL, headers } from '@/app/services/sportApi';

// TEMPORARY API DISABLE FLAG - set to true to disable API calls
const DISABLE_API_CALLS = true;

export async function GET(
  request: NextRequest,
  context: { params: { date: string } }
) {
  try {
    const date = context.params.date;
    console.log(`Fetching calendar matches for date: ${date}`);
    
    // Skip API call if disabled
    if (DISABLE_API_CALLS) {
      console.log(`[API DISABLED] Calendar API call would have been made for date: ${date}`);
      
      // Return mock data
      return NextResponse.json({ 
        response: [
          {
            fixture: {
              id: 1001,
              referee: "M. Oliver",
              timezone: "UTC",
              date: `${date}T15:00:00+00:00`,
              timestamp: Math.floor(new Date(`${date}T15:00:00+00:00`).getTime() / 1000),
              periods: {
                first: Math.floor(new Date(`${date}T15:00:00+00:00`).getTime() / 1000),
                second: Math.floor(new Date(`${date}T16:00:00+00:00`).getTime() / 1000)
              },
              venue: {
                id: 556,
                name: "Old Trafford",
                city: "Manchester"
              },
              status: {
                long: "Match Finished",
                short: "FT",
                elapsed: 90
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
                home: 2,
                away: 1
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
          },
          {
            fixture: {
              id: 1002,
              referee: "A. Taylor",
              timezone: "UTC",
              date: `${date}T17:30:00+00:00`,
              timestamp: Math.floor(new Date(`${date}T17:30:00+00:00`).getTime() / 1000),
              periods: {
                first: Math.floor(new Date(`${date}T17:30:00+00:00`).getTime() / 1000),
                second: Math.floor(new Date(`${date}T18:30:00+00:00`).getTime() / 1000)
              },
              venue: {
                id: 555,
                name: "Etihad Stadium",
                city: "Manchester"
              },
              status: {
                long: "Match Finished",
                short: "FT",
                elapsed: 90
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
                id: 50,
                name: "Manchester City",
                logo: "https://media.api-sports.io/football/teams/50.png",
                winner: true
              },
              away: {
                id: 47,
                name: "Tottenham",
                logo: "https://media.api-sports.io/football/teams/47.png",
                winner: false
              }
            },
            goals: {
              home: 3,
              away: 0
            },
            score: {
              halftime: {
                home: 1,
                away: 0
              },
              fulltime: {
                home: 3,
                away: 0
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
          },
          {
            fixture: {
              id: 1003,
              referee: "C. Kavanagh",
              timezone: "UTC",
              date: `${date}T14:00:00+00:00`,
              timestamp: Math.floor(new Date(`${date}T14:00:00+00:00`).getTime() / 1000),
              periods: {
                first: Math.floor(new Date(`${date}T14:00:00+00:00`).getTime() / 1000),
                second: Math.floor(new Date(`${date}T15:00:00+00:00`).getTime() / 1000)
              },
              venue: {
                id: 494,
                name: "Emirates Stadium",
                city: "London"
              },
              status: {
                long: "Match Finished",
                short: "FT",
                elapsed: 90
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
                id: 42,
                name: "Arsenal",
                logo: "https://media.api-sports.io/football/teams/42.png",
                winner: true
              },
              away: {
                id: 49,
                name: "Chelsea",
                logo: "https://media.api-sports.io/football/teams/49.png",
                winner: false
              }
            },
            goals: {
              home: 2,
              away: 0
            },
            score: {
              halftime: {
                home: 1,
                away: 0
              },
              fulltime: {
                home: 2,
                away: 0
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
        ]
      });
    }
    
    const response = await fetch(`${BASE_URL}/fixtures?date=${date}`, { 
      headers,
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Return all matches for the day (including live ones)
    return NextResponse.json({ response: data.response });
  } catch (error) {
    console.error('Error in calendar API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar matches' },
      { status: 500 }
    );
  }
} 