"use client"

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getLiveMatches, Fixture as ApiFixture } from '@/app/services/sportApi';
import MatchCalendar from '@/app/components/MatchCalendar';
import { createTeamSlug, createLeagueSlug } from '@/app/utils/slugUtils';

// Define the correct Fixture interface that matches the API response
interface FixtureStatus {
  short: string;
  elapsed?: number;
}

interface FixtureDetail {
  id: number;
  date: string;
  status: FixtureStatus;
}

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

export default function LiveMatchesPage() {
  const params = useParams();
  const router = useRouter();
  const sport = params.sport as string;
  
  // Get formatted sport name - wrapped in useCallback
  const getSportName = useCallback(() => {
    return sport.charAt(0).toUpperCase() + sport.slice(1);
  }, [sport]);
  
  const [fixturesByLeague, setFixturesByLeague] = useState<Record<string, Fixture[]>>({});
  const [sortedLeagues, setSortedLeagues] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set document title
  useEffect(() => {
    document.title = `Direktesendte ${getSportName()}-kamper (LIVE NÅ) | ViaSport.no`;
  }, [sport, getSportName]);

  // Fetch live matches
  useEffect(() => {
    const fetchLiveMatches = async () => {
      setLoading(true);
      try {
        // For football, use the existing sportApi service
        if (sport === 'fotball') {
          const matches = await getLiveMatches();
          console.log("Live matches:", matches); // Debug log
          
          // Group fixtures by league - explicitly type the accumulator
          const groupedFixtures: Record<string, Fixture[]> = matches.reduce((acc: Record<string, Fixture[]>, fixture: ApiFixture) => {
            const leagueId = fixture.league.id.toString();
            if (!acc[leagueId]) {
              acc[leagueId] = [];
            }
            // Convert ApiFixture to our local Fixture type if needed
            acc[leagueId].push(fixture as unknown as Fixture);
            return acc;
          }, {} as Record<string, Fixture[]>);
          
          setFixturesByLeague(groupedFixtures);
          
          // Sort leagues by number of fixtures (more fixtures first)
          const sorted = Object.keys(groupedFixtures).sort((a, b) => {
            return groupedFixtures[b].length - groupedFixtures[a].length;
          });
          
          setSortedLeagues(sorted);
        } 
        // For other sports, implement their respective API calls
        else {
          // Mock data for other sports until their APIs are implemented
          setFixturesByLeague({});
          setSortedLeagues([]);
        }
      } catch (err) {
        console.error('Error fetching live matches:', err);
        setError('Kunne ikke hente direktesendte kamper. Vennligst prøv igjen senere.');
      } finally {
        setLoading(false);
      }
    };

    fetchLiveMatches();
    
    // Set up polling to refresh live match data every minute
    const intervalId = setInterval(fetchLiveMatches, 60000);
    
    return () => clearInterval(intervalId);
  }, [sport]);

  // Format time from date string
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
  };

  // Handle match click
  const handleMatchClick = (matchId: number) => {
    router.push(`/${sport}/kamp/${matchId}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left column - Live matches - First on mobile and desktop */}
        <div className="w-full md:w-2/3 order-1">
          {loading ? (
            <div className="p-8 text-center text-gray-500 bg-white shadow rounded-lg">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4">Laster inn direktesendte kamper...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 bg-white shadow rounded-lg">
              <p>{error}</p>
            </div>
          ) : (
            <div className="space-y-8">
              <h1 className="text-lg font-bold text-gray-900">Direktesendte {getSportName()}-kamper</h1>
              
              {sortedLeagues.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-white shadow rounded-lg">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-2">Ingen direktesendte kamper akkurat nå.</p>
                </div>
              ) : (
                sortedLeagues.map((leagueId) => {
                  const leagueFixtures = fixturesByLeague[leagueId];
                  const leagueInfo = leagueFixtures[0].league;
                  
                  return (
                    <div key={leagueId} className="bg-white shadow overflow-hidden sm:rounded-lg">
                      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center">
                          {leagueInfo.logo && (
                            <div className="flex-shrink-0 h-8 w-8 relative mr-3">
                              <Image
                                src={leagueInfo.logo}
                                alt={leagueInfo.name}
                                fill
                                className="object-contain"
                              />
                            </div>
                          )}
                          <h2 className="text-xl font-semibold text-gray-900">
                            <Link 
                              href={`/${sport}/liga/${createLeagueSlug(leagueInfo.name)}-${leagueInfo.id}`}
                              className="hover:text-blue-600"
                            >
                              {leagueInfo.name}
                            </Link>
                          </h2>
                          <span className="ml-2 text-sm text-gray-500">({leagueFixtures.length} kamper)</span>
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Hjemmelag
                              </th>
                              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Bortelag
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tid
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {leagueFixtures.map((fixture: Fixture) => (
                              <tr 
                                key={fixture.fixture.id} 
                                className="hover:bg-gray-50 cursor-pointer"
                                onClick={() => handleMatchClick(fixture.fixture.id)}
                              >
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="bg-red-600 text-white text-xs font-medium px-3 py-0.5 rounded-full flex items-center justify-center w-20">
                                    <span className="inline-block w-1.5 h-1.5 bg-white bg-opacity-70 rounded-full animate-pulse mr-1.5"></span>
                                    {fixture.fixture.status.elapsed || '0'}&apos;
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    {fixture.teams?.home?.logo && (
                                      <div className="flex-shrink-0 h-6 w-6 relative">
                                        <Image
                                          src={fixture.teams.home.logo}
                                          alt={fixture.teams?.home?.name || 'Home team'}
                                          fill
                                          className="object-contain"
                                        />
                                      </div>
                                    )}
                                    <div className="ml-3 text-sm font-medium text-gray-900">
                                      <Link 
                                        href={`/${sport}/lag/${createTeamSlug(fixture.teams?.home?.name || '')}-${fixture.teams?.home?.id}`}
                                        className="mr-3 text-sm font-medium text-gray-900 hover:text-blue-600"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {fixture.teams?.home?.name || 'Home Team'}
                                      </Link>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                  <span className="font-bold text-base">
                                    {fixture.goals.home} - {fixture.goals.away}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    {fixture.teams?.away?.logo && (
                                      <div className="flex-shrink-0 h-6 w-6 relative">
                                        <Image
                                          src={fixture.teams.away.logo}
                                          alt={fixture.teams?.away?.name || 'Away team'}
                                          fill
                                          className="object-contain"
                                        />
                                      </div>
                                    )}
                                    <div className="ml-3 text-sm font-medium text-gray-900">
                                      <Link 
                                        href={`/${sport}/lag/${createTeamSlug(fixture.teams?.away?.name || '')}-${fixture.teams?.away?.id}`}
                                        className="mr-3 text-sm font-medium text-gray-900 hover:text-blue-600"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {fixture.teams?.away?.name || 'Away Team'}
                                      </Link>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {formatTime(fixture.fixture.date)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
        
        {/* Right column - Calendar - Second on mobile, second on desktop */}
        <div className="w-full md:w-1/3 order-2">
          <MatchCalendar currentMatchId="" />
        </div>
      </div>
    </div>
  );
} 