import { NextResponse } from 'next/server';
import { BASE_URL, headers } from '@/app/services/sportApi';

export async function GET() {
  try {
    const response = await fetch(`${BASE_URL}/fixtures?live=all`, { headers });
    const data = await response.json();
    
    // Check if data.response exists and is an array
    if (!data.response || !Array.isArray(data.response)) {
      console.error('Invalid API response format:', data);
      return NextResponse.json(
        { error: 'Invalid API response format', data: data }, 
        { status: 500 }
      );
    }
    
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