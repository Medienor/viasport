'use client';

import { useState, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';

// Re-use or import interfaces and helper functions if needed
interface Status {
  long?: string | null;
  short?: string | null;
  elapsed?: number | null; // Minutes elapsed (official)
  extra?: number | null;
}

interface Score {
  halftime?: { home: number | null; away: number | null };
  fulltime?: { home: number | null; away: number | null };
  extratime?: { home: number | null; away: number | null };
  penalty?: { home: number | null; away: number | null };
}

interface Goals {
    home?: number | null;
    away?: number | null;
}

interface Fixture {
  id: number;
  date: string;
  status: Status | null;
  score?: Score | null;
  goals?: Goals | null;
  details_last_updated_at: string | null;
}

interface FixtureStatusDisplayProps {
  fixture: Fixture;
}

// Helper functions (can be imported from a shared utils file)
const isMatchLive = (statusShort: string | null | undefined): boolean =>
    ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'].includes(statusShort || '');
const isMatchFinished = (statusShort: string | null | undefined): boolean =>
    ['FT', 'AET', 'PEN'].includes(statusShort || '');
const isMatchUpcoming = (statusShort: string | null | undefined): boolean => statusShort === 'NS';

// Helper to format seconds into MM:SS
const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 0 || seconds < 0) return '00:00';
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};


const FixtureStatusDisplay: React.FC<FixtureStatusDisplayProps> = ({ fixture }) => {
  const { status, date, score, goals, details_last_updated_at } = fixture;
  const statusShort = status?.short;

  // State for the calculated display value (seconds or string like 'HT', 'FT', '14:30')
  const [displayValue, setDisplayValue] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear previous interval if dependencies change
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const live = isMatchLive(statusShort);
    const finished = isMatchFinished(statusShort);
    const upcoming = isMatchUpcoming(statusShort);
    const officialElapsedMins = status?.elapsed;
    const lastUpdateTimestamp = details_last_updated_at ? new Date(details_last_updated_at).getTime() : null;

    if (live && typeof officialElapsedMins === 'number' && lastUpdateTimestamp) {
      // --- Live Timer Logic ---
      const calculateAndSetDisplay = () => {
        const nowMs = Date.now();
        const msSinceLastUpdate = Math.max(0, nowMs - lastUpdateTimestamp);
        const secondsSinceLastUpdate = Math.floor(msSinceLastUpdate / 1000);
        const officialElapsedSeconds = officialElapsedMins * 60;
        const currentTotalSeconds = officialElapsedSeconds + secondsSinceLastUpdate;

        let renderTime: string;
        if (statusShort === 'HT') {
            renderTime = 'HT'; // Show HT during halftime
        } else {
            renderTime = formatTime(currentTotalSeconds);
        }

        // Add extra time indicator if applicable
        const extraTimeValue = status?.extra ?? 0;
        let extraTimeDisplay: string | null = null;
        if (extraTimeValue > 0) {
            if (statusShort === '1H' && officialElapsedMins >= 45) extraTimeDisplay = `+${extraTimeValue}`;
            else if (statusShort === '2H' && officialElapsedMins >= 90) extraTimeDisplay = `+${extraTimeValue}`;
            else if (statusShort === 'ET' && officialElapsedMins >= 90) extraTimeDisplay = `+${extraTimeValue}`; // Basic ET assumption
        }

        setDisplayValue(renderTime + (extraTimeDisplay ? ` ${extraTimeDisplay}` : ''));
      };

      calculateAndSetDisplay(); // Run immediately
      intervalRef.current = setInterval(calculateAndSetDisplay, 1000); // Update every second

    } else if (finished) {
      // --- Finished Match: Show Score ---
      const homeScore = score?.fulltime?.home ?? goals?.home ?? 0;
      const awayScore = score?.fulltime?.away ?? goals?.away ?? 0;
      let statusSuffix = '';
      if (statusShort === 'AET') statusSuffix = ' (e.e.o.)';
      if (statusShort === 'PEN') statusSuffix = ' (str.)';
      setDisplayValue(`${homeScore} - ${awayScore}${statusSuffix}`);

    } else if (upcoming) {
      // --- Upcoming Match: Show Time ---
      try {
        setDisplayValue(format(parseISO(date), "HH:mm", { locale: nb }));
      } catch {
        setDisplayValue('TBD'); // Fallback if date is invalid
      }
    } else {
      // --- Other Statuses: Show Short Code ---
      // Handle TBD, PST, CANC, ABD, AWD, WO etc.
      setDisplayValue(statusShort || 'Ukjent'); // Show the code or a fallback
    }

    // Cleanup interval on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status, date, score, goals, details_last_updated_at, statusShort]); // Dependencies

  // Determine text color based on status
  const textColor = isMatchLive(statusShort) ? 'text-green-600 font-bold' : isMatchFinished(statusShort) ? 'text-gray-900 font-bold' : 'text-gray-700';

  if (displayValue === null) {
    return <span className="text-sm text-gray-400">...</span>; // Loading or initial state
  }

  // Render the display value
  return (
    <span className={`text-lg ${textColor}`}>
      {displayValue}
    </span>
  );
};

export default FixtureStatusDisplay; 