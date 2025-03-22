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
    console.log(`[API DISABLED] Fixture lineups API call would have been made with: fixture=${fixtureId}`);
    
    // Return mock data
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
              player: {
                primary: "ff0000",
                number: "ffffff",
                border: "ff0000"
              },
              goalkeeper: {
                primary: "ffff00",
                number: "000000",
                border: "ffff00"
              }
            }
          },
          coach: {
            id: 19,
            name: "Erik ten Hag",
            photo: "https://media.api-sports.io/football/coachs/19.png"
          },
          formation: "4-2-3-1",
          startXI: [
            {
              player: {
                id: 882,
                name: "David de Gea",
                number: 1,
                pos: "G",
                grid: "1:1"
              }
            },
            {
              player: {
                id: 2935,
                name: "Aaron Wan-Bissaka",
                number: 29,
                pos: "D",
                grid: "2:4"
              }
            },
            {
              player: {
                id: 747,
                name: "Raphaël Varane",
                number: 19,
                pos: "D",
                grid: "2:3"
              }
            },
            {
              player: {
                id: 2935,
                name: "Lisandro Martínez",
                number: 6,
                pos: "D",
                grid: "2:2"
              }
            },
            {
              player: {
                id: 909,
                name: "Luke Shaw",
                number: 23,
                pos: "D",
                grid: "2:1"
              }
            },
            {
              player: {
                id: 905,
                name: "Casemiro",
                number: 18,
                pos: "M",
                grid: "3:2"
              }
            },
            {
              player: {
                id: 908,
                name: "Fred",
                number: 17,
                pos: "M",
                grid: "3:1"
              }
            },
            {
              player: {
                id: 907,
                name: "Bruno Fernandes",
                number: 8,
                pos: "M",
                grid: "4:2"
              }
            },
            {
              player: {
                id: 906,
                name: "Antony",
                number: 21,
                pos: "M",
                grid: "4:3"
              }
            },
            {
              player: {
                id: 903,
                name: "Marcus Rashford",
                number: 10,
                pos: "F",
                grid: "4:1"
              }
            },
            {
              player: {
                id: 904,
                name: "Wout Weghorst",
                number: 27,
                pos: "F",
                grid: "5:1"
              }
            }
          ],
          substitutes: [
            {
              player: {
                id: 883,
                name: "Tom Heaton",
                number: 22,
                pos: "G",
                grid: null
              }
            },
            {
              player: {
                id: 912,
                name: "Harry Maguire",
                number: 5,
                pos: "D",
                grid: null
              }
            },
            {
              player: {
                id: 913,
                name: "Victor Lindelöf",
                number: 2,
                pos: "D",
                grid: null
              }
            },
            {
              player: {
                id: 914,
                name: "Tyrell Malacia",
                number: 12,
                pos: "D",
                grid: null
              }
            },
            {
              player: {
                id: 915,
                name: "Scott McTominay",
                number: 39,
                pos: "M",
                grid: null
              }
            }
          ]
        },
        {
          team: {
            id: 40,
            name: "Liverpool",
            logo: "https://media.api-sports.io/football/teams/40.png",
            colors: {
              player: {
                primary: "d00000",
                number: "ffffff",
                border: "d00000"
              },
              goalkeeper: {
                primary: "5cff33",
                number: "000000",
                border: "5cff33"
              }
            }
          },
          coach: {
            id: 9,
            name: "Jürgen Klopp",
            photo: "https://media.api-sports.io/football/coachs/9.png"
          },
          formation: "4-3-3",
          startXI: [
            {
              player: {
                id: 1795,
                name: "Alisson",
                number: 1,
                pos: "G",
                grid: "1:1"
              }
            },
            {
              player: {
                id: 1796,
                name: "Trent Alexander-Arnold",
                number: 66,
                pos: "D",
                grid: "2:4"
              }
            },
            {
              player: {
                id: 1797,
                name: "Ibrahima Konaté",
                number: 5,
                pos: "D",
                grid: "2:3"
              }
            },
            {
              player: {
                id: 1798,
                name: "Virgil van Dijk",
                number: 4,
                pos: "D",
                grid: "2:2"
              }
            },
            {
              player: {
                id: 1799,
                name: "Andrew Robertson",
                number: 26,
                pos: "D",
                grid: "2:1"
              }
            },
            {
              player: {
                id: 1800,
                name: "Fabinho",
                number: 3,
                pos: "M",
                grid: "3:2"
              }
            },
            {
              player: {
                id: 1801,
                name: "Jordan Henderson",
                number: 14,
                pos: "M",
                grid: "3:3"
              }
            },
            {
              player: {
                id: 1802,
                name: "Thiago Alcántara",
                number: 6,
                pos: "M",
                grid: "3:1"
              }
            },
            {
              player: {
                id: 1803,
                name: "Mohamed Salah",
                number: 11,
                pos: "F",
                grid: "4:3"
              }
            },
            {
              player: {
                id: 1804,
                name: "Darwin Núñez",
                number: 27,
                pos: "F",
                grid: "4:2"
              }
            },
            {
              player: {
                id: 1805,
                name: "Cody Gakpo",
                number: 18,
                pos: "F",
                grid: "4:1"
              }
            }
          ],
          substitutes: [
            {
              player: {
                id: 1806,
                name: "Caoimhin Kelleher",
                number: 62,
                pos: "G",
                grid: null
              }
            },
            {
              player: {
                id: 1807,
                name: "Joe Gomez",
                number: 2,
                pos: "D",
                grid: null
              }
            },
            {
              player: {
                id: 1808,
                name: "Kostas Tsimikas",
                number: 21,
                pos: "D",
                grid: null
              }
            },
            {
              player: {
                id: 1809,
                name: "James Milner",
                number: 7,
                pos: "M",
                grid: null
              }
            },
            {
              player: {
                id: 1810,
                name: "Harvey Elliott",
                number: 19,
                pos: "M",
                grid: null
              }
            }
          ]
        }
      ]
    });
  }
  
  try {
    const response = await fetch(`${BASE_URL}/fixtures/lineups?fixture=${fixtureId}`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching fixture lineups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fixture lineups' },
      { status: 500 }
    );
  }
} 