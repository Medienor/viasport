"use client"

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

// Define interfaces for match details
interface Team {
  id: number;
  name: string;
  shortName?: string;
  tla?: string;
  crest: string;
  lineup?: Player[];
}

interface Player {
  id: number;
  name: string;
  position?: string;
  shirtNumber?: number;
}

interface Referee {
  id: number;
  name: string;
  role: string;
  nationality?: string;
}

interface Score {
  winner?: string;
  duration?: string;
  fullTime: {
    home: number | null;
    away: number | null;
  };
  halfTime?: {
    home: number | null;
    away: number | null;
  };
}

interface Competition {
  id: number;
  name: string;
  code?: string;
  type?: string;
  emblem?: string;
}

interface MatchDetails {
  id: number;
  utcDate: string;
  status: string;
  matchday?: number;
  stage?: string;
  group?: string;
  lastUpdated: string;
  venue?: string;
  homeTeam: Team;
  awayTeam: Team;
  score: Score;
  referees: Referee[];
  competition: Competition;
}

interface MatchDetailsModalProps {
  matchId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function MatchDetailsModal({ matchId, isOpen, onClose }: MatchDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchDetails, setMatchDetails] = useState<MatchDetails | null>(null);

  const fetchMatchDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/football/matches/${matchId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch match details');
      }
      
      const data = await response.json();
      setMatchDetails(data);
    } catch (error) {
      console.error('Error fetching match details:', error);
      setError('Could not load match details. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    if (isOpen && matchId) {
      fetchMatchDetails();
    }
  }, [isOpen, matchId, fetchMatchDetails]);

  if (!isOpen) return null;

  // Format date to Norwegian format
  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('nb-NO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Format time
  function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('nb-NO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Kampdetaljer</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-500 p-4">
              {error}
            </div>
          ) : matchDetails ? (
            <div>
              {/* Match header */}
              <div className="mb-6 text-center">
                <p className="text-gray-500 mb-1">{formatDate(matchDetails.utcDate)}</p>
                <p className="text-lg font-medium mb-2">{matchDetails.competition.name}</p>
                {matchDetails.venue && (
                  <p className="text-gray-500 text-sm">{matchDetails.venue}</p>
                )}
              </div>
              
              {/* Teams and score */}
              <div className="flex items-center justify-center mb-8">
                <div className="flex flex-col items-center w-2/5">
                  <Link href={`/lag/${matchDetails.homeTeam.id}`} className="flex flex-col items-center hover:text-blue-600">
                    {matchDetails.homeTeam.crest && (
                      <Image 
                        src={matchDetails.homeTeam.crest} 
                        alt={matchDetails.homeTeam.name} 
                        width={64} 
                        height={64}
                        className="h-16 w-16 mb-2"
                      />
                    )}
                    <span className="font-medium text-center">{matchDetails.homeTeam.name}</span>
                  </Link>
                </div>
                
                <div className="w-1/5 flex flex-col items-center">
                  <div className="text-2xl font-bold mb-1">
                    {matchDetails.status === 'FINISHED' || matchDetails.status === 'IN_PLAY' ? (
                      `${matchDetails.score.fullTime.home ?? '-'} - ${matchDetails.score.fullTime.away ?? '-'}`
                    ) : (
                      formatTime(matchDetails.utcDate)
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {matchDetails.status === 'FINISHED' ? 'Fullført' : 
                     matchDetails.status === 'IN_PLAY' ? 'Pågår' : 
                     matchDetails.status === 'PAUSED' ? 'Pause' :
                     matchDetails.status === 'SCHEDULED' ? 'Planlagt' : matchDetails.status}
                  </span>
                </div>
                
                <div className="flex flex-col items-center w-2/5">
                  <Link href={`/lag/${matchDetails.awayTeam.id}`} className="flex flex-col items-center hover:text-blue-600">
                    {matchDetails.awayTeam.crest && (
                      <Image 
                        src={matchDetails.awayTeam.crest} 
                        alt={matchDetails.awayTeam.name} 
                        width={64} 
                        height={64}
                        className="h-16 w-16 mb-2"
                      />
                    )}
                    <span className="font-medium text-center">{matchDetails.awayTeam.name}</span>
                  </Link>
                </div>
              </div>
              
              {/* Match details */}
              {matchDetails.referees && matchDetails.referees.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Dommere</h3>
                  <div className="bg-gray-50 rounded-lg p-3">
                    {matchDetails.referees.map((referee: Referee) => (
                      <div key={referee.id} className="mb-1 last:mb-0">
                        <span className="font-medium">{referee.name}</span>
                        <span className="text-gray-500 ml-2">{referee.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Lineups - if available */}
              {(matchDetails.homeTeam.lineup || matchDetails.awayTeam.lineup) && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Hjemmelag</h3>
                    {matchDetails.homeTeam.lineup ? (
                      <ul className="bg-gray-50 rounded-lg p-3">
                        {matchDetails.homeTeam.lineup.map((player: Player) => (
                          <li key={player.id} className="mb-1 last:mb-0">
                            <span className="font-medium">{player.name}</span>
                            <span className="text-gray-500 ml-2">({player.position})</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500">Lagoppstilling ikke tilgjengelig</p>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Bortelag</h3>
                    {matchDetails.awayTeam.lineup ? (
                      <ul className="bg-gray-50 rounded-lg p-3">
                        {matchDetails.awayTeam.lineup.map((player: Player) => (
                          <li key={player.id} className="mb-1 last:mb-0">
                            <span className="font-medium">{player.name}</span>
                            <span className="text-gray-500 ml-2">({player.position})</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500">Lagoppstilling ikke tilgjengelig</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Additional match info */}
              <div className="text-sm text-gray-500 mt-4">
                <p>Sist oppdatert: {new Date(matchDetails.lastUpdated).toLocaleString('nb-NO')}</p>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 p-4">
              Ingen kampdetaljer tilgjengelig
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 