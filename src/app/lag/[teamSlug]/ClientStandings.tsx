"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { fetchTeamLeaguesWithStandings, fetchLeagueStandings } from '@/lib/api';
import { getSlugFromTeamId } from '@/lib/utils';

interface ClientStandingsProps {
  teamId: number;
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

export default function ClientStandings({ teamId }: ClientStandingsProps) {
  const [standingsData, setStandingsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(2023);
  const availableSeasons = [2024, 2023, 2022, 2021, 2020];
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<number | null>(null);
  const [leagueName, setLeagueName] = useState<string>('');

  // Fetch leagues the team is in
  useEffect(() => {
    async function loadTeamLeagues() {
      try {
        setIsLoading(true);
        const leaguesData = await fetchTeamLeaguesWithStandings(teamId);
        
        if (leaguesData && leaguesData.length > 0) {
          setLeagues(leaguesData);
          
          // Set the first league as selected by default
          const defaultLeague = leaguesData[0];
          setSelectedLeague(defaultLeague.id);
          setSelectedSeason(defaultLeague.season);
          
          // Load standings for the default league
          const standingsData = await fetchLeagueStandings(defaultLeague.id, defaultLeague.season);
          setStandingsData(standingsData);
          
          if (standingsData && standingsData.length > 0 && standingsData[0]?.league?.name) {
            setLeagueName(standingsData[0].league.name);
          }
          
          setError(null);
        } else {
          setLeagues([]);
          setError('Ingen ligaer funnet for dette laget');
        }
      } catch (err) {
        console.error('Error loading team leagues:', err);
        setError('Kunne ikke laste ligadata. Prøv igjen senere.');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadTeamLeagues();
  }, [teamId]);

  // Function to handle league change
  const handleLeagueChange = async (leagueId: number) => {
    try {
      setIsLoading(true);
      setSelectedLeague(leagueId);
      
      // Find the selected league to get its season
      const league = leagues.find(l => l.id === leagueId);
      if (league) {
        setSelectedSeason(league.season);
        
        // Fetch standings for the selected league
        const data = await fetchLeagueStandings(leagueId, league.season);
        
        if (data && data.length > 0) {
          setStandingsData(data);
          
          if (data[0]?.league?.name) {
            setLeagueName(data[0].league.name);
          }
          
          setError(null);
        } else {
          setStandingsData([]);
          setError(`Ingen tabelldata funnet for ${league.name}`);
        }
      }
    } catch (err) {
      console.error(`Error loading standings for league ${leagueId}:`, err);
      setError(`Kunne ikke laste tabelldata for valgt liga`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle season change
  const handleSeasonChange = async (season: number) => {
    if (!selectedLeague) return;
    
    try {
      setIsLoading(true);
      setSelectedSeason(season);
      
      // Fetch standings for the selected league and season
      const data = await fetchLeagueStandings(selectedLeague, season);
      
      if (data && data.length > 0) {
        setStandingsData(data);
        setError(null);
      } else {
        setError(`Ingen tabelldata funnet for sesongen ${season}`);
      }
    } catch (err) {
      console.error(`Error loading standings for season ${season}:`, err);
      setError(`Kunne ikke laste tabelldata for sesongen ${season}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Format season for display
  const formatSeasonDisplay = (season: number) => `${season}/${season + 1}`;

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
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-gray-500">{error}</p>
          <p className="text-sm text-gray-400 mt-2">Prøv en annen liga eller sesong</p>
        </div>
      ) : standingsData.length > 0 ? (
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
              {standingsData[0]?.league?.standings[0]?.map((team: any) => {
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
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">Ingen tabelldata tilgjengelig</p>
        </div>
      )}
    </div>
  );
} 