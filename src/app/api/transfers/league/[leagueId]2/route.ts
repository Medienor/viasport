import { NextRequest, NextResponse } from 'next/server';
import { fetchTransfersForTeams } from '@/lib/api/transfers';
import { 
  ELITESERIEN_TEAMS, 
  PREMIER_LEAGUE_TEAMS, 
  LA_LIGA_TEAMS,
  BUNDESLIGA_TEAMS,
  LIGUE_1_TEAMS,
  SERIE_A_TEAMS
} from '@/lib/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  try {
    console.log('API Route called with params:', params);
    
    const leagueId = parseInt(params.leagueId);
    console.log('Parsed leagueId:', leagueId);
    
    if (isNaN(leagueId)) {
      console.log('Invalid league ID');
      return NextResponse.json(
        { success: false, error: 'Invalid league ID' },
        { status: 400 }
      );
    }
    
    // Get team IDs from our constants
    let teamIds: number[] = [];
    
    switch (leagueId) {
      case 1:
        teamIds = ELITESERIEN_TEAMS.map(team => team.id);
        break;
      case 39:
        teamIds = PREMIER_LEAGUE_TEAMS.map(team => team.id);
        break;
      case 140:
        teamIds = LA_LIGA_TEAMS.map(team => team.id);
        break;
      case 78:
        teamIds = BUNDESLIGA_TEAMS.map(team => team.id);
        break;
      case 61:
        teamIds = LIGUE_1_TEAMS.map(team => team.id);
        break;
      case 135:
        teamIds = SERIE_A_TEAMS.map(team => team.id);
        break;
      default:
        console.log('League not supported:', leagueId);
        return NextResponse.json(
          { success: false, error: 'League not supported' },
          { status: 400 }
        );
    }
    
    // For testing, limit to just a few teams to avoid rate limits
    // In production, you'd implement proper caching and rate limiting
    const limitedTeamIds = teamIds.slice(0, 5); // Use 5 teams for now
    
    console.log(`Fetching transfers for ${limitedTeamIds.length} teams in league ${leagueId}`);
    const transfers = await fetchTransfersForTeams(limitedTeamIds);
    console.log(`Got transfers data with ${Object.keys(transfers).length} team entries`);
    
    return NextResponse.json({
      success: true,
      data: transfers,
    });
  } catch (error) {
    console.error('Error fetching league transfers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transfers' },
      { status: 500 }
    );
  }
} 