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
export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

// Generate metadata for SEO
export async function generateMetadata(
  { params }: { params: LeagueParams }
): Promise<Metadata> {
  // Extract the league ID from the slug
  const leagueId = parseInt(params.leagueSlug.split('-').pop() || '0');
  
  if (!leagueId) {
    return {
      title: 'Liga ikke funnet | ViaSport',
      description: 'Beklager, vi kunne ikke finne ligaen du leter etter.'
    };
  }
  
  try {
    // Fetch league info for metadata
    const leagueResponse = await fetch(`${BASE_URL}/leagues?id=${leagueId}`, { 
      headers,
      next: { revalidate: 86400 } // Cache for 24 hours
    });
    
    if (!leagueResponse.ok) {
      throw new Error(`API error: ${leagueResponse.status}`);
    }
    
    const leagueData = await leagueResponse.json();
    
    if (!leagueData.response || leagueData.response.length === 0) {
      return {
        title: 'Liga ikke funnet | ViaSport',
        description: 'Beklager, vi kunne ikke finne ligaen du leter etter.'
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
        images: [{ url: league.league.logo }]
      }
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Liga | ViaSport',
      description: 'Se ligatabeller, kamper og statistikk.'
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
    
    // Find current season
    const seasons = league.seasons || [];
    const currentSeason = seasons.find((season: any) => season.current === true);
    const seasonYear = currentSeason?.year || new Date().getFullYear();
    
    // 2. Fetch standings, fixtures, and top scorers in parallel
    const [standingsData, fixturesData, topScorersData] = await Promise.all([
      // Standings
      fetch(`${BASE_URL}/standings?league=${leagueId}&season=${seasonYear}`, { 
        headers,
        next: { revalidate: 3600 } // Cache for 1 hour
      }).then(res => res.json()),
      
      // Upcoming fixtures (next 30 days)
      fetch(`${BASE_URL}/fixtures?league=${leagueId}&season=${seasonYear}&from=${getFormattedDate()}&to=${getFormattedDate(30)}`, { 
        headers,
        next: { revalidate: 1800 } // Cache for 30 minutes
      }).then(res => res.json()),
      
      // Top scorers
      fetch(`${BASE_URL}/players/topscorers?league=${leagueId}&season=${seasonYear}`, { 
        headers,
        next: { revalidate: 86400 } // Cache for 24 hours
      }).then(res => res.json())
    ]);
    
    // Process standings data
    const standings = standingsData.response && standingsData.response.length > 0
      ? standingsData.response[0].league.standings.flat()
      : [];
    
    // Process fixtures data
    const fixtures = fixturesData.response || [];
    
    // Process top scorers data
    const topScorers = topScorersData.response || [];
    
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Det oppstod en feil ved henting av data. Vennligst prøv igjen senere.
        </div>
      </div>
    );
  }
}

// Helper function to get formatted date for API
function getFormattedDate(daysFromNow = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
} 