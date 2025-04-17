'use client';

import { useState, useEffect } from 'react';

interface LiveMatchTimerProps {
  /** The short status code from Supabase (e.g., "1H", "HT", "2H", "FT") */
  matchStatusShort: string | null | undefined;
  /** The scheduled start date/time string of the match */
  matchStartDate: string; // Use the scheduled start date string
}

// Helper to format seconds into MM:SS
const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  // Ensure time doesn't go below 00:00
  if (minutes < 0 || seconds < 0) {
    return '00:00';
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Estimate halftime duration in milliseconds
const ESTIMATED_HALFTIME_MS = 15 * 60 * 1000;

export default function LiveMatchTimer({
  matchStatusShort,
  matchStartDate,
}: LiveMatchTimerProps) {
  const [displayValue, setDisplayValue] = useState<number | string | null>(null); // Start as null

  useEffect(() => {
    const isLiveCountingStatus = ['1H', '2H', 'ET'].includes(matchStatusShort || '');
    const isHalftime = matchStatusShort === 'HT';

    if (!isLiveCountingStatus && !isHalftime) {
      // If match is not live or HT (e.g., FT, NS), clear display or show final time?
      // For now, let's clear it if not live. You might want different logic for FT.
       setDisplayValue(null); // Or potentially show 'FT' or final score time if needed
      return () => {}; // Return empty cleanup function
    }

    if (isHalftime) {
      setDisplayValue('HT');
      return () => {}; // No interval needed for HT
    }

    // --- Timer Logic based on matchStartDate ---
    let startDateMs: number;
    try {
      startDateMs = new Date(matchStartDate).getTime();
      if (isNaN(startDateMs)) {
        throw new Error("Invalid date");
      }
    } catch (e) {
      console.error("Error parsing matchStartDate:", e);
      setDisplayValue("Error"); // Show error if date is invalid
      return () => {};
    }

    const calculateElapsedTime = () => {
      const nowMs = Date.now();
      let elapsedMs = nowMs - startDateMs;

      // If match hasn't started yet according to clock, show 00:00
      if (elapsedMs < 0) {
        setDisplayValue(0); // Representing 0 seconds
        return;
      }

      // Subtract estimated halftime if in 2nd half or beyond
      if (['2H', 'ET', 'P'].includes(matchStatusShort || '')) {
         // Only subtract if elapsed time is greater than 45 mins + halftime
         // This prevents subtracting halftime during the actual halftime break if status is slow
         const firstHalfEndEstimate = 45 * 60 * 1000; // 45 mins in ms
         if (elapsedMs > firstHalfEndEstimate) {
            // More robust: Check if *actual* time is past estimated start + 45min + 15min break
             const secondHalfStartEstimate = startDateMs + firstHalfEndEstimate + ESTIMATED_HALFTIME_MS;
             if (nowMs >= secondHalfStartEstimate) {
                 elapsedMs -= ESTIMATED_HALFTIME_MS;
             }
             // Simpler subtraction (might subtract too early if status lags):
             // elapsedMs -= ESTIMATED_HALFTIME_MS;
         }
      }

      // Convert final elapsed milliseconds to total seconds
      const currentTotalSeconds = Math.floor(elapsedMs / 1000);

      // Optional: Add caps (e.g., stop at 45:00 or 90:00 visually?)
      // This logic might conflict with showing continuous time.
      // if (matchStatusShort === '1H' && currentTotalSeconds > 45 * 60) {
      //    currentTotalSeconds = 45 * 60;
      // } else if (matchStatusShort === '2H' && currentTotalSeconds > 90 * 60) {
      //    currentTotalSeconds = 90 * 60;
      // }

      setDisplayValue(currentTotalSeconds);
    };

    // Calculate immediately on mount
    calculateElapsedTime();

    // Update every second
    const intervalId = setInterval(calculateElapsedTime, 1000);

    return () => clearInterval(intervalId);

  }, [matchStatusShort, matchStartDate]); // Dependencies

  // Determine what to render
  let renderTime: string | null = null;
  if (typeof displayValue === 'number') {
    renderTime = formatTime(displayValue);
  } else if (displayValue === 'HT') {
    renderTime = 'HT';
  } else if (displayValue === 'Error') {
      renderTime = 'Error'; // Or handle error display differently
  }


  // Only render if there's something to show (live or HT)
  // Note: displayValue could be 0 (seconds) which is falsy, so check explicitly
   const showTimer = renderTime !== null;
  if (!showTimer) {
      return null;
  }


  return (
    <span style={{ color: '#00985f' }} className="text-base font-medium whitespace-nowrap">
      {renderTime}
    </span>
  );
}