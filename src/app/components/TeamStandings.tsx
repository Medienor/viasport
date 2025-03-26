"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface TeamStandingsProps {
  teamId: number;
  seasons: number[];
  teamName: string;
  hideSeasonSelector?: boolean;
}

export default function TeamStandings({ teamId, seasons, teamName, hideSeasonSelector = false }: TeamStandingsProps) {
  // Initialize with previous year as default since football seasons often span two years
  const currentYear = new Date().getFullYear();
  const defaultSeason = currentYear - 1;
  
  const [selectedSeason, setSelectedSeason] = useState<number>(defaultSeason);
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [teamLeagues, setTeamLeagues] = useState<any[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);

  // First, fetch the team's leagues for the selected season
  useEffect(() => {
    const fetchTeamLeagues = async () => {
      try {
        setLoading(true);
        
        console.log(`Fetching leagues for team ${teamId}, season ${selectedSeason}`);
        
        // Fetch the team's leagues for the selected season
        const response = await fetch(`/api/leagues?team=${teamId}&season=${selectedSeason}`);
        
        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Team leagues data:', data);
        
        if (data.response && data.response.length > 0) {
          // Filter to only include league competitions (not cups)
          const leagues = data.response.filter((league: any) => 
            league.league && league.league.type === 'League'
          );
          
          setTeamLeagues(leagues);
          
          // Set the first league as selected
          if (leagues.length > 0) {
            setSelectedLeagueId(leagues[0].league.id);
          } else {
            setSelectedLeagueId(null);
          }
        } else {
          setTeamLeagues([]);
          setSelectedLeagueId(null);
        }
      } catch (error) {
        console.error('Error fetching team leagues:', error);
        setError((error as Error).message);
      }
    };

    fetchTeamLeagues();
  }, [teamId, selectedSeason]);

  // Then fetch the full standings for the selected league
  useEffect(() => {
    const fetchLeagueStandings = async () => {
      if (!selectedLeagueId) {
        setStandings([]);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        console.log(`Fetching standings for league ${selectedLeagueId}, season ${selectedSeason}`);
        
        // Use the standings endpoint with league parameter to get all teams
        const response = await fetch(`/api/standings?league=${selectedLeagueId}&season=${selectedSeason}`);
        
        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('League standings data:', data);
        
        if (data.response && data.response.length > 0) {
          setStandings(data.response);
        } else {
          setStandings([]);
        }
      } catch (error) {
        console.error('Error fetching league standings:', error);
        setError((error as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeagueStandings();
  }, [selectedLeagueId, selectedSeason]);

  // Sort seasons in descending order
  const sortedSeasons = [...seasons].sort((a, b) => b - a);

  // Format season display (e.g., "2023/2024")
  const formatSeasonDisplay = (season: number) => {
    // For European leagues that span two years
    return `${season}/${season + 1}`;
  };

  // Translate form letters to Norwegian
  const translateForm = (form: string) => {
    if (!form) return '';
    return form.replace(/W/g, 'V').replace(/D/g, 'U').replace(/L/g, 'T');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">{teamName} Tabell</h2>
        
        <div className="flex items-center space-x-4">
          {/* League selector - only show if there are multiple leagues */}
          {teamLeagues.length > 1 && (
            <select
              value={selectedLeagueId || ''}
              onChange={(e) => setSelectedLeagueId(Number(e.target.value))}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              {teamLeagues.map((leagueData) => (
                <option key={leagueData.league.id} value={leagueData.league.id}>
                  {leagueData.league.name}
                </option>
              ))}
            </select>
          )}
          
          {/* Season selector - only show if hideSeasonSelector is false */}
          {!hideSeasonSelector && (
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(Number(e.target.value))}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              {sortedSeasons.map((season) => (
                <option key={season} value={season}>
                  {formatSeasonDisplay(season)}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <p className="text-gray-500">Laster tabell...</p>
        </div>
      ) : error ? (
        <div className="text-center py-4">
          <p className="text-red-500">Feil ved lasting av tabelldata: {error}</p>
        </div>
      ) : standings.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-500">Ingen tabelldata tilgjengelig for denne sesongen</p>
        </div>
      ) : (
        <div>
          {standings.map((standingData: any, index: number) => {
            const league = standingData.league;
            
            return (
              <div key={index} className="mb-6 last:mb-0">
                {/* League header */}
                <div className="flex items-center mb-4">
                  <div className="relative h-8 w-8 mr-3">
                    <Image
                      src={league.logo || '/images/league-placeholder.png'}
                      alt={league.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <h3 className="text-lg font-medium">{league.name}</h3>
                </div>
                
                {league.standings.map((standingGroup: any[], groupIndex: number) => (
                  <div key={groupIndex} className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            #
                          </th>
                          <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Lag
                          </th>
                          <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            K
                          </th>
                          <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            V
                          </th>
                          <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            U
                          </th>
                          <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            T
                          </th>
                          <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Mål
                          </th>
                          <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            +/-
                          </th>
                          <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            P
                          </th>
                          <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Form
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {standingGroup.map((standing: any) => {
                          const isCurrentTeam = standing.team.id === teamId;
                          const rowClass = isCurrentTeam ? 'bg-blue-50' : '';
                          const formTranslated = translateForm(standing.form);
                          
                          let rankClass = '';
                          if (standing.description) {
                            if (standing.description.includes('Champions League')) {
                              rankClass = 'bg-blue-100 text-blue-800';
                            } else if (standing.description.includes('Europa League')) {
                              rankClass = 'bg-orange-100 text-orange-800';
                            } else if (standing.description.includes('Conference League')) {
                              rankClass = 'bg-purple-100 text-purple-800';
                            } else if (standing.description.includes('Relegation')) {
                              rankClass = 'bg-red-100 text-red-800';
                            }
                          }
                          
                          return (
                            <tr key={standing.team.id} className={`hover:bg-gray-50 ${rowClass}`}>
                              <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex items-center">
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${rankClass || 'bg-gray-100 text-gray-800'}`}>
                                    {standing.rank}
                                  </span>
                                </div>
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap">
                                <Link href={`/lag/${standing.team.name.toLowerCase().replace(/\s+/g, '-')}-${standing.team.id}`}>
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0 h-6 w-6 relative">
                                      <Image
                                        src={standing.team.logo || '/images/team-placeholder.png'}
                                        alt={standing.team.name}
                                        fill
                                        className="object-contain"
                                      />
                                    </div>
                                    <span className={`ml-2 text-sm ${isCurrentTeam ? 'font-bold' : ''}`}>
                                      {standing.team.name}
                                    </span>
                                  </div>
                                </Link>
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap text-sm text-center">
                                {standing.all.played}
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap text-sm text-center">
                                {standing.all.win}
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap text-sm text-center">
                                {standing.all.draw}
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap text-sm text-center">
                                {standing.all.lose}
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap text-sm text-center">
                                {standing.all.goals.for}:{standing.all.goals.against}
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap text-sm text-center">
                                <span className={standing.goalsDiff > 0 ? 'text-green-600' : standing.goalsDiff < 0 ? 'text-red-600' : ''}>
                                  {standing.goalsDiff > 0 ? '+' : ''}{standing.goalsDiff}
                                </span>
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-center">
                                {standing.points}
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap text-center">
                                {formTranslated && (
                                  <div className="flex justify-center space-x-1">
                                    {formTranslated.split('').map((result, i) => (
                                      <span 
                                        key={i}
                                        className={`inline-block w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center
                                          ${result === 'V' ? 'bg-green-500 text-white' : 
                                            result === 'U' ? 'bg-gray-400 text-white' : 
                                            result === 'T' ? 'bg-red-500 text-white' : 'bg-gray-200'}
                                        `}
                                      >
                                        {result}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 