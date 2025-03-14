import { Suspense } from 'react';
import MatchCalendar from '@/app/components/MatchCalendar';
import { BASE_URL, headers } from '@/app/services/sportApi';
import ClientMatchList from './ClientMatchList';

// Set revalidation time (e.g., every hour)
export const revalidate = 3600; // seconds

// Define interfaces for the API data
interface Team {
  id: number;
  name: string;
  logo: string;
}

interface League {
  id: number;
  name: string;
  logo: string;
}

interface FixtureStatus {
  short: string;
  elapsed?: number;
}

interface FixtureDetail {
  id: number;
  date: string;
  status: FixtureStatus;
}

interface Goals {
  home: number | null;
  away: number | null;
}

interface Fixture {
  fixture: FixtureDetail;
  league: League;
  teams: {
    home: Team;
    away: Team;
  };
  goals: Goals;
}

// Helper function to get the next Saturday's date
function getNextSaturday(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
  
  // Calculate days until next Saturday (if today is Saturday, get next Saturday)
  const daysUntilSaturday = dayOfWeek === 6 ? 7 : (6 + 7 - dayOfWeek) % 7;
  
  // If it's already Saturday and we want this Saturday instead of next, use this:
  // const daysUntilSaturday = dayOfWeek === 6 ? 0 : (6 + 7 - dayOfWeek) % 7;
  
  const nextSaturday = new Date(today);
  nextSaturday.setDate(today.getDate() + daysUntilSaturday);
  
  return nextSaturday;
}

// Server component that fetches data
export default async function SaturdayPage() {
  // Get next Saturday's date in YYYY-MM-DD format
  const saturday = getNextSaturday();
  const formattedDate = saturday.toISOString().split('T')[0];
  
  // Format the date for display
  const days = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
  const months = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
  const dayName = days[saturday.getDay()];
  const day = saturday.getDate();
  const month = months[saturday.getMonth()];
  const formattedDisplayDate = `${dayName} ${day}. ${month}`;
  
  // Fetch fixtures for Saturday
  let fixturesByLeague: Record<string, Fixture[]> = {};
  let sortedLeagues: string[] = [];
  let error: string | null = null;
  
  try {
    const response = await fetch(`${BASE_URL}/fixtures?date=${formattedDate}`, {
      headers,
      next: { revalidate }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error(`API Error for fixtures on ${formattedDate}:`, data.errors);
      error = 'Failed to load fixtures';
    } else {
      const fetchedFixtures = data.response || [];
      
      // Group fixtures by league
      fixturesByLeague = fetchedFixtures.reduce((acc: Record<string, Fixture[]>, fixture: Fixture) => {
        const leagueId = fixture.league.id;
        if (!acc[leagueId]) {
          acc[leagueId] = [];
        }
        acc[leagueId].push(fixture);
        return acc;
      }, {});
      
      // Sort leagues by popularity/importance
      const isPopularLeague = (leagueId: number): boolean => {
        const popularLeagueIds = [
          2, 3, 39, 61, 78, 103, 135, 140, 179,
        ];
        return popularLeagueIds.includes(leagueId);
      };
      
      sortedLeagues = Object.keys(fixturesByLeague).sort((a, b) => {
        const aIsPopular = isPopularLeague(parseInt(a));
        const bIsPopular = isPopularLeague(parseInt(b));
        
        if (aIsPopular && !bIsPopular) return -1;
        if (!aIsPopular && bIsPopular) return 1;
        
        // If both are popular or both are not, sort by number of fixtures (more fixtures first)
        return fixturesByLeague[b].length - fixturesByLeague[a].length;
      });
    }
  } catch (err) {
    console.error('Error fetching fixtures:', err);
    error = 'Failed to load fixtures';
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row-reverse gap-8">
        {/* Left column - Calendar - Now second on mobile, first on desktop */}
        <div className="w-full md:w-1/3 order-2 md:order-1">
          <Suspense fallback={<div>Loading calendar...</div>}>
            <MatchCalendar currentMatchId="" />
          </Suspense>
        </div>
        
        {/* Right column - Saturday's fixtures by league - Now first on mobile, second on desktop */}
        <div className="w-full md:w-2/3 order-1 md:order-2">
          <ClientMatchList 
            fixturesByLeague={fixturesByLeague}
            sortedLeagues={sortedLeagues}
            error={error}
            formattedDisplayDate={formattedDisplayDate}
          />
        </div>
      </div>
    </div>
  );
} 