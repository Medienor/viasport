import { NextResponse } from 'next/server';

// TEMPORARY API DISABLE FLAG - set to true to disable API calls
const DISABLE_API_CALLS = true;

export async function GET(
  request: Request,
  { params }: { params: { type: string } }
) {
  const { searchParams } = new URL(request.url);
  const fixtureId = searchParams.get('fixture');
  const type = params.type; // 'statistics', 'events', or 'lineups'

  if (!fixtureId) {
    return NextResponse.json({ error: 'Fixture ID is required' }, { status: 400 });
  }

  // Skip API call if disabled
  if (DISABLE_API_CALLS) {
    console.log(`[API DISABLED] Fixture ${type} API call would have been made with: fixture=${fixtureId}`);
    
    // Return mock data based on the type
    if (type === 'statistics') {
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
              { type: "Shots on Goal", value: 5 },
              { type: "Shots off Goal", value: 7 },
              { type: "Total Shots", value: 12 },
              { type: "Blocked Shots", value: 2 },
              { type: "Shots insidebox", value: 8 },
              { type: "Shots outsidebox", value: 4 },
              { type: "Fouls", value: 10 },
              { type: "Corner Kicks", value: 6 },
              { type: "Offsides", value: 2 },
              { type: "Ball Possession", value: "55%" },
              { type: "Yellow Cards", value: 2 },
              { type: "Red Cards", value: 0 },
              { type: "Goalkeeper Saves", value: 3 },
              { type: "Total passes", value: 450 },
              { type: "Passes accurate", value: 385 },
              { type: "Passes %", value: "86%" }
            ]
          },
          {
            team: {
              id: 40,
              name: "Liverpool",
              logo: "https://media.api-sports.io/football/teams/40.png"
            },
            statistics: [
              { type: "Shots on Goal", value: 4 },
              { type: "Shots off Goal", value: 6 },
              { type: "Total Shots", value: 10 },
              { type: "Blocked Shots", value: 3 },
              { type: "Shots insidebox", value: 7 },
              { type: "Shots outsidebox", value: 3 },
              { type: "Fouls", value: 12 },
              { type: "Corner Kicks", value: 5 },
              { type: "Offsides", value: 3 },
              { type: "Ball Possession", value: "45%" },
              { type: "Yellow Cards", value: 1 },
              { type: "Red Cards", value: 0 },
              { type: "Goalkeeper Saves", value: 5 },
              { type: "Total passes", value: 380 },
              { type: "Passes accurate", value: 310 },
              { type: "Passes %", value: "82%" }
            ]
          }
        ]
      });
    } else if (type === 'events') {
      return NextResponse.json({
        get: "fixtures/events",
        parameters: { fixture: fixtureId },
        errors: [],
        results: 7,
        paging: { current: 1, total: 1 },
        response: [
          {
            time: { elapsed: 23, extra: null },
            team: {
              id: 33,
              name: "Manchester United",
              logo: "https://media.api-sports.io/football/teams/33.png"
            },
            player: { id: 909, name: "Marcus Rashford" },
            assist: { id: 907, name: "Bruno Fernandes" },
            type: "Goal",
            detail: "Normal Goal",
            comments: null
          },
          {
            time: { elapsed: 35, extra: null },
            team: {
              id: 40,
              name: "Liverpool",
              logo: "https://media.api-sports.io/football/teams/40.png"
            },
            player: { id: 1803, name: "Mohamed Salah" },
            assist: { id: null, name: null },
            type: "Card",
            detail: "Yellow Card",
            comments: "Foul"
          },
          {
            time: { elapsed: 42, extra: null },
            team: {
              id: 33,
              name: "Manchester United",
              logo: "https://media.api-sports.io/football/teams/33.png"
            },
            player: { id: 905, name: "Casemiro" },
            assist: { id: null, name: null },
            type: "Card",
            detail: "Yellow Card",
            comments: "Foul"
          },
          {
            time: { elapsed: 45, extra: 2 },
            team: {
              id: 33,
              name: "Manchester United",
              logo: "https://media.api-sports.io/football/teams/33.png"
            },
            player: { id: null, name: null },
            assist: { id: null, name: null },
            type: "Half End",
            detail: "First Half",
            comments: null
          },
          {
            time: { elapsed: 52, extra: null },
            team: {
              id: 40,
              name: "Liverpool",
              logo: "https://media.api-sports.io/football/teams/40.png"
            },
            player: { id: 1803, name: "Mohamed Salah" },
            assist: { id: 1804, name: "Darwin Núñez" },
            type: "Goal",
            detail: "Normal Goal",
            comments: null
          },
          {
            time: { elapsed: 62, extra: null },
            team: {
              id: 33,
              name: "Manchester United",
              logo: "https://media.api-sports.io/football/teams/33.png"
            },
            player: { id: 903, name: "Marcus Rashford" },
            assist: { id: 907, name: "Bruno Fernandes" },
            type: "Goal",
            detail: "Normal Goal",
            comments: null
          }
        ]
      });
    } else if (type === 'lineups') {
      return NextResponse.json({
        get: "fixtures/lineups",
        parameters: { fixture: fixtureId },
        errors: [],
        results: 2,
        paging: { current: 1, total: 1 },
        response: [
          {
            team: {
              id: 33,
              name: "Manchester United",
              logo: "https://media.api-sports.io/football/teams/33.png",
              colors: {
                player: { primary: "ff0000", number: "ffffff", border: "ff0000" },
                goalkeeper: { primary: "ffff00", number: "000000", border: "ffff00" }
              }
            },
            coach: {
              id: 19,
              name: "Erik ten Hag",
              photo: "https://media.api-sports.io/football/coachs/19.png"
            },
            formation: "4-2-3-1",
            startXI: [
              { player: { id: 882, name: "David de Gea", number: 1, pos: "G", grid: "1:1" } },
              { player: { id: 2935, name: "Aaron Wan-Bissaka", number: 29, pos: "D", grid: "2:4" } },
              { player: { id: 747, name: "Raphaël Varane", number: 19, pos: "D", grid: "2:3" } },
              { player: { id: 2935, name: "Lisandro Martínez", number: 6, pos: "D", grid: "2:2" } },
              { player: { id: 909, name: "Luke Shaw", number: 23, pos: "D", grid: "2:1" } },
              { player: { id: 905, name: "Casemiro", number: 18, pos: "M", grid: "3:2" } },
              { player: { id: 908, name: "Fred", number: 17, pos: "M", grid: "3:1" } },
              { player: { id: 907, name: "Bruno Fernandes", number: 8, pos: "M", grid: "4:2" } },
              { player: { id: 906, name: "Antony", number: 21, pos: "M", grid: "4:3" } },
              { player: { id: 903, name: "Marcus Rashford", number: 10, pos: "F", grid: "4:1" } },
              { player: { id: 904, name: "Wout Weghorst", number: 27, pos: "F", grid: "5:1" } }
            ],
            substitutes: [
              { player: { id: 883, name: "Tom Heaton", number: 22, pos: "G", grid: null } },
              { player: { id: 910, name: "Harry Maguire", number: 5, pos: "D", grid: null } },
              { player: { id: 911, name: "Tyrell Malacia", number: 12, pos: "D", grid: null } },
              { player: { id: 912, name: "Scott McTominay", number: 39, pos: "M", grid: null } },
              { player: { id: 913, name: "Jadon Sancho", number: 25, pos: "F", grid: null } }
            ]
          },
          {
            team: {
              id: 40,
              name: "Liverpool",
              logo: "https://media.api-sports.io/football/teams/40.png",
              colors: {
                player: { primary: "ff0000", number: "ffffff", border: "ff0000" },
                goalkeeper: { primary: "ffff00", number: "000000", border: "ffff00" }
              }
            },
            coach: {
              id: 20,
              name: "Jürgen Klopp",
              photo: "https://media.api-sports.io/football/coachs/20.png"
            },
            formation: "4-3-3",
            startXI: [
              { player: { id: 1795, name: "Alisson", number: 1, pos: "G", grid: "1:1" } },
              { player: { id: 1796, name: "Trent Alexander-Arnold", number: 66, pos: "D", grid: "2:4" } },
              { player: { id: 1797, name: "Ibrahima Konaté", number: 5, pos: "D", grid: "2:3" } },
              { player: { id: 1798, name: "Virgil van Dijk", number: 4, pos: "D", grid: "2:2" } },
              { player: { id: 1799, name: "Andrew Robertson", number: 26, pos: "D", grid: "2:1" } },
              { player: { id: 1800, name: "Fabinho", number: 3, pos: "M", grid: "3:2" } },
              { player: { id: 1801, name: "Jordan Henderson", number: 14, pos: "M", grid: "3:3" } },
              { player: { id: 1802, name: "Thiago Alcántara", number: 6, pos: "M", grid: "3:1" } },
              { player: { id: 1803, name: "Mohamed Salah", number: 11, pos: "F", grid: "4:3" } },
              { player: { id: 1804, name: "Darwin Núñez", number: 27, pos: "F", grid: "4:2" } },
              { player: { id: 1805, name: "Cody Gakpo", number: 18, pos: "F", grid: "4:1" } }
            ],
            substitutes: [
              { player: { id: 1806, name: "Caoimhin Kelleher", number: 62, pos: "G", grid: null } },
              { player: { id: 1807, name: "Joe Gomez", number: 2, pos: "D", grid: null } },
              { player: { id: 1808, name: "Kostas Tsimikas", number: 21, pos: "D", grid: null } },
              { player: { id: 1809, name: "James Milner", number: 7, pos: "M", grid: null } },
              { player: { id: 1810, name: "Harvey Elliott", number: 19, pos: "M", grid: null } }
            ]
          }
        ]
      });
    } else {
      return NextResponse.json({
        error: `Unknown fixture data type: ${type}`,
        validTypes: ['statistics', 'events', 'lineups']
      }, { status: 400 });
    }
  }

  try {
    const response = await fetch(
      `https://api-football-v1.p.rapidapi.com/v3/fixtures/${type}?fixture=${fixtureId}`,
      {
        headers: {
          'x-rapidapi-key': process.env.RAPID_API_KEY!,
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
        },
        next: { revalidate: 30 } // 30 seconds cache
      }
    );

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error fetching ${type}:`, error);
    return NextResponse.json(
      { error: `Failed to fetch ${type}` },
      { status: 500 }
    );
  }
} 