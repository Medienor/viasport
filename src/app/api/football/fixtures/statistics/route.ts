import { NextResponse } from 'next/server';
import { headers, BASE_URL } from '@/app/services/sportApi';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fixtureId = searchParams.get('fixture');
  
  if (!fixtureId) {
    return NextResponse.json(
      { error: 'Fixture ID is required' },
      { status: 400 }
    );
  }
  
  try {
    const response = await fetch(`${BASE_URL}/fixtures/statistics?fixture=${fixtureId}`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching fixture statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fixture statistics' },
      { status: 500 }
    );
  }
} 