import { NextResponse } from 'next/server';

// TEMPORARY API DISABLE FLAG - set to true to disable API calls
const DISABLE_API_CALLS = true;

export async function GET() {
  // Skip API call if disabled
  if (DISABLE_API_CALLS) {
    console.log(`[API DISABLED] Live matches API call would have been made`);
    
    // Return mock data
    return NextResponse.json({ 
      matches: [
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
          },
          events: [
            {
              time: {
                elapsed: 25,
                extra: null
              },
              team: {
                id: 33,
                name: "Manchester United",
                logo: "https://media.api-sports.io/football/teams/33.png"
              },
              player: {
                id: 909,
                name: "Mock Player 1"
              },
              assist: {
                id: 910,
                name: "Mock Assist 1"
              },
              type: "Goal",
              detail: "Normal Goal",
              comments: null
            },
            {
              time: {
                elapsed: 55,
                extra: null
              },
              team: {
                id: 40,
                name: "Liverpool",
                logo: "https://media.api-sports.io/football/teams/40.png"
              },
              player: {
                id: 911,
                name: "Mock Player 2"
              },
              assist: {
                id: null,
                name: null
              },
              type: "Goal",
              detail: "Normal Goal",
              comments: null
            },
            {
              time: {
                elapsed: 62,
                extra: null
              },
              team: {
                id: 33,
                name: "Manchester United",
                logo: "https://media.api-sports.io/football/teams/33.png"
              },
              player: {
                id: 912,
                name: "Mock Player 3"
              },
              assist: {
                id: 909,
                name: "Mock Player 1"
              },
              type: "Goal",
              detail: "Normal Goal",
              comments: null
            }
          ]
        }
      ]
    });
  }

  try {
    const response = await fetch('https://api-football-v1.p.rapidapi.com/v3/fixtures?live=all', {
      headers: {
        'x-rapidapi-key': process.env.RAPID_API_KEY!,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
      },
      next: { revalidate: 30 } // 30 seconds cache
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.response) {
      throw new Error('Invalid API response format');
    }

    return NextResponse.json({ matches: data.response });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch live matches' }, 
      { status: 500 }
    );
  }
} 