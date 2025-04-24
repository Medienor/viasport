'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// Interface for the status object within the fixture data
interface MatchStatus {
  long: string | null;
  short: string | null;
  elapsed: number | null;
  extra: number | null;
}

interface LiveMatchTimerProps {
  /** The Supabase fixture ID */
  matchId: number;
  /** Initial status object */
  initialStatus: MatchStatus | null;
  /** Initial timestamp string (ISO format preferred) of the last update */
  initialLastUpdatedAt: string | null; // e.g., "2023-10-27T10:30:00.123Z"
}

// Helper to format seconds into MM:SS
const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  // Ensure time doesn't go below 00:00 or above reasonable limits (e.g., 120+)
  if (minutes < 0 || seconds < 0) return '00:00';
  // Cap display if needed, though calculation continues
  // if (minutes > 120) return '120:00+';
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export default function LiveMatchTimer({
  matchId,
  initialStatus,
  initialLastUpdatedAt,
}: LiveMatchTimerProps) {
  // State to hold the authoritative data from Supabase
  const [status, setStatus] = useState<MatchStatus | null>(initialStatus);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(() => {
    try {
      return initialLastUpdatedAt ? new Date(initialLastUpdatedAt).getTime() : null;
    } catch {
      return null;
    }
  });

  // State for the calculated display value (seconds or string like 'HT')
  const [displaySeconds, setDisplaySeconds] = useState<number | string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs for Supabase client, channel, and interval
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- Initialize Supabase Client (only once) ---
  useEffect(() => {
    if (!supabaseRef.current) {
        // Ensure environment variables are handled correctly in client components
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseAnonKey) {
             supabaseRef.current = createClient(supabaseUrl, supabaseAnonKey);
             console.log("DEBUG: [LiveTimer] Supabase client initialized.");
        } else {
            console.error("🔴 ERROR: Supabase URL or Anon Key is missing in environment variables.");
            setError("Configuration error.");
        }
    }
  }, []);


  // --- Effect for Realtime Subscription ---
  useEffect(() => {
    if (!matchId || !supabaseRef.current || channelRef.current) {
        if (channelRef.current) console.log("DEBUG: [LiveTimer] Subscription already active.");
        else if (!supabaseRef.current) console.log("DEBUG: [LiveTimer] Supabase client not ready for subscription.");
        else console.log("DEBUG: [LiveTimer] Match ID missing, cannot subscribe.");
      return; // Don't subscribe if no ID, client not ready, or already subscribed
    }

    const supabase = supabaseRef.current;
    console.log(`DEBUG: [LiveTimer] Setting up subscription for fixture ${matchId}`);
    const channel = supabase.channel(`fixture-timer-${matchId}`); // Unique channel name
    channelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'fixtures',
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          console.log('DEBUG: [LiveTimer] Realtime UPDATE received:', payload);
          if (payload.new) {
            const newStatus = payload.new.status as MatchStatus | null;
            const newLastUpdated = payload.new.details_last_updated_at as string | null;

            // Validate received data
            if (newStatus && typeof newStatus.elapsed === 'number' && newLastUpdated) {
                 console.log(`DEBUG: [LiveTimer] Updating state: elapsed=${newStatus.elapsed}, lastUpdated=${newLastUpdated}`);
                 setStatus(newStatus);
                 try {
                    const newTimestamp = new Date(newLastUpdated).getTime();
                    if (!isNaN(newTimestamp)) {
                        setLastUpdatedAt(newTimestamp);
                        setError(null); // Clear previous errors on successful update
                    } else {
                         console.warn("DEBUG: [LiveTimer] Received invalid date format for last update:", newLastUpdated);
                         setError("Invalid update time");
                    }
                 } catch (e) {
                     console.error("DEBUG: [LiveTimer] Error parsing last update date:", e);
                     setError("Date parse error");
                 }

            } else {
                 console.warn("DEBUG: [LiveTimer] Realtime payload missing required fields (status.elapsed or details_last_updated_at). Payload:", payload.new);
                 // Optionally set an error state here if needed
                 // setError("Incomplete update data");
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ [LiveTimer] Subscribed successfully to fixture ${matchId}`);
          setError(null); // Clear error on successful subscription
        } else if (status === 'TIMED_OUT') {
          console.warn(`🟠 [LiveTimer] Subscription timed out for fixture ${matchId}`);
          setError("Connection timeout");
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`🔴 [LiveTimer] Channel error for fixture ${matchId}:`, err);
          setError(`Connection error: ${err?.message || 'Unknown'}`);
        } else {
            console.log(`ℹ️ [LiveTimer] Channel status [fixture-${matchId}]: ${status}`);
        }
      });

    // Cleanup function
    return () => {
      if (channelRef.current) {
        console.log(`DEBUG: [LiveTimer] Unsubscribing from fixture ${matchId}`);
        supabaseRef.current?.removeChannel(channelRef.current)
          .then(status => console.log(`DEBUG: [LiveTimer] Unsubscribe status: ${status}`))
          .catch(error => console.error("🔴 [LiveTimer] Error during unsubscribe:", error));
        channelRef.current = null;
      }
    };
  }, [matchId]); // Run only when matchId changes (or on initial mount after client is ready)


  // --- Effect for Calculating Display Time ---
  useEffect(() => {
    // Clear previous interval if dependencies change
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const currentStatusShort = status?.short;
    const officialElapsedMins = status?.elapsed;
    const lastUpdateTimestamp = lastUpdatedAt;

    // Conditions where the timer should run
    const isLiveCountingStatus = ['1H', '2H', 'ET'].includes(currentStatusShort || '');

    if (isLiveCountingStatus && typeof officialElapsedMins === 'number' && lastUpdateTimestamp) {
      // Timer should be running
      const calculateAndSetDisplay = () => {
        const nowMs = Date.now();
        const msSinceLastUpdate = Math.max(0, nowMs - lastUpdateTimestamp); // Ensure non-negative
        const secondsSinceLastUpdate = Math.floor(msSinceLastUpdate / 1000);

        const officialElapsedSeconds = officialElapsedMins * 60;
        const currentTotalSeconds = officialElapsedSeconds + secondsSinceLastUpdate;

        // --- Optional: Visual Caps based on status ---
        // let cappedDisplaySeconds = currentTotalSeconds;
        // const extraTime = status?.extra ?? 0;
        // if (currentStatusShort === '1H' && currentTotalSeconds > (45 + extraTime) * 60) {
        //     cappedDisplaySeconds = (45 + extraTime) * 60; // Stop visually at 45 + extra
        // } else if (currentStatusShort === '2H' && currentTotalSeconds > (90 + extraTime) * 60) {
        //     cappedDisplaySeconds = (90 + extraTime) * 60; // Stop visually at 90 + extra
        // } // Add ET logic if needed

        // setDisplaySeconds(cappedDisplaySeconds); // Use capped value for display
         setDisplaySeconds(currentTotalSeconds); // Use raw calculated value
      };

      calculateAndSetDisplay(); // Run immediately
      intervalRef.current = setInterval(calculateAndSetDisplay, 1000); // Update every second

    } else if (currentStatusShort === 'HT') {
      setDisplaySeconds('HT');
    } else if (['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'AWD', 'WO'].includes(currentStatusShort || '')) {
      // Match finished or interrupted - show final official time or status
       if (typeof officialElapsedMins === 'number') {
           setDisplaySeconds(officialElapsedMins * 60); // Show final official seconds
       } else {
           setDisplaySeconds(currentStatusShort); // Fallback to showing status code
       }
    } else if (currentStatusShort === 'NS') {
        setDisplaySeconds(0); // Not Started, show 00:00
    } else {
      // Loading, error, or unknown state
      // Keep existing displaySeconds or set to null/loading indicator
       if (!initialStatus && !error) { // Only show loading initially if no data provided
           setDisplaySeconds('...'); // Loading indicator
       } else if (error) {
           setDisplaySeconds('Error');
       } else if (status && typeof officialElapsedMins !== 'number') {
           // We have status but no elapsed time? Show status code.
           setDisplaySeconds(currentStatusShort);
       }
       // else: Keep the last valid displaySeconds if status becomes temporarily null
    }

    // Cleanup interval on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status, lastUpdatedAt, error]); // Recalculate when status or last update time changes, or error occurs


  // --- Rendering Logic ---
  let renderTime: string | null = null;
  let extraTimeDisplay: string | null = null;

  if (typeof displaySeconds === 'number') {
    renderTime = formatTime(displaySeconds);
    const extraTimeValue = status?.extra ?? 0;

    // Display extra time indicator based on official elapsed time and status
    const officialElapsedMins = status?.elapsed ?? 0; // Use official elapsed for "+X" logic

    if (extraTimeValue > 0) {
        if (status?.short === '1H' && officialElapsedMins >= 45) {
             extraTimeDisplay = `+${extraTimeValue}`;
        } else if (status?.short === '2H' && officialElapsedMins >= 90) {
             extraTimeDisplay = `+${extraTimeValue}`;
        } else if (status?.short === 'ET') {
             // Basic ET extra time - assumes it applies after 90 or 105? API might not specify which half.
             // Let's assume it applies if official time is >= 90 for simplicity here.
             if (officialElapsedMins >= 90) { // Adjust if API provides more detail for ET halves
                 extraTimeDisplay = `+${extraTimeValue}`;
             }
        }
    }
  } else if (typeof displaySeconds === 'string') {
    renderTime = displaySeconds; // Handles 'HT', 'FT', 'Error', '...' etc.
  }

  // Don't render anything if time is null (e.g., initial state before first calculation)
  if (renderTime === null) {
    return null;
  }

  return (
    <span style={{ color: '#00985f' }} className="text-base font-medium whitespace-nowrap">
      {renderTime}
      {extraTimeDisplay && <span className="ml-1 opacity-80">{extraTimeDisplay}</span>}
    </span>
  );
}