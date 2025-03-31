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

    const response = await fetch('https://api-football-v1.p.rapidapi.com/v3/fixtures?live=all', {
      headers: {
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
        'x-rapidapi-key': process.env.RAPID_API_KEY
      },
      next: { revalidate: 30 }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || !data.response) {
      throw new Error('Invalid API response format');
    }

    // Create a Set of major league IDs for faster lookup
    const majorLeagueIds = new Set(MAJOR_LEAGUES.map(league => league.id));

    // Filter response to only include major leagues
    const filteredResponse = data.response.filter((fixture: any) => 
      majorLeagueIds.has(fixture.league.id)
    );

    // If no matches are found in major leagues
    if (!filteredResponse || filteredResponse.length === 0) {
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Direktesendte {sport}-kamper</h1>
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500">
              Ingen direktesendte kamper i de store ligaene akkurat nå.
            </p>
          </div>
        </div>
      );
    }

    // Sort leagues by priority
    const sortLeagues = (a: any, b: any) => {
      const priorityA = LEAGUE_PRIORITIES[a.league.id] || 999;
      const priorityB = LEAGUE_PRIORITIES[b.league.id] || 999;
      
      if (priorityA === priorityB) {
        return a.league.name.localeCompare(b.league.name);
      }
      return priorityA - priorityB;
    };

    // Sort the filtered response data by priority
    const sortedResponse = filteredResponse.sort(sortLeagues);

    // Group fixtures by league
    const fixturesByLeague = sortedResponse.reduce((acc: Record<string, any[]>, fixture: any) => {
      const leagueId = fixture.league.id.toString();
      if (!acc[leagueId]) {
        acc[leagueId] = [];
      }
      acc[leagueId].push(fixture);
      return acc;
    }, {});

    // Create sorted league IDs based on priority
    const sortedLeagues = Object.keys(fixturesByLeague);

    // Extract unique leagues for the dropdown with proper checks
    const liveLeagues = sortedLeagues
      .map(leagueId => {
        const fixtures = fixturesByLeague[leagueId];
        if (!fixtures || fixtures.length === 0) return null;
        
        const league = fixtures[0].league;
        if (!league) return null;

        return {
          id: league.id,
          name: league.name,
          country: league.country,
          logo: league.logo,
          flag: league.flag
        };
      })
      .filter((league): league is NonNullable<typeof league> => league !== null);

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-2/3">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Direktesendte {sport}-kamper</h1>
            <ClientLiveMatches 
              fixturesByLeague={fixturesByLeague}
              sortedLeagues={sortedLeagues}
              sport={sport}
              liveLeagues={liveLeagues}
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