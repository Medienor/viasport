import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import SimpleTeamStandings from './components/SimpleTeamStandings';
import EnhancedFixturesSectionWrapper from './components/EnhancedFixturesSectionWrapper';
import EliteserienVideos from './components/EliteserienVideos';

// Set page-level revalidation time (24 hours = 86400 seconds)
export const revalidate = 300;

// Popular leagues data
const popularLeagues = [
  { id: 39, name: 'Premier League', logo: '/league-logos/premier-league.png' },
  { id: 103, name: 'Eliteserien', logo: '/league-logos/eliteserien.png' },
  { id: 2, name: 'Champions League', logo: '/league-logos/champions-league.png' },
  { id: 140, name: 'La Liga', logo: '/league-logos/la-liga.png' },
  { id: 135, name: 'Serie A', logo: '/league-logos/serie-a.png' },
  { id: 78, name: 'Bundesliga', logo: '/league-logos/bundesliga.png' },
  { id: 61, name: 'Ligue 1', logo: '/league-logos/ligue-1.png' },
  { id: 3, name: 'Europa League', logo: '/league-logos/europa-league.png' }
];

// Additional leagues for the dropdown
const additionalLeagues = [
  { id: 179, name: 'OBOS-ligaen', logo: '/league-logos/obos-ligaen.png' },
  { id: 71, name: 'Eredivisie', logo: '/league-logos/eredivisie.png' },
  { id: 40, name: 'Championship', logo: '/league-logos/championship.png' },
  { id: 253, name: 'MLS', logo: '/league-logos/mls.png' },
  { id: 94, name: 'Primeira Liga', logo: '/league-logos/primeira-liga.png' },
  { id: 144, name: 'Superliga', logo: '/league-logos/superliga.png' }
];

// Helper function to create league URL
const createLeagueUrl = (name: string, id: number) => {
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  return `/fotball/liga/${slug}-${id}`;
};

export default function Home() {
  return (
    <div className="bg-gray-50">
      {/* Three-column layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Sidebar - Popular Leagues */}
          <div className="lg:col-span-3 order-3 lg:order-1">
            <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
              <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">Populære ligaer</h2>
                </div>
                <div className="divide-y">
                  {popularLeagues.map(league => (
                    <Link 
                      key={league.id}
                      href={createLeagueUrl(league.name, league.id)}
                      className="flex items-center p-2 hover:bg-gray-50 rounded-md"
                    >
                      <div className="relative w-5 h-5 mr-3">
                        <Image 
                          src={`https://viasport.b-cdn.net/football/leagues/${league.id}.png`}
                          alt={league.name} 
                          fill
                          className="object-contain"
                        />
                      </div>
                      <span className="text-sm">{league.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <Link 
                  href="/fotball/liga" 
                  className="flex items-center text-sm text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-50 rounded-md"
                >
                  <span>Se alle ligaer</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4 ml-1" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          {/* Center Column - Fixtures */}
          <div className="lg:col-span-6 order-1 lg:order-2">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <Suspense fallback={<FixturesSkeleton />}>
                <EnhancedFixturesSectionWrapper />
              </Suspense>
            </div>
          </div>

          {/* Right Sidebar - Premier League Table */}
          <div className="lg:col-span-3 order-2 lg:order-3">
            <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">Tabellplassering</h2>
                </div>
                <SimpleTeamStandings leagueId={39} />
              </div>
            </div>
          </div>
          
          {/* Full-width Eliteserien Videos section at the bottom */}
          <div className="lg:col-span-12 mt-8 order-4">
            <div className="bg-white shadow rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">Høydepunkter fra Eliteserien</h2>
              <Suspense fallback={<div className="animate-pulse grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-gray-200 rounded-lg h-48"></div>
                ))}
              </div>}>
                <EliteserienVideos />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FixturesSkeleton() {
  return (
    <div className="animate-pulse p-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 py-3">
          <div className="w-16 h-4 bg-gray-200 rounded"></div>
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
          <div className="flex-1 h-4 bg-gray-200 rounded"></div>
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
          <div className="flex-1 h-4 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-2 py-2">
          <div className="w-6 h-4 bg-gray-200 rounded"></div>
          <div className="w-6 h-6 bg-gray-200 rounded"></div>
          <div className="flex-1 h-4 bg-gray-200 rounded"></div>
          <div className="w-8 h-4 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  );
}

