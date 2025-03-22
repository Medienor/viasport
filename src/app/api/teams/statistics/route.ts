import { NextResponse } from 'next/server';
import { headers, BASE_URL } from '@/app/services/sportApi';

// TEMPORARY API DISABLE FLAG - set to true to disable API calls
const DISABLE_API_CALLS = true;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const team = searchParams.get('team');
  const league = searchParams.get('league');
  const season = searchParams.get('season');
  const date = searchParams.get('date');
  
  if (!team || !league || !season) {
    return NextResponse.json(
      { error: 'Team, league, and season parameters are required' },
      { status: 400 }
    );
  }
  
  // Skip API call if disabled
  if (DISABLE_API_CALLS) {
    console.log(`[API DISABLED] Team statistics API call would have been made with: team=${team}, league=${league}, season=${season}, date=${date || 'N/A'}`);
    
    // Return mock data
    return NextResponse.json({
      response: {
        league: {
          id: parseInt(league),
          name: "API Disabled",
          country: "Norway",
          logo: "/images/league-placeholder.png",
          season: parseInt(season)
        },
        team: {
          id: parseInt(team),
          name: "API Disabled Team",
          logo: "/images/team-placeholder.png"
        },
        form: "WDLWDL",
        fixtures: {
          played: { home: 0, away: 0, total: 0 },
          wins: { home: 0, away: 0, total: 0 },
          draws: { home: 0, away: 0, total: 0 },
          loses: { home: 0, away: 0, total: 0 }
        },
        goals: {
          for: { total: { home: 0, away: 0, total: 0 } },
          against: { total: { home: 0, away: 0, total: 0 } }
        },
        biggest: {
          streak: { wins: 0, draws: 0, loses: 0 },
          wins: { home: "0-0", away: "0-0" },
          loses: { home: "0-0", away: "0-0" },
          goals: { for: { home: 0, away: 0 }, against: { home: 0, away: 0 } }
        },
        clean_sheet: { home: 0, away: 0, total: 0 },
        failed_to_score: { home: 0, away: 0, total: 0 },
        penalty: {
          scored: { total: 0, percentage: "0%" },
          missed: { total: 0, percentage: "0%" }
        },
        lineups: [],
        cards: {
          yellow: { "0-15": { total: 0, percentage: "0%" } },
          red: { "0-15": { total: 0, percentage: "0%" } }
        }
      }
    });
  }
  
  try {
    let url = `${BASE_URL}/teams/statistics?team=${team}&league=${league}&season=${season}`;
    
    // Add date parameter if provided
    if (date) {
      url += `&date=${date}`;
    }
    
    console.log(`Fetching team statistics: ${url}`);
    
    const response = await fetch(url, {
      headers
    });
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching team statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team statistics', message: (error as Error).message },
      { status: 500 }
    );
  }
} 