"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';

interface Fixture {
  fixture: {
    id: number;
    date: string;
    status: {
      short: string;
      long: string;
      elapsed?: number;
    };
  };
  league: {
    id: number;
    name: string;
    logo?: string;
  };
  teams: {
    home: { id: number; name: string; logo?: string };
    away: { id: number; name: string; logo?: string };
  };
  goals: {
    home?: number;
    away?: number;
  };
}

interface UpcomingMatchesClientProps {
  initialFixtures: Fixture[];
  teamId: number;
}

export default function UpcomingMatchesClient({ initialFixtures, teamId }: UpcomingMatchesClientProps) {
  const [liveFixturesData, setLiveFixturesData] = useState<Record<number, Fixture>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLiveMatches = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/football/live');
        if (!response.ok) {
          throw new Error('Failed to fetch live matches');
        }
        const data = await response.json();
        const liveDataMap: Record<number, Fixture> = {};
        if (data.live && Array.isArray(data.live)) {
          data.live.forEach((fixture: Fixture) => {
            liveDataMap[fixture.fixture.id] = fixture;
          });
        }
        setLiveFixturesData(liveDataMap);
      } catch (error) {
        console.error("Error fetching live matches:", error);
        // Keep existing state or handle error appropriately
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiveMatches();
    // Optional: Set an interval to refetch live data periodically
    // const intervalId = setInterval(fetchLiveMatches, 60000); // Fetch every 60 seconds
    // return () => clearInterval(intervalId); // Cleanup interval on unmount
  }, []); // Fetch only on component mount (or add interval)

  // Use initialFixtures as the base list
  const fixturesToRender = initialFixtures;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Kommende kamper</h2>
      {isLoading && fixturesToRender.length > 0 && (
         <div className="text-center text-gray-500 py-4">Laster live status...</div>
      )}
      {!isLoading && fixturesToRender.length === 0 && (
         <div className="text-center text-gray-500 py-4">Ingen kommende kamper funnet.</div>
      )}
      {fixturesToRender.length > 0 && (
        <div className="space-y-4">
          {fixturesToRender.map((fixture) => {
            const isLive = liveFixturesData.hasOwnProperty(fixture.fixture.id);
            const liveData = isLive ? liveFixturesData[fixture.fixture.id] : null;
            const matchDate = parseISO(fixture.fixture.date);

            return (
              <div
                key={fixture.fixture.id}
                className="block hover:bg-gray-50 transition rounded-md border border-gray-200 overflow-hidden bg-white relative"
              >
                {/* Date Badge */}
                <div className="absolute top-0 left-0 bg-gray-100 px-3 py-1 text-xs text-gray-600 rounded-br">
                  {format(matchDate, 'd. MMMM yyyy', { locale: nb })}
                  {!isLive && ` - ${format(matchDate, 'HH:mm', { locale: nb })}`}
                </div>

                {/* Match Content */}
                <Link
                  href={`/fotball/kamp/${fixture.fixture.id}`}
                  className="block p-4 pt-8" // Added pt-8 for space below badge
                >
                  <div className="flex items-center justify-between">
                    {/* Home Team */}
                    <div className="flex items-center space-x-3 w-2/5">
                      <div className="relative h-8 w-8 flex-shrink-0">
                        <Image
                          src={fixture.teams.home.logo || '/images/team-placeholder.png'}
                          alt={fixture.teams.home.name}
                          fill
                          className="object-contain"
                        />
                      </div>
                      <span className={`font-medium truncate ${fixture.teams.home.id === teamId ? 'font-bold' : ''}`}>
                        {fixture.teams.home.name}
                      </span>
                    </div>

                    {/* Center: Score/Time/Live Indicator */}
                    <div className="text-center w-1/5 flex-shrink-0">
                      {isLive && liveData ? (
                        <>
                          <div className="font-bold text-lg text-red-600">
                            {liveData.goals.home ?? '?'} - {liveData.goals.away ?? '?'}
                          </div>
                          <div className="text-xs text-red-500 animate-pulse mt-0.5">
                            LIVE {liveData.fixture.status.elapsed ? `(${liveData.fixture.status.elapsed}')` : ''}
                          </div>
                        </>
                      ) : (
                        <div className="font-bold">
                          {format(matchDate, 'HH:mm', { locale: nb })}
                        </div>
                      )}
                      {fixture.league && (
                        <div className="text-xs text-gray-500 mt-1 truncate px-1">
                          {fixture.league.name}
                        </div>
                      )}
                    </div>

                    {/* Away Team */}
                    <div className="flex items-center justify-end space-x-3 w-2/5">
                      <span className={`font-medium text-right truncate ${fixture.teams.away.id === teamId ? 'font-bold' : ''}`}>
                        {fixture.teams.away.name}
                      </span>
                      <div className="relative h-8 w-8 flex-shrink-0">
                        <Image
                          src={fixture.teams.away.logo || '/images/team-placeholder.png'}
                          alt={fixture.teams.away.name}
                          fill
                          className="object-contain"
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 