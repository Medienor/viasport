import MatchCalendar from '@/app/components/MatchCalendar';
import ClientLiveMatches from './ClientLiveMatches';
import { MAJOR_LEAGUES } from '@/scripts/teamDataFetcher';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

// Define league priorities
const LEAGUE_PRIORITIES = {
  // Tier 1: Norwegian Leagues
  103: 1, // Eliteserien
  104: 2, // OBOS-ligaen
  725: 3, // Toppserien

  // Tier 2: Top European Leagues
  39: 4,  // Premier League
  140: 5, // La Liga
  135: 6, // Serie A
  78: 7,  // Bundesliga
  61: 8,  // Ligue 1

  // Tier 3: European Competitions
  2: 9,   // Champions League
  3: 10,  // Europa League
  848: 11, // Conference League

  // Tier 4: Other Major European Leagues
  94: 12,  // Primeira Liga
  88: 13,  // Eredivisie
  144: 14, // Allsvenskan
  179: 15, // Superliga
};

export default async function LiveMatchesPage({ params }: { params: { sport: string } }) {
  const sport = await Promise.resolve(params.sport);
  
  try {
    if (!process.env.RAPID_API_KEY) {
      throw new Error('API key is not configured');
    }

    // Fetch both live and today's matches
    const [liveResponse, todayResponse] = await Promise.all([
      fetch('https://api-football-v1.p.rapidapi.com/v3/fixtures?live=all', {
        headers: {
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
          'x-rapidapi-key': process.env.RAPID_API_KEY
        },
        next: { revalidate: 30 }
      }),
      fetch(`https://api-football-v1.p.rapidapi.com/v3/fixtures?date=${new Date().toISOString().split('T')[0]}`, {
        headers: {
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
          'x-rapidapi-key': process.env.RAPID_API_KEY
        },
        next: { revalidate: 300 }
      })
    ]);

    if (!liveResponse.ok || !todayResponse.ok) {
      throw new Error(`API request failed`);
    }

    const [liveData, todayData] = await Promise.all([
      liveResponse.json(),
      todayResponse.json()
    ]);

    // Create a Set of major league IDs for faster lookup
    const majorLeagueIds = new Set(MAJOR_LEAGUES.map(league => league.id));

    // Get live matches
    const liveMatches = liveData.response?.filter((fixture: any) => 
      majorLeagueIds.has(fixture.league.id)
    ) || [];

    // Get upcoming matches (excluding live ones)
    const now = new Date();
    const upcomingMatches = todayData.response?.filter((fixture: any) => {
      const matchTime = new Date(fixture.fixture.date);
      return (
        majorLeagueIds.has(fixture.league.id) &&
        matchTime > now &&
        fixture.fixture.status.short !== 'LIVE' &&
        fixture.fixture.status.short !== 'HT' &&
        fixture.fixture.status.short !== 'FT'
      );
    }) || [];

    // Combine and sort all matches
    const allMatches = {
      live: liveMatches,
      upcoming: upcomingMatches
    };

    // If no matches at all
    if (!liveMatches.length && !upcomingMatches.length) {
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Direktesendte {sport}-kamper</h1>
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500">
              Ingen direktesendte eller kommende kamper i de store ligaene akkurat nå.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-2/3">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Direktesendte {sport}-kamper</h1>
            <ClientLiveMatches 
              fixturesByLeague={allMatches}
              sortedLeagues={Array.from(majorLeagueIds)}
              sport={sport}
              liveLeagues={MAJOR_LEAGUES}
            />
          </div>
          <div className="w-full md:w-1/3">
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
          {process.env.NODE_ENV === 'development' && (
            <p className="mt-2 text-sm text-gray-500">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          )}
        </div>
      </div>
    );
  }
} 