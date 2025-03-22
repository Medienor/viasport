import { NextResponse } from 'next/server';
import { getLiveMatches } from '@/app/services/sportApi';

// TEMPORARY API DISABLE FLAG - set to true to disable API calls
const DISABLE_API_CALLS = true;

// Define a type for the fixture with formattedTime
interface Fixture {
  fixture: {
    id: number;
    referee: string;
    timezone: string;
    date: string;
    timestamp: number;
    periods: {
      first: number;
      second: number | null;
    };
    venue: {
      id: number;
      name: string;
      city: string;
    };
    status: {
      long: string;
      short: string;
      elapsed: number;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
    round: string;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
    away: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    halftime: {
      home: number | null;
      away: number | null;
    };
    fulltime: {
      home: number | null;
      away: number | null;
    };
    extratime: {
      home: number | null;
      away: number | null;
    };
    penalty: {
      home: number | null;
      away: number | null;
    };
  };
  formattedTime?: string; // Add the formattedTime property as optional
}

export async function GET(
  request: Request,
  { params }: { params: { sport: string } }
) {
  const sport = params.sport;
  
  try {
    // Skip API call if disabled
    if (DISABLE_API_CALLS) {
      console.log(`[API DISABLED] Live matches API call would have been made for sport: ${sport}`);
      
      // For football, return mock data
      if (sport === 'fotball') {
        // Create mock data
        const mockFixtures: Fixture[] = [
          {
            fixture: {
              id: 1001,
              referee: "M. Oliver",
              timezone: "UTC",
              date: new Date().toISOString(),
              timestamp: Math.floor(Date.now() / 1000),
              periods: {
                first: Math.floor(Date.now() / 1000) - 2400,
                second: Math.floor(Date.now() / 1000) - 900
              },
              venue: {
                id: 556,
                name: "Old Trafford",
                city: "Manchester"
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
          },
          {
            fixture: {
              id: 1002,
              referee: "A. Taylor",
              timezone: "UTC",
              date: new Date().toISOString(),
              timestamp: Math.floor(Date.now() / 1000),
              periods: {
                first: Math.floor(Date.now() / 1000) - 1800,
                second: null
              },
              venue: {
                id: 555,
                name: "Etihad Stadium",
                city: "Manchester"
              },
              status: {
                long: "First Half",
                short: "1H",
                elapsed: 30
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
              home: 1,
              away: 0
            },
            score: {
              halftime: {
                home: null,
                away: null
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
          },
          {
            fixture: {
              id: 1003,
              referee: "C. Kavanagh",
              timezone: "UTC",
              date: new Date().toISOString(),
              timestamp: Math.floor(Date.now() / 1000),
              periods: {
                first: Math.floor(Date.now() / 1000) - 2700,
                second: Math.floor(Date.now() / 1000) - 600
              },
              venue: {
                id: 494,
                name: "Emirates Stadium",
                city: "London"
              },
              status: {
                long: "Second Half",
                short: "2H",
                elapsed: 75
              }
            },
            league: {
              id: 140,
              name: "La Liga",
              country: "Spain",
              logo: "https://media.api-sports.io/football/leagues/140.png",
              flag: "https://media.api-sports.io/flags/es.svg",
              season: 2023,
              round: "Regular Season - 15"
            },
            teams: {
              home: {
                id: 529,
                name: "Barcelona",
                logo: "https://media.api-sports.io/football/teams/529.png",
                winner: false
              },
              away: {
                id: 541,
                name: "Real Madrid",
                logo: "https://media.api-sports.io/football/teams/541.png",
                winner: true
              }
            },
            goals: {
              home: 1,
              away: 2
            },
            score: {
              halftime: {
                home: 1,
                away: 1
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
        ];
        
        // Format the time for each fixture
        mockFixtures.forEach(fixture => {
          const date = new Date(fixture.fixture.date);
          fixture.formattedTime = date.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
        });
        
        // Group fixtures by league
        const fixturesByLeague = mockFixtures.reduce((acc: Record<string, Fixture[]>, fixture: Fixture) => {
          const leagueId = fixture.league.id.toString();
          if (!acc[leagueId]) {
            acc[leagueId] = [];
          }
          acc[leagueId].push(fixture);
          return acc;
        }, {});
        
        // Sort leagues by number of fixtures (more fixtures first)
        const sortedLeagues = Object.keys(fixturesByLeague).sort((a, b) => {
          return fixturesByLeague[b].length - fixturesByLeague[a].length;
        });
        
        return NextResponse.json({ fixturesByLeague, sortedLeagues });
      } 
      // For other sports, return empty data
      else {
        return NextResponse.json({ fixturesByLeague: {}, sortedLeagues: [] });
      }
    }
    
    // For football, use the existing sportApi service
    if (sport === 'fotball') {
      const matches = await getLiveMatches();
      
      // Group fixtures by league
      const fixturesByLeague = matches.reduce((acc: Record<string, any[]>, fixture: any) => {
        const leagueId = fixture.league.id.toString();
        if (!acc[leagueId]) {
          acc[leagueId] = [];
        }
        
        // Format the time for each fixture
        const date = new Date(fixture.fixture.date);
        fixture.formattedTime = date.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
        
        acc[leagueId].push(fixture);
        return acc;
      }, {});
      
      // Sort leagues by number of fixtures (more fixtures first)
      const sortedLeagues = Object.keys(fixturesByLeague).sort((a, b) => {
        return fixturesByLeague[b].length - fixturesByLeague[a].length;
      });
      
      return NextResponse.json({ fixturesByLeague, sortedLeagues });
    } 
    // For other sports, implement their respective API calls
    else {
      return NextResponse.json({ fixturesByLeague: {}, sortedLeagues: [] });
    }
  } catch (error) {
    console.error(`Error fetching live ${sport} matches:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch live matches' },
      { status: 500 }
    );
  }
} 