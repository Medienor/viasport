import { NextRequest, NextResponse } from 'next/server';

// Define types for the API responses
interface Team {
  id: number;
  name: string;
  country?: string;
  logo?: string;
}

interface League {
  id: number;
  name: string;
  country?: string;
  logo?: string;
  type?: string;
}

interface Season {
  year: number;
  start?: string;
  end?: string;
  current?: boolean;
}

interface LeagueData {
  league: League;
  seasons: Season[];
}

interface Fixture {
  league: League;
  teams: {
    home: Team;
    away: Team;
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  fixture: {
    id: number;
    date: string;
    venue?: {
      name?: string;
      city?: string;
    };
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const teamId = searchParams.get('team');
  
  if (!teamId) {
    return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
  }
  
  try {
    // First, get the team details
    await fetch(
      `https://api-football-v1.p.rapidapi.com/v3/teams?id=${teamId}`,
      { 
        headers: {
          'x-rapidapi-key': '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90',
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
        }
      }
    );
    
    // Get current year for filtering current seasons
    const currentYear = new Date().getFullYear();
    
    // Get fixtures for this team for the current season
    const fixturesResponse = await fetch(
      `https://api-football-v1.p.rapidapi.com/v3/fixtures?team=${teamId}&season=${currentYear}`,
      { 
        headers: {
          'x-rapidapi-key': '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90',
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
        }
      }
    );
    
    const fixturesData = await fixturesResponse.json();
    const fixtures: Fixture[] = fixturesData?.response || [];
    
    // Extract unique leagues from fixtures
    const leagueMap = new Map<number, LeagueData>();
    
    fixtures.forEach((fixture: Fixture) => {
      if (fixture.league && fixture.league.id && !leagueMap.has(fixture.league.id)) {
        leagueMap.set(fixture.league.id, {
          league: fixture.league,
          seasons: [{ year: currentYear }]
        });
      }
    });
    
    const teamLeagues = Array.from(leagueMap.values());
    
    return NextResponse.json({
      response: teamLeagues
    });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch team leagues' }, { status: 500 });
  }
} 