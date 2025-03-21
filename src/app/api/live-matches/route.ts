import { NextResponse } from 'next/server';

export async function GET() {
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