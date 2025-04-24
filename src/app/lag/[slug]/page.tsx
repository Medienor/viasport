import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import TeamStandings from '@/app/components/TeamStandings';
import { readFile, readdir } from 'fs/promises';
import path from 'path';
import TeamStats from '@/app/components/TeamStats';
import TeamAnalysis from '@/app/components/TeamAnalysis';
import { extractTeamId } from '@/utils/helpers';
import { getTeamData } from '@/utils/api';
import TabNav from '@/app/components/TabNav';
import { calculateTeamStats } from '@/app/utils/statsCalculator';
import OtherTeamsInLeague from '@/app/components/OtherTeamsInLeague';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import TeamHeaderNav from '@/app/components/TeamHeaderNav';

// Define Season type if not already defined globally or imported
interface Season {
  year: number;
  // Add other properties if they exist, e.g., start, end
}

// Define LeagueData structure based on your actual API response
interface LeagueData {
  league: {
    id: number;
    name: string;
    logo: string;
    // other league props
  };
  country: {
    name: string;
    // other country props
  };
  seasons: Season[];
}

// Add this constant at the top level
const DATA_DIR = path.join(process.cwd(), 'data', 'teams');

// Helper function to create URL-friendly slug
function createTeamSlug(teamName: string, teamId: number) {
  return `${teamName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${teamId}`;
}

// Helper function to generate league slug (optional, can be inline)
const generateLeagueSlug = (name: string, id: number | string): string => {
  const baseSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return `/fotball/liga/${baseSlug}-${id}`;
};

// Update the generateStaticParams function
export async function generateStaticParams() {
  try {
    const files = await readdir(DATA_DIR);
    const params = await Promise.all( // Use Promise.all to await all async maps
      files
        .filter(file => file.endsWith('.json'))
        .map(async (file) => {
          const teamIdStr = file.replace('.json', '');
          const teamId = parseInt(teamIdStr);
          if (isNaN(teamId)) return null; // Skip if ID is not a number

          try {
            const data = await getTeamData(teamId);
            const teamName = data?.team?.team?.name || '';
            if (!teamName) return null; // Skip if no team name
            return {
              slug: createTeamSlug(teamName, teamId)
            };
          } catch (teamError) {
            console.error(`Error fetching team data for ID ${teamId} in generateStaticParams:`, teamError);
            return null; // Skip on error fetching specific team
          }
        })
    );
    return params.filter(p => p !== null); // Filter out any null results
  } catch (error) {
    console.error('Error reading data directory in generateStaticParams:', error);
    return [];
  }
}

// This enables static generation
export const dynamic = 'force-static';
export const revalidate = 86400; // 24 hours in seconds

export default async function TeamPage({ params }: { params: { slug: string } }) {
  // Wait for params - no need to await here, params is directly available
  const slug = params.slug;
  const teamId = extractTeamId(slug);

  if (!teamId) {
    console.error('[TeamPage] No team ID found in slug:', slug);
    return notFound();
  }

  console.log(`[TeamPage] Fetching data for team ID: ${teamId}`);
  const data = await getTeamData(teamId);

  if (!data || !data.team?.team?.name) {
    console.error(`[TeamPage] Invalid team data for ID: ${teamId}`, data);
    return notFound();
  }

  const {
    team,
    leagues = [], // Default to empty array
    fixtures = { upcoming: [], past: [] },
  } = data;

  // Calculate statistics from fixtures
  const calculatedStats = calculateTeamStats(data);

  // Log the raw leagues data received from the API
  // Use console.log on the server-side; it will appear in your terminal
  console.log(`[TeamPage] Raw leagues data for team ${teamId}:`, JSON.stringify(leagues, null, 2));

  // Robustly aggregate all unique season years from ALL leagues
  const allSeasonYears = leagues.reduce((acc: Set<number>, leagueData: LeagueData) => {
    // Check if leagueData and leagueData.seasons exist and is an array
    if (leagueData && leagueData.seasons && Array.isArray(leagueData.seasons)) {
      leagueData.seasons.forEach((season: Season | any) => { // Use 'any' for safety if Season type isn't strict
        // Check if season object and season.year exist and are numbers
        if (season && typeof season.year === 'number') {
          acc.add(season.year); // Use a Set to handle uniqueness automatically
        } else {
          // Log potential issues on the server
           console.warn(`[TeamPage] Invalid season format in league ${leagueData?.league?.id} for team ${teamId}:`, season);
        }
      });
    } else {
       // Log potential issues on the server
       console.warn(`[TeamPage] Missing or invalid seasons array in league data for team ${teamId}:`, leagueData);
    }
    return acc;
  }, new Set<number>()); // Initialize with an empty Set

  // Convert Set to array and sort descending
  const sortedSeasonYears = Array.from(allSeasonYears).sort((a, b) => b - a);

  // Log the calculated seasons on the server
  console.log(`[TeamPage] Calculated seasonYears for team ${teamId}:`, sortedSeasonYears);

  // Handle case where no seasons are found at all - Fallback to current year
  const seasonYears = sortedSeasonYears.length > 0 ? sortedSeasonYears : [new Date().getFullYear()];
  console.log(`[TeamPage] Final seasonYears prop being passed to TeamStandings for team ${teamId}:`, seasonYears);


  // More debug logging
  console.log('[TeamPage] Extracted Data:', {
    teamName: team.team.name,
    hasLeagues: leagues.length > 0,
    hasFixtures: fixtures.upcoming.length + fixtures.past.length,
    hasStats: !!calculatedStats
  });


  const tabs = [
    { name: 'Oversikt', href: `/lag/${slug}` },
    { name: 'Tropp', href: `/lag/${slug}/tropp` },
    { name: 'Resultater', href: `/lag/${slug}/resultater` },
    { name: 'Kamper', href: `/lag/${slug}/kamper` },
    { name: 'Tabell', href: `/lag/${slug}/tabell` },
  ];

  const currentTeamId = data?.team?.team?.id;
  const recentFixtures = data?.fixtures?.past
      ?.filter((fixture: any) => fixture?.fixture?.status?.short === 'FT')
      .slice(0, 10) // Keep the original slice for "Siste Kamper"
      || [];
  const upcomingFixtures = data?.fixtures?.upcoming || []; // Ensure upcoming fixtures is an array

  // Slice for Team Form (latest 5)
  const formFixtures = recentFixtures.slice(0, 5);
  const nextMatchFixture = upcomingFixtures[0]; // Get the very next match

  try {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TeamHeaderNav
          teamLogo={team.team.logo}
          teamName={`${team.team.name} på TV og Live Stream`}
          tabs={tabs}
        />

        {/* Main Content - Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Standings, Form, Next Match (40%) */}
          <div className="lg:w-[40%] space-y-8">
            <TeamStandings
              teamId={team.team.id}
              teamName={team.team.name}
              seasons={seasonYears}
              hideSeasonSelector={true}
            />

            {/* --- NEW: Team Form Section --- */}
            {formFixtures.length > 0 && currentTeamId && (
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Lagform</h3>
                <div className="flex justify-around items-start space-x-1">
                  {formFixtures.map((fixture: any) => {
                    // Determine result and color
                    let result: 'V' | 'U' | 'T' | null = null;
                    let bgColor = 'bg-gray-400'; // Default gray for Draw/Unknown
                    const homeId = fixture.teams.home.id;
                    const awayId = fixture.teams.away.id;
                    const homeWinner = fixture.teams.home.winner;
                    const awayWinner = fixture.teams.away.winner;

                    if (homeWinner === null && awayWinner === null) { result = 'U'; bgColor = 'bg-gray-400'; }
                    else if ((homeId === currentTeamId && homeWinner) || (awayId === currentTeamId && awayWinner)) { result = 'V'; bgColor = 'bg-green-500'; } // Green for Win
                    else if ((homeId === currentTeamId && !homeWinner) || (awayId === currentTeamId && !awayWinner)) { result = 'T'; bgColor = 'bg-red-500'; } // Red for Loss

                    // Determine opponent
                    const opponent = homeId === currentTeamId ? fixture.teams.away : fixture.teams.home;
                    const score = `${fixture.goals.home ?? '?'} - ${fixture.goals.away ?? '?'}`;

                    // --- CREATE TOOLTIP TEXT ---
                    const tooltipText = `${fixture.teams.home.name} ${fixture.goals.home ?? '?'} - ${fixture.goals.away ?? '?'} ${fixture.teams.away.name}`;
                    // --- END TOOLTIP TEXT ---

                    return (
                      <Link
                        key={fixture.fixture.id}
                        href={`/fotball/kamp/${fixture.fixture.id}`}
                        className="flex flex-col items-center space-y-1.5 text-center hover:opacity-80 transition-opacity"
                        title={tooltipText}
                      >
                        <span className={`px-2 py-0.5 rounded-md text-white text-sm font-semibold ${bgColor}`}>
                          {score}
                        </span>
                        {opponent.logo && (
                          <img
                            src={opponent.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')}
                            alt={opponent.name}
                            className="h-8 w-8 object-contain"
                          />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
            {/* --- END: Team Form Section --- */}

            {/* --- NEW: Next Match Section --- */}
            {nextMatchFixture && (
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">Neste kamp</h3>
                  {nextMatchFixture.league && (
                     <Link
                       href={generateLeagueSlug(nextMatchFixture.league.name, nextMatchFixture.league.id)}
                       className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                     >
                       <span>{nextMatchFixture.league.name}</span>
                       {nextMatchFixture.league.logo && (
                         <img 
                           src={nextMatchFixture.league.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')} 
                           alt="" 
                           className="h-4 w-4 object-contain"
                         />
                       )}
                     </Link>
                  )}
                </div>

                <div className="flex items-center justify-between text-center">
                   {/* Home Team */}
                   <div className="flex flex-col items-center space-y-1 w-[35%]">
                     {nextMatchFixture.teams.home.logo && (
                       <img 
                         src={nextMatchFixture.teams.home.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')} 
                         alt="" 
                         className="h-8 w-8 object-contain mb-1"
                       />
                     )}
                     <span className="text-xs font-medium text-gray-800 truncate w-full">{nextMatchFixture.teams.home.name}</span>
                   </div>

                   {/* Time and Date */}
                   <div className="flex flex-col items-center space-y-0.5 w-[30%] flex-shrink-0">
                     <span className="text-base font-bold text-gray-900">
                       {format(parseISO(nextMatchFixture.fixture.date), 'HH:mm', { locale: nb })}
                     </span>
                     <span className="text-xs text-gray-500">
                       {format(parseISO(nextMatchFixture.fixture.date), 'd. MMM', { locale: nb })}
                     </span>
                   </div>

                   {/* Away Team */}
                   <div className="flex flex-col items-center space-y-1 w-[35%]">
                     {nextMatchFixture.teams.away.logo && (
                       <img 
                         src={nextMatchFixture.teams.away.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')} 
                         alt="" 
                         className="h-8 w-8 object-contain mb-1"
                       />
                     )}
                     <span className="text-xs font-medium text-gray-800 truncate w-full">{nextMatchFixture.teams.away.name}</span>
                   </div>
                </div>
              </div>
            )}
            {/* --- END: Next Match Section --- */}

          </div>

          {/* Right Column - Main Content (60%) */}
          <div className="lg:w-[60%] space-y-8">
            {/* Upcoming Matches */}
            {upcomingFixtures.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Kommende kamper</h2>
                <div className="space-y-4">
                  {upcomingFixtures.map((fixture: any) => (
                    <div
                      key={fixture.fixture.id}
                      className="block hover:bg-gray-50 transition rounded-md border border-gray-200 overflow-hidden bg-white relative"
                    >
                      {/* Date Badge */}
                      <div className="absolute top-0 left-0 bg-gray-100 px-3 py-1 text-xs text-gray-600 rounded-br">
                        {new Date(fixture.fixture.date).toLocaleDateString('no-NO', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })} {new Date(fixture.fixture.date).toLocaleTimeString('no-NO', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>

                      {/* Match Content */}
                      <Link
                        href={`/fotball/kamp/${fixture.fixture.id}`}
                        className="block p-4 pt-8"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 w-2/5">
                            <div className="relative h-8 w-8 flex-shrink-0">
                              <Image
                                src={fixture.teams.home.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net') || '/images/team-placeholder.png'}
                                alt={fixture.teams.home.name}
                                fill
                                className="object-contain"
                              />
                            </div>
                            <span className={`font-medium truncate ${fixture.teams.home.id === teamId ? 'font-bold' : ''}`}>
                              {fixture.teams.home.name}
                            </span>
                          </div>

                          <div className="text-center w-1/5">
                            <div className="font-bold">
                              {fixture.fixture.status?.short === 'FT' ?
                                `${fixture.goals.home} - ${fixture.goals.away}` :
                                new Date(fixture.fixture.date).toLocaleTimeString('no-NO', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              }
                            </div>
                            {fixture.league && (
                              <div className="text-xs text-gray-500 mt-1">
                                {fixture.league.name}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-end space-x-3 w-2/5">
                            <span className={`font-medium text-right truncate ${fixture.teams.away.id === teamId ? 'font-bold' : ''}`}>
                              {fixture.teams.away.name}
                            </span>
                            <div className="relative h-8 w-8 flex-shrink-0">
                              <Image
                                src={fixture.teams.away.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net') || '/images/team-placeholder.png'}
                                alt={fixture.teams.away.name}
                                fill
                                className="object-contain"
                              />
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Turneringer Section - REMOVED from here */}
            {/*
            {leagues.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Turneringer</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {leagues.map((league: any) => (
                    <Link
                      key={league.league.id}
                      href={generateLeagueSlug(league.league.name, league.league.id)}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition bg-white"
                    >
                      <div className="flex items-center">
                        <div className="relative h-8 w-8 mr-3">
                          <Image
                            src={league.league.logo}
                            alt={league.league.name}
                            fill
                            className="object-contain"
                          />
                        </div>
                        <div>
                          <h3 className="font-medium">{league.league.name}</h3>
                          <p className="text-sm text-gray-500">{league.country.name}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            */}

            {/* Siste Kamper Section - Card Layout */}
            {recentFixtures && recentFixtures.length > 0 && currentTeamId && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 pr-4 sm:pr-6 lg:pr-8">
                  Siste kamper
                </h2>
                <div>
                  {recentFixtures.map((fixture: any, index: number) => {
                    const matchDate = new Date(fixture.fixture.date);
                    const formattedDate = matchDate.toLocaleDateString('no-NO', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    });
                    let result: 'V' | 'U' | 'T' | null = null;
                    let resultBgColor = 'bg-gray-100';
                    let resultTextColor = 'text-gray-800';
                    if (fixture.fixture.status.short === 'FT') {
                      const homeId = fixture.teams.home.id;
                      const awayId = fixture.teams.away.id;
                      const homeWinner = fixture.teams.home.winner;
                      const awayWinner = fixture.teams.away.winner;
                      if (homeWinner === null && awayWinner === null) { result = 'U'; resultBgColor = 'bg-gray-100'; resultTextColor = 'text-gray-800'; }
                      else if ((homeId === currentTeamId && homeWinner) || (awayId === currentTeamId && awayWinner)) { result = 'V'; resultBgColor = 'bg-green-100'; resultTextColor = 'text-green-800'; }
                      else if ((homeId === currentTeamId && !homeWinner) || (awayId === currentTeamId && !awayWinner)) { result = 'T'; resultBgColor = 'bg-red-100'; resultTextColor = 'text-red-800'; }
                    }

                    return (
                      <div
                        key={fixture.fixture.id}
                        className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${index > 0 ? 'mt-4' : ''}`}
                      >
                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            {fixture.league.logo && (
                              <img 
                                src={fixture.league.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')} 
                                alt="" 
                                className="h-4 w-4 object-contain"
                              />
                            )}
                            <span className="font-medium truncate">{fixture.league.name}</span>
                          </div>
                          <span className="text-xs text-gray-500">{formattedDate}</span>
                        </div>

                        <div className="p-3 sm:p-4 flex items-center">
                          <div className={`flex-1 flex items-center justify-end gap-2 sm:gap-3 ${fixture.teams.home.id === currentTeamId ? 'font-bold' : ''}`}>
                            <span className="text-xs sm:text-sm text-right truncate">{fixture.teams.home.name}</span>
                            {fixture.teams.home.logo && (
                              <img 
                                src={fixture.teams.home.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')} 
                                alt="" 
                                className="h-5 w-5 sm:h-6 sm:w-6 object-contain flex-shrink-0"
                              />
                            )}
                          </div>

                          <div className="mx-3 sm:mx-4 text-center flex-shrink-0">
                            <div className="text-lg sm:text-xl font-bold text-gray-800">
                              {fixture.goals.home ?? '-'} - {fixture.goals.away ?? '-'}
                            </div>
                            {result && (
                              <div className="mt-1">
                                <span className={`px-1.5 sm:px-2 py-0.5 inline-flex text-[11px] sm:text-xs leading-4 font-semibold rounded-full ${resultBgColor} ${resultTextColor}`}>
                                  {result === 'V' ? 'Seier' : result === 'U' ? 'Uavgjort' : 'Tap'}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className={`flex-1 flex items-center justify-start gap-2 sm:gap-3 ${fixture.teams.away.id === currentTeamId ? 'font-bold' : ''}`}>
                            {fixture.teams.away.logo && (
                              <img 
                                src={fixture.teams.away.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')} 
                                alt="" 
                                className="h-5 w-5 sm:h-6 sm:w-6 object-contain flex-shrink-0"
                              />
                            )}
                            <span className="text-xs sm:text-sm text-left truncate">{fixture.teams.away.name}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Team Statistics */}
            <TeamStats statistics={calculatedStats} />

            {/* Team Standing Analysis Section */}
            {leagues.length > 0 && (
              <TeamAnalysis 
                team={team} 
                leagues={leagues} 
                fixtures={fixtures} 
              />
            )}

            {/* Next Match Information Section */}
            {upcomingFixtures.length > 0 && (
              <div className="mt-12">
                <h2 className="text-xl font-semibold mb-4">
                  Når spiller {team.team.name} sin neste kamp?
                </h2>
                <div className="prose prose-lg max-w-none">
                  {(() => {
                    const nextMatch = upcomingFixtures[0];
                    const secondMatch = upcomingFixtures[1];
                    const thirdMatch = upcomingFixtures[2];
                    
                    const formatMatchDate = (date: string) => {
                      return new Date(date).toLocaleDateString('no-NO', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                    };

                    let text = `${team.team.name} spiller sin neste kamp `;
                    
                    if (nextMatch) {
                      const isHome = nextMatch.teams.home.id === team.team.id;
                      const opponent = isHome ? nextMatch.teams.away.name : nextMatch.teams.home.name;
                      const venue = isHome ? 'hjemme' : 'borte';
                      
                      text += `${venue} mot ${opponent} ${formatMatchDate(nextMatch.fixture.date)}`;
                      
                      if (nextMatch.league) {
                        text += ` i ${nextMatch.league.name}`;
                      }
                      
                      if (secondMatch) {
                        const secondIsHome = secondMatch.teams.home.id === team.team.id;
                        const secondOpponent = secondIsHome ? secondMatch.teams.away.name : secondMatch.teams.home.name;
                        text += `. Deretter venter ${secondOpponent} ${formatMatchDate(secondMatch.fixture.date)}`;
                        
                        if (thirdMatch) {
                          const thirdIsHome = thirdMatch.teams.home.id === team.team.id;
                          const thirdOpponent = thirdIsHome ? thirdMatch.teams.away.name : thirdMatch.teams.home.name;
                          text += `, før de møter ${thirdOpponent} ${formatMatchDate(thirdMatch.fixture.date)}`;
                        }
                      }
                      
                      text += '.';
                    } else {
                       text = `Ingen kommende kamper funnet for ${team.team.name}.`; // Handle no upcoming matches
                    }

                    return <p>{text}</p>;
                  })()}
                </div>
              </div>
            )}

            {/* --- NEW: Turneringer List Section --- */}
            {leagues.length > 0 && (
              <div className="mt-12">
                <h2 className="text-xl font-semibold mb-4">
                  Turneringer for {team.team.name}
                </h2>
                <div className="prose max-w-none">
                  <ul className="list-disc pl-5 space-y-1">
                    {leagues.map((league: any) => (
                      <li key={league.league.id}>
                        <Link
                          href={generateLeagueSlug(league.league.name, league.league.id)}
                          className="text-blue-600 hover:underline"
                        >
                          {league.league.name} ({league.country.name})
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {/* --- END: Turneringer List Section --- */}

            {/* Add the new component */}
            <OtherTeamsInLeague currentTeamId={teamId} leagues={leagues} />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('[TeamPage] Error rendering page:', error);
    return <div>Error loading team data.</div>;
  }
} 