import { NextResponse } from 'next/server';
import { BASE_URL, headers } from '@/app/services/sportApi';

export async function GET() {
  try {
    const response = await fetch(`${BASE_URL}/fixtures?live=all`, { headers });
    const data = await response.json();
    
    return NextResponse.json(data.response);
  } catch (err: unknown) {
    console.error('Error fetching live fixtures:', err); // Log the error
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch live fixtures' }, 
      { status: 500 }
    );
  }
}

export const revalidate = 30; // Revalidate every 30 seconds 