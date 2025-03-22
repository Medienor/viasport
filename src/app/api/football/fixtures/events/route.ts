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
    console.log(`[API DISABLED] Fixture events API call would have been made with: fixture=${fixtureId}`);
    
    // Return mock data
    return NextResponse.json({
      get: "fixtures/events",
      parameters: { fixture: fixtureId },
      errors: [],
      results: 7,
      paging: { current: 1, total: 1 },
      response: [
        {
          time: {
            elapsed: 23,
            extra: null
          },
          team: {
            id: 33,
            name: "Manchester United",
            logo: "https://media.api-sports.io/football/teams/33.png"
          },
          player: {
            id: 909,
            name: "Marcus Rashford"
          },
          assist: {
            id: 907,
            name: "Bruno Fernandes"
          },
          type: "Goal",
          detail: "Normal Goal",
          comments: null
        },
        {
          time: {
            elapsed: 35,
            extra: null
          },
          team: {
            id: 40,
            name: "Liverpool",
            logo: "https://media.api-sports.io/football/teams/40.png"
          },
          player: {
            id: 1803,
            name: "Mohamed Salah"
          },
          assist: {
            id: null,
            name: null
          },
          type: "Card",
          detail: "Yellow Card",
          comments: "Foul"
        },
        {
          time: {
            elapsed: 42,
            extra: null
          },
          team: {
            id: 33,
            name: "Manchester United",
            logo: "https://media.api-sports.io/football/teams/33.png"
          },
          player: {
            id: 905,
            name: "Casemiro"
          },
          assist: {
            id: null,
            name: null
          },
          type: "Card",
          detail: "Yellow Card",
          comments: "Foul"
        },
        {
          time: {
            elapsed: 45,
            extra: 2
          },
          team: {
            id: 33,
            name: "Manchester United",
            logo: "https://media.api-sports.io/football/teams/33.png"
          },
          player: {
            id: null,
            name: null
          },
          assist: {
            id: null,
            name: null
          },
          type: "Half End",
          detail: "First Half",
          comments: null
        },
        {
          time: {
            elapsed: 46,
            extra: null
          },
          team: {
            id: 40,
            name: "Liverpool",
            logo: "https://media.api-sports.io/football/teams/40.png"
          },
          player: {
            id: 1810,
            name: "Harvey Elliott"
          },
          assist: {
            id: null,
            name: null
          },
          type: "subst",
          detail: "Substitution 1",
          comments: "Thiago Alcántara"
        },
        {
          time: {
            elapsed: 52,
            extra: null
          },
          team: {
            id: 40,
            name: "Liverpool",
            logo: "https://media.api-sports.io/football/teams/40.png"
          },
          player: {
            id: 1803,
            name: "Mohamed Salah"
          },
          assist: {
            id: 1804,
            name: "Darwin Núñez"
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
            id: 903,
            name: "Marcus Rashford"
          },
          assist: {
            id: 907,
            name: "Bruno Fernandes"
          },
          type: "Goal",
          detail: "Normal Goal",
          comments: null
        }
      ]
    });
  }
  
  try {
    const response = await fetch(`${BASE_URL}/fixtures/events?fixture=${fixtureId}`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching fixture events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fixture events' },
      { status: 500 }
    );
  }
} 