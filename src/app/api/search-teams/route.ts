import { NextResponse } from 'next/server';
import { BASE_URL, headers } from '@/app/services/sportApi';

// TEMPORARY API DISABLE FLAG - set to true to disable API calls
const DISABLE_API_CALLS = true;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  // Skip API call if disabled
  if (DISABLE_API_CALLS) {
    console.log(`[API DISABLED] Search teams API call would have been made with: query=${query}`);
    
    // Return mock data
    return NextResponse.json([
      {
        id: 33,
        name: "Manchester United",
        type: "team",
        logo: "https://media.api-sports.io/football/teams/33.png",
        country: "England"
      },
      {
        id: 40,
        name: "Liverpool",
        type: "team",
        logo: "https://media.api-sports.io/football/teams/40.png",
        country: "England"
      }
    ]);
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