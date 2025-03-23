import { NextResponse } from 'next/server';

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