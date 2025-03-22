import { NextRequest, NextResponse } from 'next/server';

// TEMPORARY API DISABLE FLAG - set to true to disable API calls
const DISABLE_API_CALLS = true;

export async function GET(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
    // Get the date from the URL parameter
    const date = params.date;
    
    console.log(`Fetching fixtures for date: ${date}`);
    
    // Skip API call if disabled
    if (DISABLE_API_CALLS) {
      console.log(`[API DISABLED] Fixtures by date API call would have been made for date: ${date}`);
      
      // Return mock data
      return NextResponse.json({
        get: "fixtures",
        parameters: { date: date },
        errors: [],
        results: 2,
        paging: { current: 1, total: 1 },
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
          }
        ]
      });
    }
    
    // Use a hardcoded API key for testing if needed
    const apiKey = process.env.RAPID_API_KEY;
    if (!apiKey) {
      console.error('RAPID_API_KEY is not defined in environment variables');
      return NextResponse.json(
        { error: 'API key is not configured' },
        { status: 500 }
      );
    }
    
    // Construct the API URL
    const apiUrl = `https://api-football-v1.p.rapidapi.com/v3/fixtures?date=${date}`;
    console.log(`API URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}): ${errorText}`);
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error in fixtures API route:`, error);
    return NextResponse.json(
      { error: `Failed to fetch fixtures`, message: (error as Error).message },
      { status: 500 }
    );
  }
} 