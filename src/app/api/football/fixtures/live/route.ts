import { NextResponse } from 'next/server';
import { headers, BASE_URL } from '@/app/services/sportApi';

export async function GET() {
  try {
    const response = await fetch(`${BASE_URL}/fixtures?live=all`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching live fixtures:', error);
    return NextResponse.json(
      { error: 'Failed to fetch live fixtures' },
      { status: 500 }
    );
  }
} 