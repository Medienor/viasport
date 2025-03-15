import { NextResponse } from 'next/server';
import { getLiveMatches } from '@/app/services/sportApi';

export async function GET(
  request: Request,
  { params }: { params: { sport: string } }
) {
  const sport = params.sport;
  
  try {
    // For football, use the existing sportApi service
    if (sport === 'fotball') {
      const matches = await getLiveMatches();
      
      // Group fixtures by league
      const fixturesByLeague = matches.reduce((acc: Record<string, any[]>, fixture: any) => {
        const leagueId = fixture.league.id.toString();
        if (!acc[leagueId]) {
          acc[leagueId] = [];
        }
        
        // Format the time for each fixture
        const date = new Date(fixture.fixture.date);
        fixture.formattedTime = date.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
        
        acc[leagueId].push(fixture);
        return acc;
      }, {});
      
      // Sort leagues by number of fixtures (more fixtures first)
      const sortedLeagues = Object.keys(fixturesByLeague).sort((a, b) => {
        return fixturesByLeague[b].length - fixturesByLeague[a].length;
      });
      
      return NextResponse.json({ fixturesByLeague, sortedLeagues });
    } 
    // For other sports, implement their respective API calls
    else {
      return NextResponse.json({ fixturesByLeague: {}, sortedLeagues: [] });
    }
  } catch (error) {
    console.error(`Error fetching live ${sport} matches:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch live matches' },
      { status: 500 }
    );
  }
} 