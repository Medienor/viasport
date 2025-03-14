export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

const API_KEY = 'a985a864bd184fcba3f0a89e92aadf08';
const BASE_URL = 'https://api.football-data.org/v4';

export async function GET() {
  try {
    const response = await fetch(`${BASE_URL}/competitions/CL`, {
      headers: {
        'X-Auth-Token': API_KEY
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error testing football API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from football API' },
      { status: 500 }
    );
  }
} 