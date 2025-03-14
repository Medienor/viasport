"use client"

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getTeamStatistics } from '@/app/services/sportApi';

// Cache structure
interface StatisticsCache {
  data: TeamStatistics;
  timestamp: number;
}

interface TeamStatistics {
  team: {
    id: number;
    name: string;
    logo: string;
  };
  fixtures: {
    played: {
      home: number;
      away: number;
      total: number;
    };
    wins: {
      home: number;
      away: number;
      total: number;
    };
    draws: {
      home: number;
      away: number;
      total: number;
    };
    loses: {
      home: number;
      away: number;
      total: number;
    };
  };
  goals: {
    for: {
      total: {
        home: number;
        away: number;
        total: number;
      };
      average: {
        home: string;
        away: string;
        total: string;
      };
    };
    against: {
      total: {
        home: number;
        away: number;
        total: number;
      };
      average: {
        home: string;
        away: string;
        total: string;
      };
    };
  };
}

interface TeamStatisticsTableProps {
  homeTeamId: number;
  awayTeamId: number;
  leagueId: number;
  season: number;
}

// Cache duration constants
const ONE_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const ONE_WEEK = 7 * ONE_DAY; // 7 days in milliseconds

// Add this function at the top of the file, after the constants
function cleanupOldCache() {
  try {
    // Get all keys from localStorage that start with 'stats-'
    const statsKeys = Object.keys(localStorage).filter(key => key.startsWith('stats-'));
    
    if (statsKeys.length > 20) { // If we have more than 20 cached teams
      // Sort keys by timestamp, oldest first
      const sortedKeys = statsKeys.sort((a, b) => {
        const aData = JSON.parse(localStorage.getItem(a) || '{"timestamp": 0}');
        const bData = JSON.parse(localStorage.getItem(b) || '{"timestamp": 0}');
        return aData.timestamp - bData.timestamp;
      });
      
      // Remove the oldest 5 items
      sortedKeys.slice(0, 5).forEach(key => {
        localStorage.removeItem(key);
        console.log('Removed old cache:', key);
      });
    }
  } catch (e) {
    console.error('Error during cache cleanup:', e);
  }
}

export default function TeamStatisticsTable({ homeTeamId, awayTeamId, leagueId, season }: TeamStatisticsTableProps) {
  // Initialize with cached data if available
  const [homeTeamStats, setHomeTeamStats] = useState<TeamStatistics | null>(() => {
    try {
      const cachedHomeStats = localStorage.getItem(`stats-${homeTeamId}-${leagueId}-${season}`);
      if (cachedHomeStats) {
        const parsedCache = JSON.parse(cachedHomeStats) as StatisticsCache;
        const now = Date.now();
        const cacheAge = now - parsedCache.timestamp;
        
        // Use cache if it's less than a week old (we'll validate more precisely in the effect)
        if (cacheAge < ONE_WEEK) {
          return parsedCache.data;
        }
      }
      return null;
    } catch (e) {
      console.error("Error reading home team cache during initialization:", e);
      return null;
    }
  });
  
  const [awayTeamStats, setAwayTeamStats] = useState<TeamStatistics | null>(() => {
    try {
      const cachedAwayStats = localStorage.getItem(`stats-${awayTeamId}-${leagueId}-${season}`);
      if (cachedAwayStats) {
        const parsedCache = JSON.parse(cachedAwayStats) as StatisticsCache;
        const now = Date.now();
        const cacheAge = now - parsedCache.timestamp;
        
        // Use cache if it's less than a week old (we'll validate more precisely in the effect)
        if (cacheAge < ONE_WEEK) {
          return parsedCache.data;
        }
      }
      return null;
    } catch (e) {
      console.error("Error reading away team cache during initialization:", e);
      return null;
    }
  });
  
  // Only show loading if we don't have initial cached data
  const [loading, setLoading] = useState(!homeTeamStats || !awayTeamStats);
  const [error, setError] = useState<string | null>(null);
  const [cacheStatus, setCacheStatus] = useState<{home: string, away: string}>({
    home: homeTeamStats ? 'hit' : 'unknown',
    away: awayTeamStats ? 'hit' : 'unknown'
  });

  useEffect(() => {
    // If we already have both stats from cache, no need to fetch
    if (homeTeamStats && awayTeamStats) {
      // Still validate cache in the background
      validateAndRefreshCache();
      return;
    }
    
    // Otherwise, fetch the missing data
    fetchTeamStatistics();
    
    async function validateAndRefreshCache() {
      const today = new Date().toISOString().split('T')[0];
      const homeTeamCacheKey = `stats-${homeTeamId}-${leagueId}-${season}`;
      const awayTeamCacheKey = `stats-${awayTeamId}-${leagueId}-${season}`;
      
      try {
        // Check if home team cache needs refresh
        const cachedHomeStats = localStorage.getItem(homeTeamCacheKey);
        if (cachedHomeStats) {
          const parsedCache = JSON.parse(cachedHomeStats) as StatisticsCache;
          const now = Date.now();
          const cacheAge = now - parsedCache.timestamp;
          
          const hasFixtureToday = await checkTeamHasFixtureToday(homeTeamId, today);
          
          // Refresh cache if needed, but don't show loading state
          if ((hasFixtureToday && cacheAge >= ONE_DAY) || (!hasFixtureToday && cacheAge >= ONE_WEEK)) {
            console.log(`Refreshing cache for home team ${homeTeamId} in the background`);
            const freshHomeStats = await getTeamStatistics(homeTeamId, leagueId, season);
            if (freshHomeStats) {
              setHomeTeamStats(freshHomeStats);
              localStorage.setItem(homeTeamCacheKey, JSON.stringify({
                data: freshHomeStats,
                timestamp: Date.now()
              }));
            }
          }
        }
        
        // Check if away team cache needs refresh
        const cachedAwayStats = localStorage.getItem(awayTeamCacheKey);
        if (cachedAwayStats) {
          const parsedCache = JSON.parse(cachedAwayStats) as StatisticsCache;
          const now = Date.now();
          const cacheAge = now - parsedCache.timestamp;
          
          const hasFixtureToday = await checkTeamHasFixtureToday(awayTeamId, today);
          
          // Refresh cache if needed, but don't show loading state
          if ((hasFixtureToday && cacheAge >= ONE_DAY) || (!hasFixtureToday && cacheAge >= ONE_WEEK)) {
            console.log(`Refreshing cache for away team ${awayTeamId} in the background`);
            const freshAwayStats = await getTeamStatistics(awayTeamId, leagueId, season);
            if (freshAwayStats) {
              setAwayTeamStats(freshAwayStats);
              localStorage.setItem(awayTeamCacheKey, JSON.stringify({
                data: freshAwayStats,
                timestamp: Date.now()
              }));
            }
          }
        }
      } catch (e) {
        console.error("Error validating cache:", e);
      }
    }
    
    async function fetchTeamStatistics() {
      const homeTeamCacheKey = `stats-${homeTeamId}-${leagueId}-${season}`;
      const awayTeamCacheKey = `stats-${awayTeamId}-${leagueId}-${season}`;
      const today = new Date().toISOString().split('T')[0];
      
      let homeStats = homeTeamStats;
      let awayStats = awayTeamStats;
      
      try {
        // Only fetch home team stats if not already loaded
        if (!homeStats) {
          // Check cache again (in case it was updated between initial render and effect)
          try {
            const cachedHomeStats = localStorage.getItem(homeTeamCacheKey);
            if (cachedHomeStats) {
              const parsedCache = JSON.parse(cachedHomeStats) as StatisticsCache;
              const now = Date.now();
              const cacheAge = now - parsedCache.timestamp;
              
              const hasFixtureToday = await checkTeamHasFixtureToday(homeTeamId, today);
              
              if ((hasFixtureToday && cacheAge < ONE_DAY) || (!hasFixtureToday && cacheAge < ONE_WEEK)) {
                homeStats = parsedCache.data;
                setCacheStatus(prev => ({...prev, home: 'hit'}));
                console.log(`Using cached statistics for home team ${homeTeamId}`);
              } else {
                setCacheStatus(prev => ({...prev, home: 'expired'}));
              }
            } else {
              setCacheStatus(prev => ({...prev, home: 'miss'}));
            }
          } catch (e) {
            console.error("Error reading home team cache:", e);
            setCacheStatus(prev => ({...prev, home: 'error'}));
          }
          
          // If still no home stats, fetch them
          if (!homeStats) {
            console.log(`Fetching fresh statistics for home team ${homeTeamId}`);
            homeStats = await getTeamStatistics(homeTeamId, leagueId, season);
            
            // Before caching new data, try to clean up
            if (!homeStats) {
              try {
                cleanupOldCache();
                localStorage.setItem(homeTeamCacheKey, JSON.stringify({
                  data: homeStats,
                  timestamp: Date.now()
                }));
              } catch (e) {
                console.warn('Failed to cache home team stats:', e);
              }
            }
          }
        }
        
        // Only fetch away team stats if not already loaded
        if (!awayStats) {
          // Check cache again
          try {
            const cachedAwayStats = localStorage.getItem(awayTeamCacheKey);
            if (cachedAwayStats) {
              const parsedCache = JSON.parse(cachedAwayStats) as StatisticsCache;
              const now = Date.now();
              const cacheAge = now - parsedCache.timestamp;
              
              const hasFixtureToday = await checkTeamHasFixtureToday(awayTeamId, today);
              
              if ((hasFixtureToday && cacheAge < ONE_DAY) || (!hasFixtureToday && cacheAge < ONE_WEEK)) {
                awayStats = parsedCache.data;
                setCacheStatus(prev => ({...prev, away: 'hit'}));
                console.log(`Using cached statistics for away team ${awayTeamId}`);
              } else {
                setCacheStatus(prev => ({...prev, away: 'expired'}));
              }
            } else {
              setCacheStatus(prev => ({...prev, away: 'miss'}));
            }
          } catch (e) {
            console.error("Error reading away team cache:", e);
            setCacheStatus(prev => ({...prev, away: 'error'}));
          }
          
          // If still no away stats, fetch them
          if (!awayStats) {
            console.log(`Fetching fresh statistics for away team ${awayTeamId}`);
            awayStats = await getTeamStatistics(awayTeamId, leagueId, season);
            
            // Before caching new data, try to clean up
            if (!awayStats) {
              try {
                cleanupOldCache();
                localStorage.setItem(awayTeamCacheKey, JSON.stringify({
                  data: awayStats,
                  timestamp: Date.now()
                }));
              } catch (e) {
                console.warn('Failed to cache away team stats:', e);
              }
            }
          }
        }
        
        // Update state with the stats we have
        if (homeStats && !homeTeamStats) {
          setHomeTeamStats(homeStats);
        }
        
        if (awayStats && !awayTeamStats) {
          setAwayTeamStats(awayStats);
        }
        
        // If we still don't have both stats, show an error
        if (!homeStats || !awayStats) {
          throw new Error("Could not fetch team statistics");
        }
      } catch (err) {
        console.error("Error fetching team statistics:", err);
        setError("Kunne ikke hente lagstatistikk");
      } finally {
        setLoading(false);
      }
    }
  }, [homeTeamId, awayTeamId, leagueId, season, homeTeamStats, awayTeamStats]);
  
  // Helper function to check if a team has a fixture today
  async function checkTeamHasFixtureToday(teamId: number, todayStr: string) {
    try {
      const response = await fetch(`/api/fixtures?team=${teamId}&date=${todayStr}`);
      if (!response.ok) return false;
      
      const data = await response.json();
      return data.response && data.response.length > 0;
    } catch (error) {
      console.error("Error checking team fixtures:", error);
      return false;
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 mb-6">
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-500">Laster statistikk...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 mb-6">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!homeTeamStats || !awayTeamStats) {
    return (
      <div className="bg-white rounded-lg p-6 mb-6">
        <div className="text-gray-500">Ingen statistikk tilgjengelig</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-0 mb-6">
      <div className="flex justify-between items-center mb-4 px-4 pt-4">
        <h2 className="text-lg font-bold">Lagstatistikk</h2>
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-500">
            Cache: Home {cacheStatus.home}, Away {cacheStatus.away}
          </div>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                Statistikk
              </th>
              <th scope="col" colSpan={3} className="px-3 py-2 text-center">
                <div className="flex items-center justify-center space-x-2">
                  <Image 
                    src={homeTeamStats.team.logo} 
                    alt={homeTeamStats.team.name} 
                    width={24} 
                    height={24} 
                    className="inline-block"
                  />
                  <span className="text-xs font-medium">{homeTeamStats.team.name}</span>
                </div>
              </th>
              <th scope="col" colSpan={3} className="px-3 py-2 text-center">
                <div className="flex items-center justify-center space-x-2">
                  <Image 
                    src={awayTeamStats.team.logo} 
                    alt={awayTeamStats.team.name} 
                    width={24} 
                    height={24} 
                    className="inline-block"
                  />
                  <span className="text-xs font-medium">{awayTeamStats.team.name}</span>
                </div>
              </th>
            </tr>
            <tr>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                
              </th>
              <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hjemme
              </th>
              <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Borte
              </th>
              <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Totalt
              </th>
              <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hjemme
              </th>
              <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Borte
              </th>
              <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Totalt
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Games played */}
            <tr>
              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">Kamper spilt</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-green-600 font-medium">{homeTeamStats.fixtures.played.home}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">{homeTeamStats.fixtures.played.away}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">{homeTeamStats.fixtures.played.total}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">{awayTeamStats.fixtures.played.home}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-red-600 font-medium">{awayTeamStats.fixtures.played.away}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">{awayTeamStats.fixtures.played.total}</td>
            </tr>
            
            {/* Wins */}
            <tr className="bg-gray-50">
              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">Seire</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-green-600 font-medium">{homeTeamStats.fixtures.wins.home}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">{homeTeamStats.fixtures.wins.away}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-green-600 font-medium">{homeTeamStats.fixtures.wins.total}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">{awayTeamStats.fixtures.wins.home}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-red-600 font-medium">{awayTeamStats.fixtures.wins.away}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">{awayTeamStats.fixtures.wins.total}</td>
            </tr>
            
            {/* Draws */}
            <tr>
              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">Uavgjort</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-green-600 font-medium">{homeTeamStats.fixtures.draws.home}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">{homeTeamStats.fixtures.draws.away}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-green-600 font-medium">{homeTeamStats.fixtures.draws.total}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">{awayTeamStats.fixtures.draws.home}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-red-600 font-medium">{awayTeamStats.fixtures.draws.away}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">{awayTeamStats.fixtures.draws.total}</td>
            </tr>
            
            {/* Losses */}
            <tr className="bg-gray-50">
              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">Tap</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-green-600 font-medium">{homeTeamStats.fixtures.loses.home}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">{homeTeamStats.fixtures.loses.away}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-green-600 font-medium">{homeTeamStats.fixtures.loses.total}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">{awayTeamStats.fixtures.loses.home}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-red-600 font-medium">{awayTeamStats.fixtures.loses.away}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">{awayTeamStats.fixtures.loses.total}</td>
            </tr>
            
            {/* Goals header */}
            <tr>
              <td colSpan={7} className="px-3 py-2 text-sm font-bold text-gray-900 bg-gray-100">MÅL</td>
            </tr>
            
            {/* Goals For */}
            <tr>
              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">Mål For</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-green-600 font-medium">{homeTeamStats.goals.for.total.home}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">{homeTeamStats.goals.for.total.away}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-green-600 font-medium">{homeTeamStats.goals.for.total.total}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">{awayTeamStats.goals.for.total.home}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-red-600 font-medium">{awayTeamStats.goals.for.total.away}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">{awayTeamStats.goals.for.total.total}</td>
            </tr>
            
            {/* Goals Against */}
            <tr className="bg-gray-50">
              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">Mål Mot</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-green-600 font-medium">{homeTeamStats.goals.against.total.home}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">{homeTeamStats.goals.against.total.away}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-green-600 font-medium">{homeTeamStats.goals.against.total.total}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">{awayTeamStats.goals.against.total.home}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-red-600 font-medium">{awayTeamStats.goals.against.total.away}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">{awayTeamStats.goals.against.total.total}</td>
            </tr>
            
            {/* Goals Average header */}
            <tr>
              <td colSpan={7} className="px-3 py-2 text-sm font-bold text-gray-900 bg-gray-100">MÅL GJENNOMSNITT</td>
            </tr>
            
            {/* Goals For Average */}
            <tr>
              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">Mål For</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-green-600 font-medium">{homeTeamStats.goals.for.average.home}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">{homeTeamStats.goals.for.average.away}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-green-600 font-medium">{homeTeamStats.goals.for.average.total}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">{awayTeamStats.goals.for.average.home}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-red-600 font-medium">{awayTeamStats.goals.for.average.away}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">{awayTeamStats.goals.for.average.total}</td>
            </tr>
            
            {/* Goals Against Average */}
            <tr className="bg-gray-50">
              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">Mål Mot</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-green-600 font-medium">{homeTeamStats.goals.against.average.home}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">{homeTeamStats.goals.against.average.away}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-green-600 font-medium">{homeTeamStats.goals.against.average.total}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">{awayTeamStats.goals.against.average.home}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-red-600 font-medium">{awayTeamStats.goals.against.average.away}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">{awayTeamStats.goals.against.average.total}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
} 