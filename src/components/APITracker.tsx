'use client';

import { useAPITracking } from '@/lib/stores/apiTracking';
import { useEffect, useState } from 'react';

export default function APITracker() {
  const { totalRequests, requestsByEndpoint, resetTracking } = useAPITracking();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    setIsDev(process.env.NODE_ENV === 'development');
  }, []);

  if (!isDev) return null;

  return (
    <div className="fixed right-4 bottom-4 z-50">
      <div className="bg-gray-800 text-white p-4 rounded-lg shadow-lg max-w-sm">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold">API Requests Tracker</h3>
          <div className="space-x-2">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs bg-gray-700 px-2 py-1 rounded"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
            <button 
              onClick={resetTracking}
              className="text-xs bg-red-600 px-2 py-1 rounded"
            >
              Reset
            </button>
          </div>
        </div>
        
        <div className="text-sm">
          <p>Total Requests: {totalRequests}</p>
          
          {isExpanded && Object.entries(requestsByEndpoint).length > 0 && (
            <div className="mt-2">
              <p className="font-semibold mb-1">By Endpoint:</p>
              <div className="max-h-60 overflow-y-auto">
                {Object.entries(requestsByEndpoint)
                  .sort(([, a], [, b]) => b - a)
                  .map(([endpoint, count]) => (
                    <div key={endpoint} className="flex justify-between text-xs py-1">
                      <span className="truncate mr-2">{endpoint}</span>
                      <span>{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 