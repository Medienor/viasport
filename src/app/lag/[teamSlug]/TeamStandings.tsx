"use client"

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { fetchTeamStandings } from '@/lib/api';
import { createTeamSlug } from '@/lib/utils';

interface TeamStandingsProps {
  teamId: number;
}

export default function TeamStandings({ teamId }: TeamStandingsProps) {
  console.log('TeamStandings component mounted with teamId:', teamId);
  
  const [standingsData, setStandingsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [standingsView, setStandingsView] = useState<'all' | 'home' | 'away'>('all');
  const [leagueSeason, setLeagueSeason] = useState<number>(new Date().getFullYear());
  const [availableSeasons, setAvailableSeasons] = useState<number[]>([]);
  const [currentLeague, setCurrentLeague] = useState<any>(null);

  useEffect(() => {
    console.log('TeamStandings useEffect triggered with teamId:', teamId);
    
    async function loadStandings() {
      console.log('Starting to load standings data for teamId:', teamId);
      try {
        setIsLoading(true);
        
        // Use the API function from lib/api.ts
        const data = await fetchTeamStandings(teamId);
        console.log('Fetched standings data:', data);
        
        if (data && data.length > 0) {
          setStandingsData(data);
          
          // Extract the league and season from the returned data
          if (data[0]?.league) {
            setCurrentLeague(data[0].league);
            setLeagueSeason(data[0].league.season);
            
            // Generate available seasons based on the current season
            const currentYear = new Date().getFullYear();
            const seasons = [currentYear, currentYear-1, currentYear-2, currentYear-3];
            setAvailableSeasons(seasons);
          }
          
          setError(null);
        } else {
          console.log('No standings data found in API response');
          setStandingsData([]);
          setError('Ingen tabelldata funnet for dette laget');
          
          // Still set some default seasons
          const currentYear = new Date().getFullYear();
          setAvailableSeasons([currentYear, currentYear-1, currentYear-2, currentYear-3]);
        }
      } catch (err) {
        console.error('Error loading standings:', err);
        setError('Kunne ikke laste tabelldata. Prøv igjen senere.');
        
        // Still set some default seasons
        const currentYear = new Date().getFullYear();
        setAvailableSeasons([currentYear, currentYear-1, currentYear-2, currentYear-3]);
      } finally {
        setIsLoading(false);
        console.log('Finished loading standings data');
      }
    }
    
    if (teamId) {
      loadStandings();
    } else {
      console.error('No teamId provided to TeamStandings component');
      setError('Manglende lag-ID');
      setIsLoading(false);
    }
  }, [teamId]);

  // Format season for display (e.g., "2023/24")
  const formatSeason = (season: number) => {
    return `${season}/${String(season + 1).slice(-2)}`;
  };

  // Get standings for the selected view
  const getStandingsForView = () => {
    if (!standingsData || standingsData.length === 0) {
      console.log('No standings data available');
      return [];
    }
    
    // Find the first standings entry
    const firstStandings = standingsData[0];
    
    if (!firstStandings || !firstStandings.league || !firstStandings.league.standings) {
      console.log('No standings found in data');
      return [];
    }
    
    // Get the standings array (usually at index 0)
    const standingsArray = firstStandings.league.standings[0] || [];
    
    return standingsArray;
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-6">Ligatabell</h2>
      
      {/* Always show the league info and controls, even if there's no data */}
      <div className="mb-6">
        {currentLeague ? (
          <div className="flex items-center mb-4">
            {currentLeague.logo && (
              <Image 
                src={currentLeague.logo} 
                alt={currentLeague.name} 
                width={32} 
                height={32} 
                className="mr-2"
              />
            )}
            <h3 className="text-lg font-medium">{currentLeague.name}</h3>
            {currentLeague.country && (
              <span className="ml-2 text-sm text-gray-500">({currentLeague.country})</span>
            )}
          </div>
        ) : (
          <div className="mb-4">
            <h3 className="text-lg font-medium">Ligatabell</h3>
          </div>
        )}
        
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStandingsView('all')}
              className={`px-3 py-1 text-sm rounded-full ${
                standingsView === 'all'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Alle kamper
            </button>
            <button
              onClick={() => setStandingsView('home')}
              className={`px-3 py-1 text-sm rounded-full ${
                standingsView === 'home'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Hjemmekamper
            </button>
            <button
              onClick={() => setStandingsView('away')}
              className={`px-3 py-1 text-sm rounded-full ${
                standingsView === 'away'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Bortekamper
            </button>
          </div>
          
          {availableSeasons.length > 0 && (
            <select
              value={leagueSeason}
              onChange={(e) => setLeagueSeason(Number(e.target.value))}
              className="ml-2 block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              {availableSeasons.map((season) => (
                <option key={season} value={season}>
                  {formatSeason(season)}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-gray-500">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Prøv igjen
          </button>
        </div>
      ) : standingsData.length > 0 && getStandingsForView().length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lag
                </th>
                <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  K
                </th>
                <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  V
                </th>
                <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  U
                </th>
                <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  T
                </th>
                <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  MF
                </th>
                <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  P
                </th>
                <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Form
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getStandingsForView().map((team: any) => (
                <tr 
                  key={team.team.id} 
                  className={team.team.id === teamId ? 'bg-blue-50' : ''}
                >
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <span className={`
                        w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium
                        ${team.rank <= 4 ? 'bg-green-100 text-green-800' : 
                          team.rank >= getStandingsForView().length - 3 ? 'bg-red-100 text-red-800' : 
                          'bg-gray-100 text-gray-800'}
                      `}>
                        {team.rank}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <Link 
                      href={`/lag/${createTeamSlug(team.team.name, team.team.id)}`}
                      className="flex items-center hover:underline"
                    >
                      {team.team.logo && (
                        <div className="flex-shrink-0 h-6 w-6 mr-2">
                          <Image
                            src={team.team.logo}
                            alt={team.team.name}
                            width={24}
                            height={24}
                            className="object-contain"
                          />
                        </div>
                      )}
                      <div className="text-sm font-medium text-gray-900">
                        {team.team.name}
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                    {team.all.played}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                    {standingsView === 'all' ? team.all.win : 
                     standingsView === 'home' ? team.home.win : team.away.win}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                    {standingsView === 'all' ? team.all.draw : 
                     standingsView === 'home' ? team.home.draw : team.away.draw}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                    {standingsView === 'all' ? team.all.lose : 
                     standingsView === 'home' ? team.home.lose : team.away.lose}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                    {standingsView === 'all' ? `${team.all.goals.for}:${team.all.goals.against}` : 
                     standingsView === 'home' ? `${team.home.goals.for}:${team.home.goals.against}` : 
                     `${team.away.goals.for}:${team.away.goals.against}`}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center font-medium text-gray-900">
                    {team.points}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-center">
                    <div className="flex space-x-1 justify-center">
                      {team.form && team.form.split('').map((result: string, idx: number) => (
                        <span 
                          key={idx}
                          className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-medium
                            ${result === 'W' ? 'bg-green-100 text-green-800' : 
                              result === 'D' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-red-100 text-red-800'}`}
                        >
                          {result === 'W' ? 'V' : result === 'D' ? 'U' : 'T'}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 border rounded-lg bg-gray-50">
          <p className="text-gray-500">Ingen tabelldata tilgjengelig for denne sesongen</p>
          <p className="text-sm text-gray-400 mt-2">Prøv en annen sesong eller sjekk tilbake senere</p>
          
          {/* Add a sample table structure to show what it would look like */}
          <div className="mt-8 max-w-md mx-auto">
            <table className="min-w-full divide-y divide-gray-200 opacity-50">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lag</th>
                  <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">K</th>
                  <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">P</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-300">{i}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-300">Lag {i}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-300">0</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-300">0</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 