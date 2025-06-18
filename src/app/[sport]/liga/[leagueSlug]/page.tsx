import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BASE_URL, headers } from '@/app/services/sportApi';
import LeaguePageClient from './LeaguePageClient';

// Define types for better type safety
interface LeagueParams {
  sport: string;
  leagueSlug: string;
}

// This enables static generation with dynamic paths
export const dynamic = 'force-dynamic';
export const revalidate = 86400; // Revalidate every 24 hours (changed from 3600)

// Generate metadata for SEO
export async function generateMetadata(
  { params }: { params: LeagueParams }
): Promise<Metadata> {
  // Extract the league ID from the slug
  const leagueId = parseInt(params.leagueSlug.split('-').pop() || '0');
  
  if (!leagueId) {
    return {
      title: 'Liga ikke funnet | ViaSport',
      description: 'Beklager, vi kunne ikke finne ligaen du leter etter.',
      robots: 'noindex'
    };
  }
  
  try {
    // Fetch league info for metadata
    const leagueResponse = await fetch(`${BASE_URL}/leagues?id=${leagueId}`, { 
      headers,
      cache: 'no-store' // Change this to force fresh metadata
    });
    
    if (!leagueResponse.ok) {
      throw new Error(`API error: ${leagueResponse.status}`);
    }
    
    const leagueData = await leagueResponse.json();
    
    if (!leagueData.response || leagueData.response.length === 0) {
      return {
        title: 'Liga ikke funnet | ViaSport',
        description: 'Beklager, vi kunne ikke finne ligaen du leter etter.',
        robots: 'noindex'
      };
    }
    
    const league = leagueData.response[0];
    const currentSeason = league.seasons.find((s: any) => s.current)?.year || new Date().getFullYear();
    
    // Format season display
    const seasonDisplay = formatSeasonDisplay(league, currentSeason);
    
    return {
      title: `${league.league.name} ${seasonDisplay} på TV & Live stream i dag - Tid, kanal, tabell | ViaSport`,
      description: `Se alle kamper fra ${league.league.name} ${seasonDisplay} på TV og live stream. Finn kampprogram, tabell, toppscorere og statistikk.`,
      openGraph: {
        title: `${league.league.name} ${seasonDisplay} på TV & Live stream i dag - Tid, kanal, tabell`,
        description: `Se alle kamper fra ${league.league.name} ${seasonDisplay} på TV og live stream. Finn kampprogram, tabell, toppscorere og statistikk.`,
        images: [{ 
          url: league.league.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')
        }]
      },
      alternates: {
        canonical: `https://viasport.no/fotball/liga/${params.leagueSlug}`
      }
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Liga | ViaSport',
      description: 'Se ligatabeller, kamper og statistikk.',
      robots: 'noindex'
    };
  }
}

// Format season display based on league type
function formatSeasonDisplay(leagueData: any, apiSeason: number): string {
  // Get the current date
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  
  // For Champions League and European competitions that span across two calendar years
  if (leagueData?.league?.id === 2 || 
      leagueData?.league?.name?.includes('Champions League') ||
      leagueData?.league?.type === 'cup' && leagueData?.league?.country === 'Europe') {
    return `${currentYear}/${currentYear + 1}`;
  }
  
  // For leagues that run within a calendar year (like Eliteserien)
  return `${apiSeason}`;
}

// Generate static paths for the most popular leagues
export async function generateStaticParams() {
  // List of popular league IDs to pre-render
  const popularLeagueIds = [
    { sport: 'fotball', leagueSlug: 'premier-league-39' },
    { sport: 'fotball', leagueSlug: 'eliteserien-103' },
    { sport: 'fotball', leagueSlug: 'uefa-champions-league-2' },
    { sport: 'fotball', leagueSlug: 'la-liga-140' },
    { sport: 'fotball', leagueSlug: 'serie-a-135' },
    { sport: 'fotball', leagueSlug: 'bundesliga-78' },
    { sport: 'fotball', leagueSlug: 'ligue-1-61' },
    { sport: 'fotball', leagueSlug: 'uefa-europa-league-3' }
  ];
  
  return popularLeagueIds;
}

// Main page component
export default async function LeaguePage({ params }: { params: LeagueParams }) {
  const { sport, leagueSlug } = params;
  
  // Extract the league ID from the slug
  const leagueId = parseInt(leagueSlug.split('-').pop() || '0');
  
  if (!leagueId) {
    notFound();
  }
  
  try {
    // 1. Fetch league info
    const leagueResponse = await fetch(`${BASE_URL}/leagues?id=${leagueId}`, { 
      headers,
      next: { revalidate: 86400 } // Cache for 24 hours
    });
    
    if (!leagueResponse.ok) {
      throw new Error(`API error: ${leagueResponse.status}`);
    }
    
    const leagueData = await leagueResponse.json();
    
    if (!leagueData.response || leagueData.response.length === 0) {
      notFound();
    }
    
    const league = leagueData.response[0];
    
    // Find current season - for Premier League, use next season if current has ended
    const seasons = league.seasons || [];
    const currentDate = new Date();
    const currentSeason = seasons.find((season: any) => season.current === true);
    
    console.log('🔍 Season Debug Info:');
    console.log('League ID:', leagueId);
    console.log('Current Date:', currentDate.toISOString());
    console.log('Available seasons:', seasons.map((s: any) => ({ year: s.year, current: s.current, start: s.start, end: s.end })));
    console.log('Current season from API:', currentSeason);
    
    let seasonYear = currentSeason?.year || new Date().getFullYear();
    
    // Special handling for Premier League - if current season has ended, look for next season's fixtures
    if (leagueId === 39 && currentSeason && new Date(currentSeason.end) < currentDate) {
      console.log('🏆 Premier League: Current season has ended, switching to next season');
      console.log('Season end date:', currentSeason.end);
      console.log('Switching from season', seasonYear, 'to', seasonYear + 1);
      // Current season has ended, use next season (2025)
      seasonYear = currentSeason.year + 1;
    }
    
    console.log('📅 Final season year to fetch:', seasonYear);
    
    // Helper function to fetch top scorers with fallback
    async function fetchTopScorersWithFallback(leagueId: number) {
      const currentYear = new Date().getFullYear();
      console.log(`🏆 Trying top scorers for current year: ${currentYear}`);
      
      // Try current year first
      let topScorersResponse = await fetch(`${BASE_URL}/players/topscorers?league=${leagueId}&season=${currentYear}`, { 
        headers,
        next: { revalidate: 86400 }
      });
      let topScorersData = await topScorersResponse.json();
      
      console.log(`Top scorers ${currentYear} response:`, { results: topScorersData.results, responseLength: topScorersData.response?.length });
      
      // If current year is empty, try previous year
      if (!topScorersData.response || topScorersData.response.length === 0) {
        const previousYear = currentYear - 1;
        console.log(`🔄 Current year empty, trying previous year: ${previousYear}`);
        
        topScorersResponse = await fetch(`${BASE_URL}/players/topscorers?league=${leagueId}&season=${previousYear}`, { 
          headers,
          next: { revalidate: 86400 }
        });
        topScorersData = await topScorersResponse.json();
        
        console.log(`Top scorers ${previousYear} response:`, { results: topScorersData.results, responseLength: topScorersData.response?.length });
      }
      
      return topScorersData;
    }
    
    // 2. Fetch standings, fixtures, and top scorers
    console.log('🚀 Making API calls for:');
    console.log(`- Standings: league=${leagueId}&season=${seasonYear}`);
    console.log(`- Fixtures: league=${leagueId}&season=${seasonYear}`);
    console.log(`- Top scorers: fallback strategy starting with current year`);
    
    const [standingsData, fixturesData, topScorersData] = await Promise.all([
      // Standings
      fetch(`${BASE_URL}/standings?league=${leagueId}&season=${seasonYear}`, { 
        headers,
        next: { revalidate: 3600 } // Cache for 1 hour
      }).then(res => res.json()),
      
      // All fixtures for the season
      fetch(`${BASE_URL}/fixtures?league=${leagueId}&season=${seasonYear}`, { 
        headers,
        next: { revalidate: 1800 } // Cache for 30 minutes
      }).then(res => res.json()),
      
      // Top scorers with fallback
      fetchTopScorersWithFallback(leagueId)
    ]);
    
    console.log('📊 API Responses:');
    console.log('Standings response:', { results: standingsData.results, responseLength: standingsData.response?.length });
    console.log('Fixtures response:', { results: fixturesData.results, responseLength: fixturesData.response?.length });
    console.log('Top scorers final response:', { results: topScorersData.results, responseLength: topScorersData.response?.length });
    
    // Process standings data
    const standings = standingsData.response && standingsData.response.length > 0
      ? standingsData.response[0].league.standings.flat()
      : [];
    
    // Process fixtures data
    const fixtures = fixturesData.response || [];
    
    // Process top scorers data
    const topScorers = topScorersData.response || [];
    
    console.log('✅ Processed data:');
    console.log('Standings count:', standings.length);
    console.log('Fixtures count:', fixtures.length);
    console.log('Top scorers count:', topScorers.length);
    if (fixtures.length > 0) {
      console.log('First fixture date:', fixtures[0]?.fixture?.date);
      console.log('Last fixture date:', fixtures[fixtures.length - 1]?.fixture?.date);
    }
    
    // Pass all data to the client component
    return (
      <LeaguePageClient
        sport={sport}
        leagueData={league}
        standings={standings}
        fixtures={fixtures}
        topScorers={topScorers}
        currentSeason={seasonYear}
        availableSeasons={seasons.map((s: any) => s.year).sort((a: number, b: number) => b - a)}
      />
    );
  } catch (error) {
    console.error('Error fetching league data:', error);
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 dark:bg-dark-main">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded dark:bg-red-900/30 dark:border-red-600 dark:text-red-300">
          Det oppstod en feil ved henting av data. Vennligst prøv igjen senere.
        </div>
      </div>
    );
  }
}

 