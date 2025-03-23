import { NextRequest, NextResponse } from 'next/server';
import { headers, BASE_URL } from '@/app/services/sportApi';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const searchTerm = searchParams.get('search');
  
  if (!searchTerm || searchTerm.length < 2) {
    return NextResponse.json({ response: [] });
  }
  
  try {
    const response = await fetch(`${BASE_URL}/leagues?search=${encodeURIComponent(searchTerm)}`, {
      headers,
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error searching leagues:', error);
    return NextResponse.json(
      { error: 'Failed to search leagues' },
      { status: 500 }
    );
  }
} 