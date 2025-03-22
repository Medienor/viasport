"use client"

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getTeamStandings } from '@/app/services/sportApi';
import { getSlugFromTeamId } from '@/lib/utils';

// TEMPORARY API DISABLE FLAG - set to true to disable API calls
const DISABLE_API_CALLS = true;

interface ClientStandingsProps {
  teamId: number;
  leagueId: number;
}

interface League {
  id: number;
  name: string;
  logo: string;
  type: string;
  country: string;
  season: number;
  current: boolean;
}

export default function ClientStandings({ teamId, leagueId }: ClientStandingsProps) {
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(2023);
  const availableSeasons = [2024, 2023, 2022, 2021, 2020];
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<number | null>(null);
  const [leagueName, setLeagueName] = useState<string>('');

  useEffect(() => {
    async function fetchStandings() {
      try {
        setLoading(true);
        
        // Skip API call if disabled
        if (DISABLE_API_CALLS) {
          console.log(`[API DISABLED] Would have fetched standings for teamId: ${teamId}, leagueId: ${leagueId}`);
          
          // Mock standings data
          const mockStandings = [
            {
              rank: 1,
              team: { id: 50, name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
              points: 89,
              goalsDiff: 61,
              group: "Premier League",
              form: "WWWDW",
              status: "same",
              description: "Promotion - Champions League (Group Stage)",
              all: {
                played: 38,
                win: 28,
                draw: 5,
                lose: 5,
                goals: { for: 94, against: 33 }
              }
            },
            {
              rank: 2,
              team: { id: 42, name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png" },
              points: 84,
              goalsDiff: 45,
              group: "Premier League",
              form: "WDWWW",
              status: "same",
              description: "Promotion - Champions League (Group Stage)",
              all: {
                played: 38,
                win: 26,
                draw: 6,
                lose: 6,
                goals: { for: 88, against: 43 }
              }
            },
            {
              rank: 3,
              team: { id: 33, name: "Manchester United", logo: "https://media.api-sports.io/football/teams/33.png" },
              points: 75,
              goalsDiff: 15,
              group: "Premier League",
              form: "LWWLW",
              status: "same",
              description: "Promotion - Champions League (Group Stage)",
              all: {
                played: 38,
                win: 23,
                draw: 6,
                lose: 9,
                goals: { for: 58, against: 43 }
              }
            },
            {
              rank: 4,
              team: { id: 40, name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png" },
              points: 67,
              goalsDiff: 28,
              group: "Premier League",
              form: "WWWLW",
              status: "same",
              description: "Promotion - Champions League (Group Stage)",
              all: {
                played: 38,
                win: 19,
                draw: 10,
                lose: 9,
                goals: { for: 75, against: 47 }
              }
            },
            {
              rank: 5,
              team: { id: 47, name: "Tottenham", logo: "https://media.api-sports.io/football/teams/47.png" },
              points: 60,
              goalsDiff: 7,
              group: "Premier League",
              form: "LWLLL",
              status: "same",
              description: "Promotion - Europa League (Group Stage)",
              all: {
                played: 38,
                win: 18,
                draw: 6,
                lose: 14,
                goals: { for: 70, against: 63 }
              }
            }
          ];
          
          setStandings(mockStandings);
          setLoading(false);
          return;
        }
        
        const data = await getTeamStandings(teamId, leagueId);
        setStandings(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching standings:', err);
        setError('Failed to load standings');
        setLoading(false);
      }
    }

    if (teamId && leagueId) {
      fetchStandings();
    }
  }, [teamId, leagueId]);

  // Function to handle league change
  const handleLeagueChange = async (leagueId: number) => {
    try {
      setLoading(true);
      setSelectedLeague(leagueId);
      
      // Find the selected league to get its season
      const league = leagues.find(l => l.id === leagueId);
      if (league) {
        setSelectedSeason(league.season);
        
        // Fetch standings for the selected league
        const data = await getTeamStandings(teamId, leagueId);
        
        if (data && data.length > 0) {
          setStandings(data);
          
          if (data[0]?.league?.name) {
            setLeagueName(data[0].league.name);
          }
          
          setError(null);
        } else {
          setStandings([]);
          setError(`Ingen tabelldata funnet for ${league.name}`);
        }
      }
    } catch (err) {
      console.error(`Error loading standings for league ${leagueId}:`, err);
      setError(`Kunne ikke laste tabelldata for valgt liga`);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle season change
  const handleSeasonChange = async (season: number) => {
    if (!selectedLeague) return;
    
    try {
      setLoading(true);
      setSelectedSeason(season);
      
      // Fetch standings for the selected league and season
      const data = await getTeamStandings(teamId, selectedLeague);
      
      if (data && data.length > 0) {
        setStandings(data);
        setError(null);
      } else {
        setError(`Ingen tabelldata funnet for sesongen ${season}`);
      }
    } catch (err) {
      console.error(`Error loading standings for season ${season}:`, err);
      setError(`Kunne ikke laste tabelldata for sesongen ${season}`);
    } finally {
      setLoading(false);
    }
  };

  // Format season for display
  const formatSeasonDisplay = (season: number) => `${season}/${season + 1}`;

  if (loading) return <div>Loading standings...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!standings.length) return <div>No standings available</div>;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="flex-1">
          <h2 className="text-2xl font-bold">Ligatabell</h2>
          <p className="text-gray-700">{leagueName || 'Tabellposisjon'}</p>
        </div>
        
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* League selector */}
          {leagues.length > 1 && (
            <div className="relative">
              <label htmlFor="league-select" className="block text-sm font-medium text-gray-700 mb-1">
                Velg liga:
              </label>
              <div className="relative inline-block w-full sm:w-auto">
                <select
                  id="league-select"
                  value={selectedLeague || ''}
                  onChange={(e) => handleLeagueChange(Number(e.target.value))}
                  className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-10 py-2 text-sm font-medium text-gray-700 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer transition-colors w-full"
                >
                  {leagues.map((league) => (
                    <option key={league.id} value={league.id}>
                      {league.name} ({league.country})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          )}
          
          {/* Season selector */}
          <div className="relative">
            <label htmlFor="season-select" className="block text-sm font-medium text-gray-700 mb-1">
              Velg sesong:
            </label>
            <div className="relative inline-block w-full sm:w-auto">
              <select
                id="season-select"
                value={selectedSeason}
                onChange={(e) => handleSeasonChange(Number(e.target.value))}
                className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-10 py-2 text-sm font-medium text-gray-700 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer transition-colors w-full"
              >
                {availableSeasons.map((season) => (
                  <option key={season} value={season}>
                    {formatSeasonDisplay(season)}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lag</th>
              <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">K</th>
              <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">V</th>
              <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">U</th>
              <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">T</th>
              <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">P</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {standings.map((team: any) => {
              // Create a slug for the team
              const teamSlug = getSlugFromTeamId(team.team.id, team.team.name);
              
              return (
                <tr key={team.team.id} className={team.team.id === teamId ? 'bg-blue-50' : ''}>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{team.rank}</td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <Link href={`/lag/${teamSlug}`} className="flex items-center hover:text-blue-600">
                      {team.team.logo && (
                        <div className="flex-shrink-0 h-6 w-6 mr-2">
                          <Image 
                            src={team.team.logo} 
                            alt={team.team.name} 
                            width={24} 
                            height={24}
                            className="h-6 w-6" 
                          />
                        </div>
                      )}
                      <div className="text-sm font-medium text-gray-900 hover:text-blue-600">
                        {team.team.name}
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-500">{team.all.played}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-500">{team.all.win}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-500">{team.all.draw}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-500">{team.all.lose}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center font-medium text-gray-900">{team.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
} 