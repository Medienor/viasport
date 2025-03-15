import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import LeagueStandings from './components/LeagueStandings';
import LiveNowWrapper from './components/LiveNowWrapper';
import FixturesSection from './components/FixturesSection';

// Set page-level revalidation time (5 minutes)
export const revalidate = 300;

export default function Home() {
  // Popular leagues to display in standings
  const popularLeagues = [
    { id: 39, name: "Premier League", season: 2024 },
    { id: 103, name: "Eliteserien", season: 2025 },
    { id: 2, name: "UEFA Champions League", season: 2024 }
  ];

  return (
    <div className="bg-gray-50">
      {/* Hero section with background image and overlay */}
      <div className="relative">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <Image 
            src="/bg2-img.jpg" 
            alt="Football stadium" 
            fill 
            className="object-cover"
            priority
          />
          {/* Color overlay */}
          <div className="absolute inset-0 bg-blue-900/70 mix-blend-multiply"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-8 lg:py-40 text-white">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl drop-shadow-lg">
            Velkommen til ViaSport
          </h1>
          <p className="mt-6 text-xl max-w-3xl text-white/90 drop-shadow-md">
            Din ultimate destinasjon for fotballkalendere, kampinformasjon og lagstatistikk. Følg favorittlagene dine og hold deg oppdatert på alle fotballbegivenheter.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link 
              href="/fotball" 
              className="px-8 py-3 border border-transparent text-base font-medium rounded-md text-green-800 bg-white hover:bg-gray-100 shadow-lg transition-colors"
            >
              Fotball
            </Link>
            <Link 
              href="/fotball/liga" 
              className="px-8 py-3 border border-white text-base font-medium rounded-md text-white bg-green-800 hover:bg-green-700 shadow-lg transition-colors"
            >
              Ligaer
            </Link>
          </div>
        </div>
      </div>

      {/* Live Matches Section - LiveNowWrapper now handles visibility */}
      <Suspense fallback={<LiveMatchesSkeleton />}>
        <LiveNowWrapper />
      </Suspense>

      {/* Fixtures Sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Suspense fallback={<FixturesSkeleton />}>
          <FixturesSection />
        </Suspense>
      </div>

      {/* League Standings Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Ligatabeller</h2>
        
        <div className="space-y-8">
          {popularLeagues.map(league => (
            <Suspense key={league.id} fallback={<StandingsSkeleton leagueName={league.name} />}>
              <LeagueStandings 
                leagueId={league.id} 
                leagueName={league.name} 
                season={league.season} 
              />
            </Suspense>
          ))}
        </div>
      </div>

      {/* About ViaSport section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Om ViaSport.no</h2>
            <div className="mt-2 h-1 w-20 bg-blue-600 mx-auto"></div>
          </div>
          
          <div className="max-w-4xl mx-auto text-gray-700 space-y-6">
            <p className="text-lg">
              ViaSport har som mål å være den ultimate guiden for deg som ønsker å følge med på fotballkamper og annen sport på TV og strømmetjenester. Vi gir deg en komplett oversikt over kamptider, kanaler og hvor du kan se dine favorittlag spille.
            </p>
            
            <p>
              Vår tjeneste gjør det enkelt å finne ut når og hvor kampene sendes, enten det er i dag, i morgen eller lenger fram i tid. Du kan enkelt navigere gjennom vår kalender for å planlegge din sportsopplevelse flere uker og måneder framover.
            </p>
            
            <p>
              I tillegg til kampinformasjon tilbyr vi også statistikk, tabeller og nyheter om lagene og ligaene du er interessert i. Alt samlet på ett sted for å gi deg den beste opplevelsen som sportsentusiast.
            </p>
            
            <p>
              For deg som befinner deg utenfor Norge, inkluderer vi også informasjon om internasjonale strømmetjenester hvor kampene kan sees. Vi jobber kontinuerlig med å forbedre tjenesten vår og setter stor pris på tilbakemeldinger fra våre brukere.
            </p>
            
            <div className="mt-10 flex justify-center space-x-6">
              <Link href="/om-oss" className="text-blue-600 hover:text-blue-800 font-medium">
                Les mer om oss
              </Link>
              <Link href="/kontakt" className="text-blue-600 hover:text-blue-800 font-medium">
                Kontakt oss
              </Link>
              <Link href="/personvern" className="text-blue-600 hover:text-blue-800 font-medium">
                Personvern
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton loaders for suspense boundaries
function LiveMatchesSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
      <div className="flex justify-between items-center mb-4">
        <div className="h-8 bg-gray-200 rounded w-64"></div>
        <div className="h-8 bg-gray-200 rounded w-32"></div>
      </div>
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}

function FixturesSkeleton() {
  return (
    <div className="space-y-8">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="h-10 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StandingsSkeleton({ leagueName }: { leagueName: string }) {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/3">{leagueName}</div>
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

