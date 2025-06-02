'use client'; // <<< Make it a Client Component

import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import Image from 'next/image';
import Link from 'next/link';
// We NEED createClient here to make requests from the browser for LIVE data
import { createClient, PostgrestError, RealtimeChannel } from '@supabase/supabase-js';
import CountUp from 'react-countup'; // Import CountUp

// --- Interfaces ---
// Interface for the data this component receives
interface TopScorerData {
  player_id: number;
  player_name: string | null;
  player_photo: string | null;
  team_logo: string | null;
  goals_total: number | null; // Allow null from server fetch
  appearances: number | null;
  minutes: number | null;
  assists: number | null;
  tackles: number | null;
  penalties_scored: number | null;
  average_rating?: number | null;
}

// Props interface for this Client Component
interface TopScorersDisplayProps {
  homeTopScorer: TopScorerData | null;
  awayTopScorer: TopScorerData | null;
  leagueName?: string;
  leagueId?: number;
  season: number;
  initialFixtureStatusShort: string | null | undefined;
  isFinished: boolean; // Keep isFinished if used elsewhere, but margin depends on initialStatusShort
}

// --- Helper Functions (can stay here or be moved to utils) ---
function createPlayerSlug(name: string | null, id: number): string {
  const baseName = name || 'ukjent-spiller';
  const slugPart = baseName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `/spillerprofil/${slugPart || 'spiller'}-${id}`;
}

const LIVE_STATUS_CODES = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'];
function isFixtureLive(statusShort: string | null | undefined): boolean {
    return !!statusShort && LIVE_STATUS_CODES.includes(statusShort);
}

// --- Main Client Component ---
export default function TopScorersDisplay({
  // Destructure props received from the Server Component
  homeTopScorer,
  awayTopScorer,
  leagueName,
  leagueId,
  season,
  initialFixtureStatusShort,
  isFinished, // Use this prop for margin calculation
  matchId, // <-- IMPORTANT: You'll likely need to pass the matchId here
  homeTeamId,
  awayTeamId
}: TopScorersDisplayProps & { matchId: number; homeTeamId: number; awayTeamId: number }) {

  console.log("DEBUG: [TopScorersDisplay Client] Rendering. isFinished:", isFinished, "Status:", initialFixtureStatusShort);

  // State for the toggle switch
  const [showLiveStats, setShowLiveStats] = useState(false);
  const [liveHomeStats, setLiveHomeStats] = useState<TopScorerData | null>(null);
  const [liveAwayStats, setLiveAwayStats] = useState<TopScorerData | null>(null);
  const [isLoadingLiveStats, setIsLoadingLiveStats] = useState(false);
  const [liveStatsError, setLiveStatsError] = useState<string | null>(null);

  // Refs for previous stat values (optional but can help CountUp)
  const prevHomeStatsRef = useRef<TopScorerData | null>(null);
  const prevAwayStatsRef = useRef<TopScorerData | null>(null);

  // Store the Supabase client instance and channel to manage them correctly
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Calculate Conditional Margin based on isFinished
  const containerMarginClass = isFinished ? 'my-4' : 'mb-4';
  console.log(`DEBUG: [TopScorersDisplay Client] isFinished is ${isFinished}, applying margin class: '${containerMarginClass}'`);

  // Determine if the toggle should be visible based on the prop
  const canShowToggle = isFixtureLive(initialFixtureStatusShort);
  console.log(`DEBUG: [TopScorersDisplay Client] Received status: '${initialFixtureStatusShort}'. Toggle will be ${canShowToggle ? 'shown' : 'hidden'}.`);

  // --- Helper function to process team stats ---
  const processTeam = (teamStats: TeamStats | undefined, teamId: number, teamType: 'home' | 'away'): TopScorerData | null => {
      if (!teamStats || !teamStats.players || teamStats.players.length === 0) {
          console.log(`DEBUG: [processTeam - ${teamType}] No team stats or players found for team ID ${teamId}.`);
          return null;
      }
      console.log(`DEBUG: [processTeam - ${teamType}] Processing ${teamStats.players.length} players for team ID ${teamId}.`);

      let bestPlayer: TopScorerData | null = null;
      let highestScore = -1; // Use -1 to handle 0 goals/rating correctly

      teamStats.players.forEach(playerStat => {
          if (!playerStat.player || !playerStat.statistics || playerStat.statistics.length === 0) {
              // console.log(`DEBUG: [processTeam - ${teamType}] Skipping player with missing data.`);
              return; // Skip player if essential data is missing
          }

          const stats = playerStat.statistics[0]; // Assuming the first entry has the relevant match stats
          const ratingStr = stats.games?.rating;
          const rating = ratingStr ? parseFloat(ratingStr) : null;
          const goals = stats.goals?.total ?? 0; // Default to 0 if null/undefined

          // Prioritize rating, then goals
          let currentScore = -1;
          if (rating !== null && rating > 0) {
              currentScore = rating * 10; // Weight rating higher
          } else if (goals > 0) {
              currentScore = goals; // Use goals as fallback score
          }

          // console.log(`DEBUG: [processTeam - ${teamType}] Player ${playerStat.player.id}: Rating=${rating}, Goals=${goals}, Score=${currentScore}`);


          if (currentScore > highestScore) {
              highestScore = currentScore;
              bestPlayer = {
                  player_id: playerStat.player.id,
                  player_name: playerStat.player.name,
                  player_photo: playerStat.player.photo,
                  team_logo: teamStats.team.logo, // Use team logo from the live data team object
                  goals_total: stats.goals?.total ?? null,
                  appearances: stats.games?.appearences ?? 1, // Assume 1 appearance if not specified
                  minutes: stats.games?.minutes ?? null,
                  assists: stats.goals?.assists ?? null,
                  // Add other stats if available in live data and needed
                  tackles: null, // Placeholder - add if available
                  penalties_scored: null, // Placeholder - add if available
                  average_rating: rating, // Use the parsed rating
              };
              // console.log(`DEBUG: [processTeam - ${teamType}] New best player found: ID ${bestPlayer.player_id} with score ${highestScore}`);
          }
      });

       if (!bestPlayer) {
           console.log(`DEBUG: [processTeam - ${teamType}] No player met the criteria (rating > 0 or goals > 0) for team ID ${teamId}.`);
       } else {
           console.log(`DEBUG: [processTeam - ${teamType}] Final best player for team ID ${teamId}: ${bestPlayer.player_name} (ID: ${bestPlayer.player_id})`);
       }

      return bestPlayer;
  };

  // useEffect for fetching live data AND subscribing to realtime updates
  useEffect(() => {
    const minLoadingTime = 1000;
    let loadingTimeoutId: NodeJS.Timeout | null = null;
    const startTime = Date.now();

    const handleLoadingEnd = () => {
      const elapsedTime = Date.now() - startTime;
      const remainingDelay = Math.max(0, minLoadingTime - elapsedTime);
      if (loadingTimeoutId) clearTimeout(loadingTimeoutId); // Clear previous timeout if exists
      loadingTimeoutId = setTimeout(() => {
        setIsLoadingLiveStats(false);
      }, remainingDelay);
    };

    // Function to initialize Supabase client if not already done
    const initializeSupabase = () => {
        if (supabaseRef.current) return supabaseRef.current;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            console.error("🔴 ERROR: Supabase URL or Public Anon Key is missing.");
            setLiveStatsError("Configuration error: Missing Supabase URL or Key.");
            setIsLoadingLiveStats(false); // Stop loading on config error
            return null;
        }

        supabaseRef.current = createClient(supabaseUrl, supabaseAnonKey, {
            global: { fetch: fetch as any }
        });
        return supabaseRef.current;
    }

    // Function to process updated statistics payload
    const processUpdate = (payload: any, source: 'fetch' | 'realtime') => {
        console.log(`DEBUG: [Display - processUpdate from ${source}] Received Payload:`, payload);
        let statsData: LiveStatsData | null = null;

        if (source === 'fetch') {
            // Initial fetch payload structure (data is the fixture row)
             if (!payload || !payload.player_statistics || !Array.isArray(payload.player_statistics)) {
                console.warn(`[${source}] No player statistics found or in unexpected format for match ${matchId}. Data:`, payload);
                setLiveStatsError("Live player statistics not available for this match yet.");
                return; // Don't clear existing stats if fetch fails after initial load
            }
            statsData = payload.player_statistics as LiveStatsData;
            console.log(`DEBUG: [Display - processUpdate from ${source}] Extracted statsData:`, statsData);
        } else if (source === 'realtime') {
            // Realtime payload structure (check Supabase docs for exact structure)
            // Assuming payload.new contains the updated row, and we need player_statistics from it
            if (!payload.new || !payload.new.player_statistics || !Array.isArray(payload.new.player_statistics)) {
                 console.warn(`[${source}] Realtime update missing player_statistics in payload.new for match ${matchId}. Payload:`, payload);
                 // Decide how to handle: maybe ignore, maybe show error?
                 // For now, we'll ignore this specific update.
                 return;
            }
            statsData = payload.new.player_statistics as LiveStatsData;
            console.log(`DEBUG: [Display - processUpdate from ${source}] Extracted statsData from payload.new:`, statsData);
        }

        if (!statsData) {
            console.warn(`[${source}] Could not extract valid statsData.`);
            // Optionally set an error or just return
            return;
        }

        // Find Home and Away Team Stats within the extracted data
        const homeTeamStats = statsData.find(teamStat => teamStat.team.id === homeTeamId);
        const awayTeamStats = statsData.find(teamStat => teamStat.team.id === awayTeamId);
        console.log(`DEBUG: [Display - processUpdate from ${source}] Found Home Stats: ${!!homeTeamStats}, Away Stats: ${!!awayTeamStats}`);

        if (!homeTeamStats && !awayTeamStats) {
             console.warn(`[${source}] Could not find stats for either team in the update.`);
             // Maybe set an error or just return if no relevant data
             // setLiveStatsError("Could not find team stats in the update.");
             return;
        }

        // Process the found stats
        const processedHome = processTeam(homeTeamStats, homeTeamId, 'home');
        const processedAway = processTeam(awayTeamStats, awayTeamId, 'away');
        console.log(`DEBUG: [Display - processUpdate from ${source}] Processed Home:`, processedHome);
        console.log(`DEBUG: [Display - processUpdate from ${source}] Processed Away:`, processedAway);


        // --- IMPORTANT: Update Refs BEFORE State ---
        // Store the *current* state values in the refs before updating the state
        prevHomeStatsRef.current = liveHomeStats;
        prevAwayStatsRef.current = liveAwayStats;
        console.log(`DEBUG: [Display - processUpdate from ${source}] Stored previous stats in refs.`);

        // --- Update State ---
        setLiveHomeStats(processedHome);
        setLiveAwayStats(processedAway);
        console.log(`DEBUG: [Display - processUpdate from ${source}] State updated with processed stats.`);

        // Clear error if we successfully processed an update
        if (liveStatsError) {
            setLiveStatsError(null);
        }
    };


    // Function to fetch initial data
    const fetchInitialData = async (currentMatchId: number) => {
        const supabase = initializeSupabase();
        if (!supabase) return; // Stop if client couldn't be initialized

        console.log(`DEBUG: [Display - fetchInitialData] Fetching initial data for Match ID: ${currentMatchId}`);
        // No need to set loading true here, handled by toggle handler

        try {
          const { data: fixtureData, error: fetchError } = await supabase
            .from('fixtures')
            .select('player_statistics')
            .eq('id', currentMatchId)
            .maybeSingle();

          if (fetchError) {
            console.error("🔴 Supabase error fetching initial live player stats:", fetchError);
            setLiveStatsError(`Database Error: ${fetchError.message}`);
            throw fetchError; // Let finally handle loading end
          }

          if (fixtureData) {
            processUpdate(fixtureData, 'fetch'); // Process initial fetch
          }

        } catch (err) {
          console.error("🔴 Error during initial fetch:", err);
          // Error state already set by fetchError handling or processUpdate
        } finally {
          handleLoadingEnd(); // End loading after initial fetch attempt
        }
    };

    // Function to set up the realtime subscription
    const setupSubscription = (currentMatchId: number) => {
        const supabase = initializeSupabase();
        if (!supabase || channelRef.current) {
             console.log("DEBUG: [Display - Realtime] Skipping subscription setup (already exists or no client).");
             return; // Don't subscribe if already subscribed or client failed
        }

        console.log(`DEBUG: [Display - Realtime] Setting up subscription for fixtures table, id=eq.${currentMatchId}`);
        const channel = supabase.channel(`fixture-${currentMatchId}`); // Unique channel name per fixture

        channelRef.current = channel; // Store the channel instance

        channel
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'fixtures',
                    filter: `id=eq.${currentMatchId}` // Filter for the specific match row
                },
                (payload) => {
                    // <<< THIS IS WHERE REALTIME UPDATES ARE HANDLED >>>
                    console.log(`DEBUG: [Display - Realtime] Received UPDATE payload:`, payload);
                    // Process the 'new' data from the payload
                    processUpdate(payload, 'realtime');
                }
            )
            .subscribe((status, err) => { // Add detailed status/error logging
                if (status === 'SUBSCRIBED') {
                    console.log(`✅ [Display - Realtime] Successfully subscribed to channel: fixture-${currentMatchId}`);
                } else if (status === 'TIMED_OUT') {
                    console.warn(`🟠 [Display - Realtime] Subscription timed out for channel: fixture-${currentMatchId}`);
                    setLiveStatsError("Realtime connection timed out.");
                } else if (status === 'CHANNEL_ERROR') {
                    console.error(`🔴 [Display - Realtime] Channel error for fixture-${currentMatchId}:`, err);
                    setLiveStatsError(`Realtime connection error: ${err?.message || 'Unknown'}`);
                } else if (status === 'CLOSED') {
                     console.log(`⚪ [Display - Realtime] Channel closed for fixture-${currentMatchId}`);
                     // Optionally handle closed state, maybe attempt reconnect?
                } else {
                    console.log(`ℹ️ [Display - Realtime] Channel status [fixture-${currentMatchId}]: ${status}`);
                }
            });

        console.log(`DEBUG: [Display - Realtime] Subscription initiated for channel: fixture-${currentMatchId}`);
    };

    // Function to remove the subscription
    const removeSubscription = async () => {
        if (channelRef.current) {
            console.log(`DEBUG: [Display - Realtime] Removing subscription for channel: ${channelRef.current.channelName}`);
            try {
                const status = await channelRef.current.unsubscribe();
                console.log(`DEBUG: [Display - Realtime] Unsubscribe status: ${status}`);
            } catch (error) {
                 console.error("🔴 [Display - Realtime] Error during unsubscribe:", error);
            } finally {
                 supabaseRef.current?.removeChannel(channelRef.current); // Use removeChannel for full cleanup
                 channelRef.current = null;
                 console.log("DEBUG: [Display - Realtime] Channel reference cleared.");
            }
        }
    };


    // --- Effect Logic ---
    if (showLiveStats) {
      console.log("DEBUG: [Display - useEffect] Toggle ON. Fetching initial data and subscribing...");
      setIsLoadingLiveStats(true); // Ensure loading starts
      setLiveStatsError(null);
      // Fetch initial data first
      fetchInitialData(matchId).then(() => {
          // Only subscribe *after* initial fetch is done (or concurrently if preferred)
          setupSubscription(matchId);
          // Handle loading end after fetch completes (subscription runs in background)
          handleLoadingEnd();
      }).catch(() => {
          // Handle fetch errors if needed, ensure loading stops
          handleLoadingEnd();
      });

    } else {
      console.log("DEBUG: [Display - useEffect] Toggle OFF. Clearing stats and unsubscribing...");
      setIsLoadingLiveStats(true); // Show loader while cleaning up
      removeSubscription(); // Unsubscribe first
      setLiveHomeStats(null);
      setLiveAwayStats(null);
      setLiveStatsError(null);
      handleLoadingEnd(); // End loading after cleanup
    }

    // Cleanup function: Ensures subscription is removed on unmount or before re-running
    return () => {
      console.log("DEBUG: [Display - useEffect Cleanup] Running cleanup...");
      if (loadingTimeoutId) clearTimeout(loadingTimeoutId);
      removeSubscription(); // Call the removal function
    };
    // Ensure all dependencies used in the setup/cleanup are listed
  }, [showLiveStats, matchId, homeTeamId, awayTeamId, liveStatsError]); // Added liveStatsError dependency

  // --- Handler for the toggle switch ---
  const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCheckedState = e.target.checked;
    // Optional: Prevent rapid clicking if already in a loading transition
    // if (isLoadingLiveStats) return;

    console.log(`DEBUG: [Display - Toggle] Changed to ${newCheckedState}. Starting loading state.`);
    setIsLoadingLiveStats(true); // Start loading skeleton immediately
    setShowLiveStats(newCheckedState); // Trigger the useEffect to fetch/clear data
  };

  // --- Skeleton Components ---
  const PlayerInfoSkeleton = () => (
    <div className="flex flex-col items-center text-center w-24 animate-pulse">
      <div className="w-16 h-16 rounded-full bg-gray-200 mb-2 border border-gray-300"></div>
      <div className="h-4 bg-gray-200 rounded w-16"></div>
    </div>
  );

  const StatRowSkeleton = () => (
    <div className="flex justify-between items-center text-sm py-2.5 border-b border-gray-100 dark:border-dark-border last:border-b-0 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-8"></div>
      <div className="h-3 bg-gray-200 rounded w-20 mx-3"></div>
      <div className="h-4 bg-gray-200 rounded w-8"></div>
    </div>
  );
  // --- End Skeleton Components ---

  // --- Sub-Components (PlayerInfo, StatRow - can stay here or be separate files) ---

  // PlayerInfo component
  const PlayerInfo = ({ scorer }: { scorer: TopScorerData | null }) => {
    if (!scorer || typeof scorer !== 'object' || !scorer.player_id) {
      return (
        <div className="flex flex-col items-center text-center w-24">
          <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 mb-2 border border-gray-300 dark:border-dark-border flex items-center justify-center">
            <span className="text-gray-500 dark:text-gray-400 text-xs">N/A</span>
          </div>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">-</span>
        </div>
      );
    }

    // Determine rating based on whether live stats are shown and available
    const ratingToShow = showLiveStats ? (scorer.average_rating ?? null) : (scorer.average_rating ?? null); // Adjust if live rating field is different
    const formattedRating = ratingToShow?.toFixed(1);

    const displayName = scorer.player_name?.includes(' ')
        ? scorer.player_name.split(' ').pop()
        : scorer.player_name;
    const profileUrl = createPlayerSlug(scorer.player_name, scorer.player_id);

    return (
      <Link
        href={profileUrl}
        className="relative flex flex-col items-center text-center w-24 group"
        title={`Se profilen til ${scorer.player_name}`}
      >
        {scorer.player_photo ? (
          <Image
            src={scorer.player_photo}
            alt={displayName ?? 'Player'}
            width={64}
            height={64}
            className="rounded-full object-cover w-16 h-16 mb-2 border border-gray-200 dark:border-dark-border group-hover:opacity-80 transition-opacity"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-2 border border-gray-200 dark:border-dark-border flex items-center justify-center">
            <span className="text-gray-400 dark:text-gray-500 text-xs">No Pic</span>
          </div>
        )}
        {scorer.team_logo && (
          <div className="absolute bottom-8 right-1 w-6 h-6 bg-white dark:bg-dark-nav rounded-full border-2 border-white dark:border-dark-nav overflow-hidden flex items-center justify-center shadow-md">
            <Image src={scorer.team_logo} alt="Team logo" fill className="object-contain p-0.5" sizes="20px" unoptimized />
          </div>
        )}
        {formattedRating && (
          <div className="absolute bottom-8 left-1 w-6 h-6 bg-green-600 rounded-full border-2 border-white dark:border-dark-nav flex items-center justify-center shadow-md">
            <span className="text-white text-[10px] font-semibold leading-none">{formattedRating}</span>
          </div>
        )}
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate w-full group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {displayName ?? '-'}
        </span>
      </Link>
    );
  };

  // StatRow component - UPDATED to use CountUp
  const StatRow = ({ label, homeValue, awayValue, homePrevValue, awayPrevValue }: {
      label: string;
      homeValue?: string | number | null;
      awayValue?: string | number | null;
      homePrevValue?: string | number | null; // Previous value for animation start
      awayPrevValue?: string | number | null; // Previous value for animation start
  }) => {
      const formatValue = (value: string | number | null | undefined): number => {
          // Convert null/undefined/non-numeric strings to 0 for CountUp
          const num = Number(value);
          return isNaN(num) ? 0 : num;
      };

      const startHome = formatValue(homePrevValue);
      const endHome = formatValue(homeValue);
      const startAway = formatValue(awayPrevValue);
      const endAway = formatValue(awayValue);

      // Determine if we should show decimals (e.g., for rating)
      const decimals = label.toLowerCase().includes('rating') ? 1 : 0;
      const duration = 0.6; // Animation duration in seconds

      return (
          <div className="flex justify-between items-center text-sm py-2.5 border-b border-gray-100 dark:border-dark-border last:border-b-0">
              <span className="font-semibold text-gray-800 dark:text-gray-100 text-right w-10 tabular-nums">
                  {homeValue != null ? (
                      <CountUp
                          start={startHome}
                          end={endHome}
                          duration={duration}
                          decimals={decimals}
                          preserveValue
                      />
                  ) : (
                      '-'
                  )}
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mx-3 text-center flex-1 tracking-wide">{label}</span>
              <span className="font-semibold text-gray-800 dark:text-gray-100 text-left w-10 tabular-nums">
                  {awayValue != null ? (
                      <CountUp
                          start={startAway}
                          end={endAway}
                          duration={duration}
                          decimals={decimals}
                          preserveValue
                      />
                  ) : (
                      '-'
                  )}
              </span>
          </div>
      );
  };

  // --- Render Logic ---
  const displaySeason = `${season}/${season + 1}`;
  const leagueLogoUrl = leagueId ? `https://media.api-sports.io/football/leagues/${leagueId}.png` : null;

  // Determine which player data to show based on toggle (if implemented later)
  // For now, just use the props directly
  const displayHomePlayer = showLiveStats ? liveHomeStats : homeTopScorer;
  const displayAwayPlayer = showLiveStats ? liveAwayStats : awayTopScorer;
  const statsLabelSuffix = showLiveStats ? "" : ""; // Removed " (Sesong)" suffix

  // Get previous stats for animation start point
  const prevHome = showLiveStats ? prevHomeStatsRef.current : null;
  const prevAway = showLiveStats ? prevAwayStatsRef.current : null;

  // --- Main JSX Structure ---
  return (
    <div className="mb-6 bg-white dark:bg-[#181818] rounded-lg border border-gray-100 dark:border-none overflow-hidden"> {/* Updated to match reference styling */}
      {/* Updated Header with Icon and Season Info */}
      <div className="pt-4 pb-4 mb-5 border-b border-[#f4f4f4] dark:border-dark-border"> {/* Updated border color for light mode */}
        <div className="flex items-center justify-center mb-2">
          {/* Trophy Icon */}
          <svg className="w-5 h-5 text-gray-800 dark:text-gray-100 mr-2" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="m13 11.75c-.19 0-.38-.07-.53-.22-.29-.29-.29-.77 0-1.06l4-4c.29-.29.77-.29 1.06 0s.29.77 0 1.06l-4 4c-.15.15-.34.22-.53.22z"></path>
            <path d="m22.69 4.54c-.12-.28-.39-.46-.69-.46h-2.08v-2.08c0-.3-.18-.58-.46-.69-.28-.12-.6-.05-.82.16l-2.12 2.12c-.14.14-.22.33-.22.53v2.83c0 .41.34.75.75.75h2.83c.2 0 .39-.08.53-.22l2.12-2.12c.21-.21.28-.54.16-.82z"></path>
            <path d="m14.24 12.24c-.18.18-.38.31-.61.39-.25.65-.89 1.12-1.63 1.12-.96 0-1.75-.79-1.75-1.75 0-.74.47-1.37 1.12-1.63.09-.23.22-.43.39-.61l.93-.93c-.22-.05-.46-.08-.7-.08-1.79 0-3.25 1.46-3.25 3.25s1.46 3.25 3.25 3.25 3.25-1.46 3.25-3.25c0-.24-.03-.47-.08-.7l-.93.93z"></path>
            <path d="m17.77 8.7-.67.67c.41.79.64 1.68.64 2.63 0 3.17-2.58 5.75-5.75 5.75s-5.75-2.58-5.75-5.75 2.58-5.75 5.75-5.75c.95 0 1.84.23 2.63.64l.67-.67v-.67c-.99-.51-2.11-.8-3.3-.8-4 0-7.25 3.25-7.25 7.25s3.25 7.25 7.25 7.25 7.25-3.25 7.25-7.25c0-1.19-.29-2.31-.8-3.3z"></path>
            <path d="m21.12 8.19c-.16.16-.34.28-.54.36.44 1.09.67 2.25.67 3.45 0 5.1-4.15 9.25-9.25 9.25s-9.25-4.15-9.25-9.25 4.15-9.25 9.25-9.25c1.19 0 2.36.23 3.45.67.09-.2.21-.39.36-.54l.66-.66c-1.39-.64-2.91-.98-4.47-.98-5.93.01-10.75 4.83-10.75 10.76s4.82 10.75 10.75 10.75 10.75-4.82 10.75-10.75c0-1.56-.34-3.08-.98-4.47l-.66.66z"></path>
          </svg>
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
            Toppscorere
            {showLiveStats && (
              <span className="text-[10px] text-green-600 dark:text-green-500 font-bold align-middle ml-1.5 tracking-wide">
                LIVE
              </span>
            )}
            {isLoadingLiveStats && <span className="animate-pulse text-sm text-gray-500 dark:text-gray-400 ml-2">Laster...</span>}
          </h3>
        </div>
        
        {/* Season Info Under Title */}
        {leagueName && (
          <div className="text-center text-xs text-gray-600 dark:text-gray-400 flex items-center justify-center space-x-2">
            {leagueLogoUrl && <Image src={leagueLogoUrl} width={16} height={16} alt={`${leagueName} logo`} className="inline-block" unoptimized />}
            <span>{leagueName} {displaySeason}</span>
          </div>
        )}
      </div>

      {/* Player Info Section - Render Skeletons or Actual Data */}
      <div className="flex justify-around items-start mb-5 min-h-[100px]">
        {isLoadingLiveStats ? (
          <>
            <PlayerInfoSkeleton />
            <PlayerInfoSkeleton />
          </>
        ) : (
          <>
            <PlayerInfo scorer={displayHomePlayer} />
            <PlayerInfo scorer={displayAwayPlayer} />
          </>
        )}
      </div>

      {/* Stats Comparison Section - UPDATED to pass previous values */}
      <div className="px-4"> {/* Added horizontal padding wrapper */}
        <div className="space-y-1 min-h-[180px]"> {/* Added min-height to reduce layout shift */}
          {isLoadingLiveStats ? (
            <>
              <StatRowSkeleton />
              <StatRowSkeleton />
              <StatRowSkeleton />
              <StatRowSkeleton />
              <StatRowSkeleton />
              {(displayHomePlayer?.average_rating || displayAwayPlayer?.average_rating || homeTopScorer?.average_rating || awayTopScorer?.average_rating) && <StatRowSkeleton />}
            </>
          ) : (
            <>
              {displayHomePlayer || displayAwayPlayer ? (
                <>
                  <StatRow label={`Mål${statsLabelSuffix}`}
                           homeValue={displayHomePlayer?.goals_total} awayValue={displayAwayPlayer?.goals_total}
                           homePrevValue={prevHome?.goals_total} awayPrevValue={prevAway?.goals_total} />
                  <StatRow label={`Målgivende${statsLabelSuffix}`}
                           homeValue={displayHomePlayer?.assists} awayValue={displayAwayPlayer?.assists}
                           homePrevValue={prevHome?.assists} awayPrevValue={prevAway?.assists} />
                  <StatRow label={`Minutter${statsLabelSuffix}`}
                           homeValue={displayHomePlayer?.minutes} awayValue={displayAwayPlayer?.minutes}
                           homePrevValue={prevHome?.minutes} awayPrevValue={prevAway?.minutes} />
                  <StatRow label={`Taklinger${statsLabelSuffix}`}
                           homeValue={displayHomePlayer?.tackles} awayValue={displayAwayPlayer?.tackles}
                           homePrevValue={prevHome?.tackles} awayPrevValue={prevAway?.tackles} />
                  <StatRow label={`Straffemål${statsLabelSuffix}`}
                           homeValue={displayHomePlayer?.penalties_scored} awayValue={displayAwayPlayer?.penalties_scored}
                           homePrevValue={prevHome?.penalties_scored} awayPrevValue={prevAway?.penalties_scored} />
                  {/* Conditionally render Rating only if either player has one */}
                  {(displayHomePlayer?.average_rating != null || displayAwayPlayer?.average_rating != null) && (
                      <StatRow label={`Rating${statsLabelSuffix}`}
                               homeValue={displayHomePlayer?.average_rating} awayValue={displayAwayPlayer?.average_rating}
                               homePrevValue={prevHome?.average_rating} awayPrevValue={prevAway?.average_rating} />
                  )}
                </>
              ) : (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                  {showLiveStats ? (liveStatsError || "Ingen live data tilgjengelig.") : "Ingen toppscorerdata tilgjengelig."}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* === Live Toggle Switch (iOS Style) === */}
      {canShowToggle && (
          <div className="mt-6 pt-4 pb-4 border-t border-[#f4f4f4] dark:border-dark-border flex items-center justify-center space-x-3">
              {/* Label Text */}
              <label htmlFor="liveToggle" className={`text-sm font-medium cursor-pointer ${
                isLoadingLiveStats 
                  ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                  : 'text-gray-800 dark:text-gray-100'
              }`}>
                  {showLiveStats ? 'Vis sesongdata' : 'Vis live data'}
              </label>
              
              {/* iOS Style Toggle Container */}
              <div className="relative inline-block">
                  <input
                      type="checkbox"
                      id="liveToggle"
                      checked={showLiveStats}
                      onChange={handleToggleChange}
                      disabled={isLoadingLiveStats}
                      className="sr-only"
                  />
                  <label
                      htmlFor="liveToggle"
                      className={`relative inline-flex items-center cursor-pointer transition-colors duration-300 ease-in-out
                                 w-[42px] h-[26px] rounded-full
                                 ${showLiveStats 
                                   ? 'bg-green-500 dark:bg-green-600' 
                                   : 'bg-gray-200 dark:bg-gray-600'
                                 }
                                 ${isLoadingLiveStats ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                      <span
                          className={`inline-block w-[22px] h-[22px] bg-white rounded-full shadow-sm transform transition-transform duration-300 ease-in-out
                                     ${showLiveStats ? 'translate-x-[18px]' : 'translate-x-0.5'}
                                     ${isLoadingLiveStats ? 'opacity-70' : ''}`}
                      />
                  </label>
              </div>
          </div>
      )}
      {/* ========================= */}

    </div>
  );
}

// --- Helper Interfaces (ensure these match your actual data structure) ---
interface PlayerStats {
    player: {
        id: number;
        name: string | null;
        photo: string | null;
    };
    statistics: Array<{
        games: {
            minutes: number | null;
            rating: string | null; // Rating might be string from API
            appearences?: number | null; // Optional if not always present
        };
        goals: {
            total: number | null;
            assists: number | null;
        };
        // Add other stats if needed (tackles, penalties etc. from live data)
    }>;
}

interface TeamStats {
    team: {
        id: number;
        name: string;
        logo: string | null;
    };
    players: PlayerStats[];
}

// Type for the entire player_statistics JSONB column content
type LiveStatsData = TeamStats[];