"use client"

import { useEffect, useState } from 'react';

interface ApiCall {
  endpoint: string;
  timestamp: string;
  status: string;
  cacheStatus: string;
  params: Record<string, string>;
  duration: number;
  quotaCost?: number;
}

interface ApiEndpoint {
  route: string;
  description: string;
  cacheDuration: string;
  expectedFrequency: string;
  limits?: {
    daily: number;
    perMinute: number;
  };
  params?: Record<string, string>;
}

// Define all your API endpoints here
const MONITORED_ENDPOINTS: ApiEndpoint[] = [
  // Sitemaps
  {
    route: '/api/sitemap-index',
    description: 'Main sitemap index listing all sitemaps',
    cacheDuration: '24 hours',
    expectedFrequency: 'Daily crawler requests',
    limits: {
      daily: 1000,
      perMinute: 10
    }
  },
  {
    route: '/api/sitemap/static',
    description: 'Static pages sitemap',
    cacheDuration: '24 hours',
    expectedFrequency: 'Daily crawler requests',
    limits: {
      daily: 1000,
      perMinute: 10
    }
  },
  {
    route: '/api/sitemap/leagues',
    description: 'Football leagues sitemap',
    cacheDuration: '2 weeks',
    expectedFrequency: 'Weekly crawler requests',
    limits: {
      daily: 1000,
      perMinute: 10
    },
    params: {
      'rapidapi-key': 'API key for football data'
    }
  },
  {
    route: '/api/sitemap/fixtures',
    description: 'Fixtures sitemap generation',
    cacheDuration: '7 days',
    expectedFrequency: 'Once per week per crawler'
  },
  {
    route: '/api/sitemap/leagues',
    description: 'Leagues sitemap generation',
    cacheDuration: '24 hours',
    expectedFrequency: 'Daily'
  },
  {
    route: '/api/sitemap/teams',
    description: 'Teams sitemap generation',
    cacheDuration: '24 hours',
    expectedFrequency: 'Daily'
  },
  {
    route: '/api/youtube/search',
    description: 'YouTube video search for match highlights/previews',
    cacheDuration: '1 hour',
    expectedFrequency: 'On match page load or status change',
    limits: {
      daily: 10000, // YouTube API quota limit
      perMinute: 60
    },
    params: {
      q: 'Search query',
      maxResults: 'Number of results (default: 5)',
      status: 'Match status (LIVE, FT, NS, etc.)'
    }
  },
  {
    route: '/api/football/fixtures/statistics',
    description: 'Match statistics for specific fixtures',
    cacheDuration: '5 minutes for live matches, 1 hour for finished',
    expectedFrequency: 'Every 5 minutes during live matches, on page load for finished',
    limits: {
      daily: 1000,
      perMinute: 30
    },
    params: {
      fixture: 'Fixture ID'
    }
  },
  {
    route: '/api/teams/statistics',
    description: 'Team statistics and performance data',
    cacheDuration: '1 hour',
    expectedFrequency: 'On team page load',
    limits: {
      daily: 1000,
      perMinute: 30
    },
    params: {
      team: 'Team ID',
      league: 'League ID',
      season: 'Season year'
    }
  },
  {
    route: '/api/fixtures',
    description: 'Football match fixtures data',
    cacheDuration: '30 minutes',
    expectedFrequency: 'On page load and periodic updates',
    limits: {
      daily: 1000,
      perMinute: 30
    },
    params: {
      date: 'Match date (YYYY-MM-DD)',
      league: 'League ID',
      season: 'Season year',
      team: 'Team ID (optional)'
    }
  },
  {
    route: '/api/team-seasons',
    description: 'Available seasons for a specific team',
    cacheDuration: '24 hours',
    expectedFrequency: 'On team page load',
    limits: {
      daily: 1000,
      perMinute: 30
    },
    params: {
      team: 'Team ID'
    }
  },
  {
    route: '/api/team-leagues',
    description: 'Leagues that a team participates in',
    cacheDuration: '24 hours',
    expectedFrequency: 'On team page load',
    limits: {
      daily: 1000,
      perMinute: 30
    },
    params: {
      team: 'Team ID'
    }
  },
  {
    route: '/api/leagues',
    description: 'League information and details',
    cacheDuration: '24 hours',
    expectedFrequency: 'On league page load and navigation',
    limits: {
      daily: 1000,
      perMinute: 30
    },
    params: {
      id: 'League ID',
      season: 'Season year (optional)',
      country: 'Country name (optional)'
    }
  },
  {
    route: '/api/sitemap/teams',
    description: 'Football teams sitemap with dynamic team pages',
    cacheDuration: '2 weeks',
    expectedFrequency: 'Weekly crawler requests',
    limits: {
      daily: 1000,
      perMinute: 10
    },
    params: {
      'rapidapi-key': 'API key for football data',
      season: 'Current and previous season'
    }
  },
  {
    route: '/api/sitemap/fixtures',
    description: 'Football matches sitemap with dynamic fixture pages',
    cacheDuration: '1 day',
    expectedFrequency: 'Daily crawler requests',
    limits: {
      daily: 1000,
      perMinute: 10
    },
    params: {
      'rapidapi-key': 'API key for football data',
      date: 'Match date range'
    }
  },
  // Football Calendar and Fixtures
  {
    route: '/api/football/calendar/[date]',
    description: 'Daily football matches calendar',
    cacheDuration: '5 minutes',
    expectedFrequency: 'On calendar page load and periodic updates',
    limits: {
      daily: 1000,
      perMinute: 30
    },
    params: {
      date: 'YYYY-MM-DD'
    }
  },
  {
    route: '/api/football/fixtures/date/[date]',
    description: 'Fixtures for specific date',
    cacheDuration: '5 minutes',
    expectedFrequency: 'On date selection and periodic updates',
    limits: {
      daily: 1000,
      perMinute: 30
    }
  },
  {
    route: '/api/football/fixtures/events',
    description: 'Match events (goals, cards, etc)',
    cacheDuration: '1 minute for live matches',
    expectedFrequency: 'Every minute during live matches',
    limits: {
      daily: 1000,
      perMinute: 60
    },
    params: {
      fixture: 'Fixture ID'
    }
  },
  {
    route: '/api/football/fixtures/lineups',
    description: 'Match lineups and formations',
    cacheDuration: '5 minutes',
    expectedFrequency: 'On match page load',
    limits: {
      daily: 1000,
      perMinute: 30
    },
    params: {
      fixture: 'Fixture ID'
    }
  },
  {
    route: '/api/football/fixtures/live',
    description: 'Currently live matches',
    cacheDuration: '30 seconds',
    expectedFrequency: 'Every 30 seconds',
    limits: {
      daily: 1000,
      perMinute: 60
    }
  },
  
  // Players
  {
    route: '/api/football/norwegian-players',
    description: 'Norwegian players data',
    cacheDuration: '1 hour',
    expectedFrequency: 'On Norwegian players page load',
    limits: {
      daily: 1000,
      perMinute: 30
    }
  },
  {
    route: '/api/football/players/topassists',
    description: 'Top assists in a league',
    cacheDuration: '1 hour',
    expectedFrequency: 'On league stats page load',
    limits: {
      daily: 1000,
      perMinute: 30
    },
    params: {
      league: 'League ID',
      season: 'Season year'
    }
  },
  {
    route: '/api/football/players/topredcards',
    description: 'Most red cards in a league',
    cacheDuration: '1 hour',
    expectedFrequency: 'On league stats page load',
    limits: {
      daily: 1000,
      perMinute: 30
    },
    params: {
      league: 'League ID',
      season: 'Season year'
    }
  },
  {
    route: '/api/football/players/topscorers',
    description: 'Top scorers in a league',
    cacheDuration: '1 hour',
    expectedFrequency: 'On league stats page load',
    limits: {
      daily: 1000,
      perMinute: 30
    },
    params: {
      league: 'League ID',
      season: 'Season year'
    }
  },
  
  // Teams
  {
    route: '/api/football/teams/[leagueId]',
    description: 'Teams in a specific league',
    cacheDuration: '24 hours',
    expectedFrequency: 'On league page load',
    limits: {
      daily: 1000,
      perMinute: 30
    },
    params: {
      leagueId: 'League ID'
    }
  },
  
  // Live Data
  {
    route: '/api/live-fixtures',
    description: 'Currently live football matches',
    cacheDuration: '30 seconds',
    expectedFrequency: 'Every 30 seconds',
    limits: {
      daily: 1000,
      perMinute: 60
    }
  },
  
  // Odds
  {
    route: '/api/odds/live',
    description: 'Live betting odds',
    cacheDuration: '1 minute',
    expectedFrequency: 'Every minute for live matches',
    limits: {
      daily: 1000,
      perMinute: 60
    },
    params: {
      fixture: 'Fixture ID'
    }
  },
  {
    route: '/api/odds',
    description: 'Pre-match betting odds',
    cacheDuration: '1 hour',
    expectedFrequency: 'On match page load',
    limits: {
      daily: 1000,
      perMinute: 30
    },
    params: {
      fixture: 'Fixture ID'
    }
  },
  
  // Search
  {
    route: '/api/search-teams',
    description: 'Team search functionality',
    cacheDuration: '1 hour',
    expectedFrequency: 'On user search',
    limits: {
      daily: 1000,
      perMinute: 30
    },
    params: {
      query: 'Search term'
    }
  },
  
  // Standings
  {
    route: '/api/standings',
    description: 'League standings and tables',
    cacheDuration: '1 hour',
    expectedFrequency: 'On standings page load',
    limits: {
      daily: 1000,
      perMinute: 30
    },
    params: {
      league: 'League ID',
      season: 'Season year'
    }
  }
];

// Add quota tracking specifically for YouTube
interface QuotaUsage {
  daily: number;
  lastReset: string;
}

const YOUTUBE_QUOTA = {
  daily: 0,
  lastReset: new Date().toISOString()
};

// Add API call categorization
interface ApiCallStats {
  total: number;
  cached: number;
  errors: number;
  quotaUsed: number;
}

// Add sitemap specific stats tracking
interface SitemapStats {
  urlCount: number;
  lastGenerated: Date;
  generationTime: number;
}

interface ApiStats {
  [endpoint: string]: {
    last5Minutes: ApiCallStats;
    last1Hour: ApiCallStats;
    last24Hours: ApiCallStats;
    sitemap?: SitemapStats;
  };
}

export default function ApiMonitor() {
  // Check if we're on an excluded page
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const EXCLUDED_PATHS = ['/kontakt', '/about', '/privacy-policy'];
  
  if (EXCLUDED_PATHS.some(path => pathname.startsWith(path))) {
    return null; // Don't render the monitor on excluded pages
  }

  // Initialize state from localStorage if available
  const [apiCalls, setApiCalls] = useState<ApiCall[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('apiMonitorCalls');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [quotaUsage, setQuotaUsage] = useState<QuotaUsage>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('apiMonitorQuota');
      if (saved) {
        const quota = JSON.parse(saved);
        return {
          ...quota,
          lastReset: new Date(quota.lastReset).toISOString()
        };
      }
      return {
        daily: 0,
        lastReset: new Date().toISOString()
      };
    }
    return {
      daily: 0,
      lastReset: new Date().toISOString()
    };
  });

  const [apiStats, setApiStats] = useState<ApiStats>({});
  const [isVisible, setIsVisible] = useState(false);

  // Helper function to clean up old data and limit storage size
  const cleanAndStoreData = (calls: ApiCall[]) => {
    if (typeof window !== 'undefined') {
      try {
        // Keep only last 1000 calls or last 24 hours, whichever is smaller
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentCalls = calls
          .filter(call => new Date(call.timestamp) > twentyFourHoursAgo)
          .slice(-1000); // Keep only last 1000 calls

        // Try to store with minimal data
        const minimalCalls = recentCalls.map(call => ({
          endpoint: call.endpoint,
          timestamp: call.timestamp,
          status: call.status,
          cacheStatus: call.cacheStatus,
          duration: call.duration,
          // Only include non-empty params
          ...(Object.keys(call.params).length > 0 && { params: call.params }),
          ...(call.quotaCost && { quotaCost: call.quotaCost })
        }));

        localStorage.setItem('apiMonitorCalls', JSON.stringify(minimalCalls));
        return minimalCalls;
      } catch (error) {
        // If storage fails, try with even less data
        console.warn('Storage quota exceeded, reducing data size');
        const reducedCalls = calls
          .slice(-500) // Keep only last 500 calls
          .map(call => ({
            endpoint: call.endpoint,
            timestamp: call.timestamp,
            status: call.status,
            cacheStatus: call.cacheStatus,
            duration: call.duration
          }));

        try {
          localStorage.setItem('apiMonitorCalls', JSON.stringify(reducedCalls));
          return reducedCalls;
        } catch (e) {
          console.error('Failed to store even reduced data:', e);
          // Clear storage as last resort
          localStorage.removeItem('apiMonitorCalls');
          return [];
        }
      }
    }
    return calls;
  };

  // Modified useEffect for storing data
  useEffect(() => {
    const cleanedCalls = cleanAndStoreData(apiCalls);
    if (cleanedCalls.length !== apiCalls.length) {
      setApiCalls(cleanedCalls);
    }
  }, [apiCalls]);

  // Modified interceptApiCalls to limit data collection
  useEffect(() => {
    const interceptApiCalls = () => {
      const originalFetch = window.fetch;
      window.fetch = async (url, options) => {
        const startTime = new Date();
        
        try {
          const response = await originalFetch(url, options);
          
          if (typeof url === 'string') {
            const urlObj = new URL(url, window.location.origin);
            const endpoint = MONITORED_ENDPOINTS.find(e => urlObj.pathname.includes(e.route));
            
            if (endpoint) {
              setApiCalls(prevCalls => {
                const newCall: ApiCall = {
                  endpoint: endpoint.route,
                  timestamp: startTime.toISOString(),
                  status: response.status.toString(),
                  cacheStatus: response.headers.get('x-cache') || 'MISS',
                  params: Object.fromEntries(urlObj.searchParams),
                  duration: Date.now() - startTime.getTime()
                };

                // Keep array size manageable
                const updatedCalls = [...prevCalls, newCall].slice(-1000);
                return updatedCalls;
              });
            }
          }
          
          return response;
        } catch (error) {
          // ... error handling ...
          throw error;
        }
      };
    };

    interceptApiCalls();
  }, []);

  // Cleanup interval
  useEffect(() => {
    const cleanup = () => {
      setApiCalls(prevCalls => {
        const cleanedCalls = cleanAndStoreData(prevCalls);
        return cleanedCalls;
      });
    };

    // Run cleanup every 5 minutes
    const intervalId = setInterval(cleanup, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Save to localStorage when data changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('apiMonitorQuota', JSON.stringify(quotaUsage));
    }
  }, [quotaUsage]);

  // Reset quota at midnight
  useEffect(() => {
    const resetQuota = () => {
      const now = new Date();
      const lastResetDate = new Date(quotaUsage.lastReset);
      
      // Reset if it's a new day
      if (now.getDate() !== lastResetDate.getDate() || 
          now.getMonth() !== lastResetDate.getMonth() || 
          now.getFullYear() !== lastResetDate.getFullYear()) {
        setQuotaUsage({
          daily: 0,
          lastReset: now.toISOString()
        });
      }
    };

    // Check for quota reset every minute
    const intervalId = setInterval(resetQuota, 60 * 1000);
    return () => clearInterval(intervalId);
  }, [quotaUsage.lastReset]);

  // Calculate statistics for different time periods
  const calculateStats = (calls: ApiCall[], minutes: number): ApiCallStats => {
    const now = new Date();
    const periodCalls = calls.filter(call => {
      const callDate = new Date(call.timestamp);
      const diffMinutes = (now.getTime() - callDate.getTime()) / (1000 * 60);
      return diffMinutes <= minutes;
    });

    return {
      total: periodCalls.length,
      cached: periodCalls.filter(call => call.cacheStatus === 'HIT').length,
      errors: periodCalls.filter(call => call.status !== '200').length,
      quotaUsed: periodCalls.reduce((acc, call) => acc + (call.quotaCost || 0), 0)
    };
  };

  // Update stats every minute
  useEffect(() => {
    const updateStats = () => {
      const newStats: ApiStats = {};
      
      MONITORED_ENDPOINTS.forEach(endpoint => {
        const endpointCalls = apiCalls.filter(call => call.endpoint === endpoint.route);
        newStats[endpoint.route] = {
          last5Minutes: calculateStats(endpointCalls, 5),
          last1Hour: calculateStats(endpointCalls, 60),
          last24Hours: calculateStats(endpointCalls, 1440)
        };
      });

      setApiStats(newStats);
    };

    updateStats();
    const intervalId = setInterval(updateStats, 60000);
    return () => clearInterval(intervalId);
  }, [apiCalls]);

  // Group API calls by endpoint
  const groupedCalls = apiCalls.reduce((acc, call) => {
    const endpoint = call.endpoint;
    if (!acc[endpoint]) {
      acc[endpoint] = [];
    }
    acc[endpoint].push(call);
    return acc;
  }, {} as Record<string, ApiCall[]>);

  // Calculate total API calls summary
  const calculateTotalStats = () => {
    const totalStats = {
      totalCalls: 0,
      cachedCalls: 0,
      errorCalls: 0,
      mostCalledEndpoint: '',
      maxCalls: 0
    };

    MONITORED_ENDPOINTS.forEach(endpoint => {
      const stats = apiStats[endpoint.route]?.last24Hours;
      if (stats) {
        totalStats.totalCalls += stats.total;
        totalStats.cachedCalls += stats.cached;
        totalStats.errorCalls += stats.errors;

        if (stats.total > totalStats.maxCalls) {
          totalStats.maxCalls = stats.total;
          totalStats.mostCalledEndpoint = endpoint.route;
        }
      }
    });

    return totalStats;
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-500 text-white p-2 rounded-full shadow-lg"
      >
        Show API Monitor
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-xl max-h-[80vh] overflow-auto w-[800px]">
      <div className="flex justify-between mb-4">
        <h2 className="text-lg font-bold">API Monitor</h2>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          Close
        </button>
      </div>

      {/* New Summary Section */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold mb-2">24 Hour Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-3 rounded shadow">
            <div className="text-sm text-gray-600">Total API Calls</div>
            <div className="text-xl font-bold text-blue-600">
              {calculateTotalStats().totalCalls}
            </div>
          </div>
          <div className="bg-white p-3 rounded shadow">
            <div className="text-sm text-gray-600">Cached Responses</div>
            <div className="text-xl font-bold text-green-600">
              {calculateTotalStats().cachedCalls}
              <span className="text-sm font-normal ml-1">
                ({((calculateTotalStats().cachedCalls / calculateTotalStats().totalCalls) * 100 || 0).toFixed(1)}%)
              </span>
            </div>
          </div>
          <div className="bg-white p-3 rounded shadow">
            <div className="text-sm text-gray-600">Errors</div>
            <div className="text-xl font-bold text-red-600">
              {calculateTotalStats().errorCalls}
              <span className="text-sm font-normal ml-1">
                ({((calculateTotalStats().errorCalls / calculateTotalStats().totalCalls) * 100 || 0).toFixed(1)}%)
              </span>
            </div>
          </div>
          <div className="bg-white p-3 rounded shadow">
            <div className="text-sm text-gray-600">Most Called Endpoint</div>
            <div className="text-sm font-bold text-purple-600">
              {calculateTotalStats().mostCalledEndpoint}
              <div className="text-xs font-normal">
                ({calculateTotalStats().maxCalls} calls)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* YouTube Quota Section */}
      <div className="mb-4 p-3 bg-gray-50 rounded">
        <div className="text-sm">
          <div className="text-blue-600 font-semibold">
            YouTube Daily Quota: {quotaUsage.daily}/10000
          </div>
          <div className="text-gray-500">
            Last Reset: {new Date(quotaUsage.lastReset).toLocaleTimeString()}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {MONITORED_ENDPOINTS.map(endpoint => {
          const stats = apiStats[endpoint.route];
          const isSitemap = endpoint.route.includes('sitemap');
          
          return (
            <div key={endpoint.route} className="border p-3 rounded">
              <h3 className="font-semibold">{endpoint.route}</h3>
              <p className="text-sm text-gray-600">{endpoint.description}</p>
              <p className="text-sm">Cache Duration: {endpoint.cacheDuration}</p>
              <p className="text-sm">Expected Frequency: {endpoint.expectedFrequency}</p>
              
              {stats && (
                <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium">Last 5 Minutes</h4>
                    <p>Total: {stats.last5Minutes.total}</p>
                    <p>Cached: {stats.last5Minutes.cached}</p>
                    <p>Errors: {stats.last5Minutes.errors}</p>
                  </div>
                  <div>
                    <h4 className="font-medium">Last Hour</h4>
                    <p>Total: {stats.last1Hour.total}</p>
                    <p>Cached: {stats.last1Hour.cached}</p>
                    <p>Errors: {stats.last1Hour.errors}</p>
                  </div>
                  <div>
                    <h4 className="font-medium">Last 24 Hours</h4>
                    <p>Total: {stats.last24Hours.total}</p>
                    <p>Cached: {stats.last24Hours.cached}</p>
                    <p>Errors: {stats.last24Hours.errors}</p>
                  </div>
                </div>
              )}
              
              {isSitemap && stats?.sitemap && (
                <div className="mt-2 text-sm bg-gray-50 p-2 rounded">
                  <h4 className="font-medium">Sitemap Stats</h4>
                  <p>URLs: {stats.sitemap.urlCount}</p>
                  <p>Last Generated: {stats.sitemap.lastGenerated.toLocaleString()}</p>
                  <p>Generation Time: {stats.sitemap.generationTime}ms</p>
                </div>
              )}
              
              {endpoint.limits && (
                <div className="mt-2 text-sm text-orange-600">
                  Limits: {endpoint.limits.perMinute}/min, {endpoint.limits.daily}/day
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 