import { NextRequest, NextResponse } from 'next/server';
import { BASE_URL, headers } from '@/app/services/sportApi';

export async function GET(
  request: NextRequest,
  context: { params: { date: string } }
) {
  try {
    const date = context.params.date;
    console.log(`Fetching calendar matches for date: ${date}`);
    
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