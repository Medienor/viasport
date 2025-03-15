import { BASE_URL, headers } from '../services/sportApi';
import ClientFixturesSection from './ClientFixturesSection';

// Maximum number of fixtures to display per day
const MAX_FIXTURES_PER_DAY = 10;

// Popular leagues to prioritize
const popularLeagues = [
  { name: 'Premier League', id: 39 },
  { name: 'Eliteserien', id: 103 },
  { name: 'UEFA Champions League', id: 2 },
  { name: 'La Liga', id: 140 },
  { name: 'Serie A', id: 135 }
];

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

// Fetch fixtures for a specific date
async function fetchFixturesForDate(dateKey: string, date: Date) {
  try {
    // Format date as YYYY-MM-DD
    const dateStr = date.toISOString().split('T')[0];
    
    // Fetch from API with appropriate cache time
    const response = await fetch(`${BASE_URL}/fixtures?date=${dateStr}`, { 
      headers,
      next: { revalidate: 1800 } // 30 minutes cache for upcoming fixtures
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.response && Array.isArray(data.response)) {
      // Filter for only "Not Started" matches
      const notStartedFixtures = data.response.filter((fixture: any) => 
        fixture?.fixture?.status?.short === 'NS'
      );
      
      // Separate fixtures into popular and other leagues
      const popularFixtures: any[] = [];
      const otherFixtures: any[] = [];
      
      notStartedFixtures.forEach((fixture: any) => {
        const leagueId = fixture?.league?.id;
        
        if (isPopularLeague(leagueId)) {
          popularFixtures.push(fixture);
        } else {
          otherFixtures.push(fixture);
        }
      });
      
      // Sort each group by time
      const sortByTime = (a: any, b: any) => {
        return new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime();
      };
      
      popularFixtures.sort(sortByTime);
      otherFixtures.sort(sortByTime);
      
      // Combine with popular leagues first
      const sortedFixtures = [...popularFixtures, ...otherFixtures];
      
      // Format time for each fixture
      sortedFixtures.forEach(fixture => {
        const date = new Date(fixture.fixture.date);
        fixture.formattedTime = date.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
      });
      
      return {
        fixtures: sortedFixtures.slice(0, MAX_FIXTURES_PER_DAY),
        totalCount: notStartedFixtures.length
      };
    }
    
    return { fixtures: [], totalCount: 0 };
  } catch (err) {
    console.error(`Error fetching fixtures for ${dateKey}:`, err);
    return { fixtures: [], totalCount: 0 };
  }
}

export default async function FixturesSection() {
  // Generate dates
  const dates = generateDates();
  const formattedDates = formatDates(dates);
  
  // Fetch fixtures for all dates in parallel
  const fixturesPromises = Object.entries(dates).map(async ([key, date]) => {
    const result = await fetchFixturesForDate(key, date);
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
    <ClientFixturesSection 
      fixtures={fixtures}
      formattedDates={formattedDates}
      totalFixtureCount={totalFixtureCount}
      popularLeagueIds={popularLeagues.map(league => league.id)}
    />
  );
} 