"use client"

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BASE_URL, headers } from '../services/sportApi';

interface TeamStanding {
  rank: number;
  team: {
    id: number;
    name: string;
    logo: string;
  };
  points: number;
  goalsDiff: number;
  group: string;
  form: string;
  status: string;
  description: string;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: {
      for: number;
      against: number;
    };
  };
  home: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: {
      for: number;
      against: number;
    };
  };
  away: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: {
      for: number;
      against: number;
    };
  };
  update: string;
}

interface LeagueStanding {
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
    standings: TeamStanding[][];
  };
}

interface LeagueStandingsProps {
  leagueId: number;
  leagueName: string;
  season: number;
}

// Create a team slug from team name and ID
const createTeamSlug = (name: string, id: number): string => {
  const nameSlug = name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
  
  return `${nameSlug}-${id}`;
};

// Create a league slug from league name and ID
const createLeagueSlug = (name: string, id: number): string => {
  const nameSlug = name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
  
  return `${nameSlug}-${id}`;
};

export default function LeagueStandings({ leagueId, leagueName, season }: LeagueStandingsProps) {
  const [standings, setStandings] = useState<TeamStanding[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [leagueInfo, setLeagueInfo] = useState<{
    logo: string;
    country: string;
    flag: string;
  } | null>(null);

  useEffect(() => {
    const fetchStandings = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`${BASE_URL}/standings?league=${leagueId}&season=${season}`, {
          headers,
          next: { revalidate: 3600 } // 1 hour for standings
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch standings: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.response && data.response.length > 0) {
          const leagueData = data.response[0] as LeagueStanding;
          
          // Set league info
          setLeagueInfo({
            logo: leagueData.league.logo,
            country: leagueData.league.country,
            flag: leagueData.league.flag
          });
          
          // Get the first standings array (most leagues only have one)
          if (leagueData.league.standings && leagueData.league.standings.length > 0) {
            setStandings(leagueData.league.standings[0]);
          } else {
            setStandings(null);
          }
        } else {
          setStandings(null);
        }
      } catch (err) {
        console.error('Error fetching standings:', err);
        setError('Kunne ikke hente tabellen. Prøv igjen senere.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStandings();
  }, [leagueId, season]);

  // Format form string (W, D, L) with colors
  const formatForm = (form: string) => {
    if (!form) return null;
    
    return form.split('').map((result, index) => {
      let bgColor = 'bg-gray-200 text-gray-700';
      
      if (result === 'W') bgColor = 'bg-green-500 text-white';
      else if (result === 'L') bgColor = 'bg-red-500 text-white';
      else if (result === 'D') bgColor = 'bg-yellow-500 text-white';
      
      return (
        <span 
          key={index} 
          className={`inline-block w-6 h-6 rounded-full ${bgColor} text-xs font-bold flex items-center justify-center mx-0.5`}
        >
          {result}
        </span>
      );
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* League header */}
      <div className="bg-gray-50 p-4 border-b border-gray-200">
        <div className="flex items-center">
          {leagueInfo?.logo && (
            <div className="flex-shrink-0 mr-3">
              <Image 
                src={leagueInfo.logo} 
                alt={leagueName} 
                width={32} 
                height={32} 
                className="h-8 w-8"
              />
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              <Link 
                href={`/fotball/liga/${createLeagueSlug(leagueName, leagueId)}`}
                className="hover:text-blue-600"
              >
                {leagueName}
              </Link>
            </h3>
            {leagueInfo?.country && (
              <div className="flex items-center text-sm text-gray-500">
                {leagueInfo.flag && (
                  <Image 
                    src={leagueInfo.flag} 
                    alt={leagueInfo.country} 
                    width={16} 
                    height={12} 
                    className="h-3 w-4 mr-1"
                  />
                )}
                <span>{leagueInfo.country}</span>
              </div>
            )}
          </div>
          <div className="ml-auto">
            <Link 
              href={`/fotball/liga/${createLeagueSlug(leagueName, leagueId)}`}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Se full tabell
            </Link>
          </div>
        </div>
      </div>
      
      {/* Standings table */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-2 text-gray-500">Laster tabell...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500">{error}</div>
        ) : standings && standings.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">#</th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lag</th>
                <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-10">K</th>
                <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-10">V</th>
                <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-10">U</th>
                <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-10">T</th>
                <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Mål</th>
                <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">+/-</th>
                <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">P</th>
                <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28 hidden md:table-cell">Form</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {standings.slice(0, 8).map((team) => (
                <tr key={team.team.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                    {team.rank}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center">
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
                      <Link 
                        href={`/lag/${createTeamSlug(team.team.name, team.team.id)}`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600"
                      >
                        {team.team.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-500">
                    {team.all.played}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-500">
                    {team.all.win}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-500">
                    {team.all.draw}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-500">
                    {team.all.lose}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-500">
                    {team.all.goals.for}:{team.all.goals.against}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-center font-medium">
                    <span className={team.goalsDiff > 0 ? 'text-green-600' : team.goalsDiff < 0 ? 'text-red-600' : 'text-gray-500'}>
                      {team.goalsDiff > 0 ? '+' : ''}{team.goalsDiff}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-center font-bold text-gray-900">
                    {team.points}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-center hidden md:table-cell">
                    <div className="flex justify-center">
                      {formatForm(team.form)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-6 text-center text-gray-500">
            Ingen tabelldata tilgjengelig.
          </div>
        )}
      </div>
      
      {/* Footer with link to full standings */}
      <div className="bg-gray-50 px-4 py-3 text-right">
        <Link 
          href={`/fotball/liga/${createLeagueSlug(leagueName, leagueId)}`}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Se full tabell →
        </Link>
      </div>
    </div>
  );
} 