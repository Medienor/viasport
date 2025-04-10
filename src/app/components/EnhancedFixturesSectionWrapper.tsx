import { createClient } from '@supabase/supabase-js';
import EnhancedFixturesSection from './EnhancedFixturesSection';
import { MAJOR_LEAGUES } from '../../scripts/teamDataFetcher';

// Maximum number of fixtures to display per day
const MAX_FIXTURES_PER_DAY = 10;

// Use the MAJOR_LEAGUES from teamDataFetcher instead of defining our own list
const popularLeagues = MAJOR_LEAGUES.slice(0, 25); // You can adjust how many leagues to prioritize

// Initialize Supabase client with the working configuration
const supabase = createClient(
  'https://cdynfbwdwdfsiwkgixua.supabase.co',
  process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkeW5mYndkd2Rmc2l3a2dpeHVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjU3ODQwMSwiZXhwIjoyMDU4MTU0NDAxfQ.5V7CbSCE4lb3FbJUa3kgipRPWXG4LeVRCf7eeLSrSoI',
  {
    global: {
      fetch: fetch as any
    }
  }
);

// Generate dates for the next 7 days
function generateDates() {
  const dates: {[key: string]: Date} = {};
  const today = new Date();
  
  // Today
  dates.today = new Date(today);
  
  // Next 6 days
  for (let i = 1; i <= 6; i++) {
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + i);
    dates[`day${i}`] = nextDate;
  }
  
  return dates;
}

// Format dates in Norwegian
function formatDates(dates: {[key: string]: Date}) {
  const formatted: {[key: string]: string} = {};
  
  // Norwegian weekday names
  const weekdays = [
    'søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'
  ];
  
  // Norwegian month names
  const months = [
    'januar', 'februar', 'mars', 'april', 'mai', 'juni', 
    'juli', 'august', 'september', 'oktober', 'november', 'desember'
  ];
  
  // Format each date
  Object.entries(dates).forEach(([key, date]) => {
    const weekday = weekdays[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    formatted[key] = `${weekday} ${day}. ${month} ${year}`;
  });
  
  return formatted;
}

// Check if a league is in our popular leagues list
function isPopularLeague(leagueId: number) {
  return popularLeagues.some(league => league.id === leagueId);
}

// Update the fetchFixturesFromSupabase function to fetch more fixtures
async function fetchFixturesFromSupabase(date: Date) {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    console.log('Querying for date range:', {
      start: startOfDay.toISOString(),
      end: endOfDay.toISOString()
    });

    // Get all league IDs from MAJOR_LEAGUES
    const leagueIds = MAJOR_LEAGUES.map(league => league.id);

    const { data: fixtures, error } = await supabase
      .from('fixtures')
      .select(`
        id,
        date,
        league_id,
        home_team_id,
        away_team_id,
        status,
        score,
        goals,
        league,
        teams,
        match_status
      `)
      .in('match_status', ['NS', 'FT', '1H', '2H', 'HT']) // Include all relevant match statuses
      .gte('date', startOfDay.toISOString())
      .lt('date', endOfDay.toISOString())
      .in('league_id', leagueIds)
      .order('date', { ascending: true });
      // Remove the limit to get all fixtures

    if (error) {
      console.error('Supabase query error details:', error);
      return { fixtures: [], totalCount: 0 };
    }

    console.log('Fetched fixtures:', fixtures?.length || 0);

    // Separate fixtures into popular and other leagues
    const popularFixtures: any[] = [];
    const otherFixtures: any[] = [];

    fixtures?.forEach(fixture => {
      const fixtureData = {
        fixture: {
          id: fixture.id,
          date: fixture.date,
          status: fixture.status
        },
        league: {
          id: fixture.league_id,
          name: fixture.league.name,
          country: fixture.league.country,
          logo: `https://media.api-sports.io/football/leagues/${fixture.league_id}.png`
        },
        teams: {
          home: {
            id: fixture.home_team_id,
            name: fixture.teams.home.name,
            logo: `https://media.api-sports.io/football/teams/${fixture.home_team_id}.png`
          },
          away: {
            id: fixture.away_team_id,
            name: fixture.teams.away.name,
            logo: `https://media.api-sports.io/football/teams/${fixture.away_team_id}.png`
          }
        },
        goals: fixture.goals || { home: null, away: null }, // Add goals data
        formattedTime: new Date(fixture.date).toLocaleTimeString('no-NO', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      };

      // Check if this is from a popular league
      if (popularLeagues.some(league => league.id === fixture.league_id)) {
        popularFixtures.push(fixtureData);
      } else {
        otherFixtures.push(fixtureData);
      }
    });

    // Combine fixtures with popular leagues first, but don't limit the total number
    const sortedFixtures = [...popularFixtures, ...otherFixtures];

    return {
      fixtures: sortedFixtures,
      totalCount: fixtures?.length || 0
    };
  } catch (err) {
    console.error('Error fetching fixtures:', err);
    return { fixtures: [], totalCount: 0 };
  }
}

export default async function EnhancedFixturesSectionWrapper() {
  // Generate dates
  const dates = generateDates();
  const formattedDates = formatDates(dates);
  
  // Fetch fixtures for all dates in parallel
  const fixturesPromises = Object.entries(dates).map(async ([key, date]) => {
    const result = await fetchFixturesFromSupabase(date);
    return { key, ...result };
  });
  
  const fixturesResults = await Promise.all(fixturesPromises);
  
  // Convert results to the format expected by the client component
  const fixtures: {[key: string]: any[]} = {};
  const totalFixtureCount: {[key: string]: number} = {};
  
  fixturesResults.forEach(result => {
    fixtures[result.key] = result.fixtures;
    totalFixtureCount[result.key] = result.totalCount;
  });
  
  return (
    <EnhancedFixturesSection 
      fixtures={fixtures}
      formattedDates={formattedDates}
      totalFixtureCount={totalFixtureCount}
      popularLeagueIds={popularLeagues.map(league => league.id)}
    />
  );
} 