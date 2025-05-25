import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import SimpleTeamStandings from './components/SimpleTeamStandings';
import EnhancedFixturesSectionWrapper from './components/EnhancedFixturesSectionWrapper';
import EliteserienVideos from './components/EliteserienVideos';
import EliteserienVideosWrapper from './components/EliteserienVideosWrapper';
import LatestNews from './components/LatestNews';

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

// Example popular teams data
const popularTeams = [
  { id: 33, name: 'Manchester United', country: 'England', logo: 'https://viasport.b-cdn.net/football/teams/33.png' },
  { id: 40, name: 'Liverpool', country: 'England', logo: 'https://viasport.b-cdn.net/football/teams/40.png' },
  { id: 42, name: 'Arsenal', country: 'England', logo: 'https://viasport.b-cdn.net/football/teams/42.png' },
  { id: 50, name: 'Manchester City', country: 'England', logo: 'https://viasport.b-cdn.net/football/teams/50.png' },
  { id: 541, name: 'Real Madrid', country: 'Spain', logo: 'https://viasport.b-cdn.net/football/teams/541.png' },
];

// Helper function to create league URL
const createLeagueUrl = (name: string, id: number) => {
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  return `/fotball/liga/${slug}-${id}`;
};

// Helper function to create team URL (you might need to adjust this based on your routes)
// const createTeamUrl = (name: string, id: number) => {
//   const slug = name.toLowerCase().replace(/\s+/g, '-');
//   return `/fotball/lag/${slug}-${id}`;
// };

export default function Home({
  searchParams
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  return (
    <div className="bg-gray-50 dark:bg-dark-main">
      {/* Three-column layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Sidebar - Popular Leagues & Teams */}
          <div className="lg:col-span-3 order-3 lg:order-1">
            <div className="h-full">
              {/* Popular Leagues Section */}
              <Link 
                href="/fotball/liga" 
                className="flex justify-between items-center mb-3 px-1 group"
              >
                <h2 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-150">
                  Populære ligaer
                </h2>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-4 w-4 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-150" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <div className="space-y-1.5 mb-8">
                {popularLeagues.map(league => (
                  <Link 
                    key={league.id}
                    href={createLeagueUrl(league.name, league.id)}
                    className="flex items-center p-3 bg-white dark:bg-[#222222] hover:bg-gray-100 dark:hover:bg-[#333333] rounded-lg transition-colors duration-150 shadow-sm" 
                  >
                    <div className="relative w-5 h-5 mr-3 flex-shrink-0">
                      <Image 
                        src={`https://viasport.b-cdn.net/football/leagues/${league.id}.png`}
                        alt={league.name} 
                        fill
                        className="object-contain dark:brightness-110"
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate"> 
                      {league.name}
                    </span>
                  </Link>
                ))}
              </div>
              
              {/* Popular Teams Section */}
              <div className="flex justify-between items-center mb-3 px-1">
                <h2 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Fotball lag
                </h2>
              </div>
              <div className="space-y-1.5"> 
                {popularTeams.map(team => {
                  // Generate slug directly here
                  const slug = team.name.toLowerCase().replace(/\s+/g, '-'); 
                  return (
                    <Link 
                      key={team.id}
                      // Corrected href structure: /lag/{slug}-{id}
                      href={`/lag/${slug}-${team.id}`} 
                      className="flex items-center p-3 bg-white dark:bg-[#222222] hover:bg-gray-100 dark:hover:bg-[#333333] rounded-lg transition-colors duration-150 shadow-sm" 
                    >
                      <div className="relative w-5 h-5 mr-3 flex-shrink-0">
                        <Image 
                          src={team.logo}
                          alt={team.name} 
                          fill
                          className="object-contain dark:brightness-110"
                        />
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-gray-800 dark:text-gray-100 truncate"> 
                          {team.name}
                        </span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                          {team.country} 
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Center Column - Fixtures */}
          <div className="lg:col-span-6 order-1 lg:order-2">
            <div className="bg-white dark:bg-[#181818] shadow-sm rounded-lg overflow-hidden">
              <Suspense fallback={<FixturesSkeleton />}>
                <EnhancedFixturesSectionWrapper searchParams={searchParams} />
              </Suspense>
            </div>
          </div>

          {/* Right Sidebar - Premier League Table */}
          <div className="lg:col-span-3 order-2 lg:order-3">
            <div className="space-y-6"> 
              <div className="bg-white dark:bg-[#181818] shadow-sm rounded-lg overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-[#333333]"> 
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tabellplassering</h2>
                </div>
                <SimpleTeamStandings leagueId={39} season={2024} leagueName={'Premier League'} /> 
              </div>
              
              {/* Latest News Section */}
              <div className="bg-white dark:bg-[#181818] shadow-sm rounded-lg overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-[#333333]"> 
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Siste Nyheter</h2>
                </div>
                <div className="p-4">
                  <LatestNews />
                </div>
              </div>
            </div>
          </div>
          
          {/* Full-width Eliteserien Videos section at the bottom */}
          <div className="lg:col-span-12 mt-8 order-4">
            <Suspense fallback={<div className="animate-pulse grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-200 dark:bg-[#222222] rounded-lg h-48"></div>
              ))}
            </div>}>
              {/* Wrap EliteserienVideos in a client component that conditionally renders the container */}
              <EliteserienVideosWrapper />
            </Suspense>
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
        <div key={i} className="flex items-center space-x-4 py-3 border-b border-gray-100 dark:border-[#333333] last:border-b-0">
          <div className="w-16 h-4 bg-gray-200 dark:bg-[#222222] rounded"></div>
          <div className="w-8 h-8 bg-gray-200 dark:bg-[#222222] rounded-full"></div>
          <div className="flex-1 h-4 bg-gray-200 dark:bg-[#222222] rounded"></div>
          <div className="w-8 h-8 bg-gray-200 dark:bg-[#222222] rounded-full"></div>
          <div className="flex-1 h-4 bg-gray-200 dark:bg-[#222222] rounded"></div>
        </div>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-2 p-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-2 py-2 border-b border-gray-100 dark:border-[#333333] last:border-b-0">
          <div className="w-6 h-4 bg-gray-200 dark:bg-[#222222] rounded"></div>
          <div className="w-6 h-6 bg-gray-200 dark:bg-[#222222] rounded"></div>
          <div className="flex-1 h-4 bg-gray-200 dark:bg-[#222222] rounded"></div>
          <div className="w-8 h-4 bg-gray-200 dark:bg-[#222222] rounded"></div>
        </div>
      ))}
    </div>
  );
}

