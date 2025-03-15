import { Metadata } from 'next';
import MatchCalendar from '@/app/components/MatchCalendar';
import { getLiveMatches } from '@/app/services/sportApi';
import ClientLiveMatches from './ClientLiveMatches';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

// Define metadata
export async function generateMetadata({ params }: { params: { sport: string } }): Promise<Metadata> {
  const sport = params.sport;
  const sportName = sport.charAt(0).toUpperCase() + sport.slice(1);
  
  return {
    title: `Direktesendte ${sportName}-kamper som går nå på TV & Stream | ViaSport.no`,
    description: `Se alle direktesendte ${sportName}-kamper som spilles akkurat nå. Følg kampene live med oppdaterte resultater og statistikk.`,
  };
}

export default async function LiveMatchesPage({ params }: { params: { sport: string } }) {
  const sport = params.sport;
  const sportName = sport.charAt(0).toUpperCase() + sport.slice(1);
  
  try {
    // Fetch live matches with server component
    let matches = [];
    let fixturesByLeague: Record<string, any[]> = {};
    let sortedLeagues: string[] = [];
    
    // For football, use the existing sportApi service
    if (sport === 'fotball') {
      matches = await getLiveMatches();
      
      // Group fixtures by league
      fixturesByLeague = matches.reduce((acc: Record<string, any[]>, fixture: any) => {
        const leagueId = fixture.league.id.toString();
        if (!acc[leagueId]) {
          acc[leagueId] = [];
        }
        
        // Format the time for each fixture here on the server
        const date = new Date(fixture.fixture.date);
        fixture.formattedTime = date.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
        
        acc[leagueId].push(fixture);
        return acc;
      }, {});
      
      // Sort leagues by number of fixtures (more fixtures first)
      sortedLeagues = Object.keys(fixturesByLeague).sort((a, b) => {
        return fixturesByLeague[b].length - fixturesByLeague[a].length;
      });
    }
    
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left column - Live matches - First on mobile and desktop */}
          <div className="w-full md:w-2/3 order-1">
            <div className="space-y-8">
              <h1 className="text-lg font-bold text-gray-900">Direktesendte {sportName}-kamper</h1>
              
              {sortedLeagues.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-white shadow rounded-lg">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-2">Ingen direktesendte kamper akkurat nå.</p>
                </div>
              ) : (
                // Pass the data to a client component for interactivity
                <ClientLiveMatches 
                  fixturesByLeague={fixturesByLeague}
                  sortedLeagues={sortedLeagues}
                  sport={sport}
                />
              )}
            </div>
          </div>
          
          {/* Right column - Calendar - Second on mobile, second on desktop */}
          <div className="w-full md:w-1/3 order-2">
            <MatchCalendar currentMatchId="" />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching live matches:', error);
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="p-8 text-center text-red-500 bg-white shadow rounded-lg">
          <p>Kunne ikke hente direktesendte kamper. Vennligst prøv igjen senere.</p>
        </div>
      </div>
    );
  }
} 