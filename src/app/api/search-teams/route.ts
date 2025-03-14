import { NextResponse } from 'next/server';
import { BASE_URL, headers } from '@/app/services/sportApi';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${BASE_URL}/teams/search?name=${encodeURIComponent(query)}`,
      { headers }
    );
    
    const data = await response.json();
    
    // Transform API response to match our SearchIndexItem format
    const formattedResults = data.response.map((item: any) => ({
      id: item.team.id,
      name: item.team.name,
      type: 'team' as const,
      logo: item.team.logo,
      country: item.team.country
    }));

    return NextResponse.json(formattedResults);
  } catch (err) {
    console.error('Error searching teams:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to search teams' },
      { status: 500 }
    );
  }
}

export const revalidate = 3600; // Cache for 1 hour 