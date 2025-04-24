"use client"

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { getStreamingProviders, StreamingProvider } from '@/utils/channelUtils'; // Ensure StreamingProvider type is exported/imported
import { format, isToday, isFuture, isPast, subDays, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale'; // Norwegian locale for date formatting
import { Tooltip } from 'react-tooltip'; // Import react-tooltip

// --- Types ---
interface Team {
    id: number;
    name: string;
    logo: string;
}

interface FixtureData {
    id: number;
    date: string; // ISO string "2025-04-21T15:00:00+00:00"
    venue: { id: number | null; name: string | null; city: string | null };
    status: { long: string | null; short: string | null; elapsed: number | null; extra: number | null };
    timestamp: number; // Unix timestamp
}

interface MatchGoals {
    home: number | null;
    away: number | null;
}

interface MatchTeams {
    home: Team;
    away: Team;
}

// Combined type for fetched fixtures
interface LeagueFixture {
    id: number; // Fixture ID
    league_id: number;
    fixture: FixtureData | null;
    teams: MatchTeams | null;
    goals: MatchGoals | null;
    status: { short: string | null; elapsed: number | null } | null; // Top-level status for easier access initially
    details_last_updated_at: string | null; // For live timer sync
}

// Type for live updates state
interface LiveMatchUpdate {
    statusShort: string | null;
    elapsed: number | null;
    goalsHome: number | null;
    goalsAway: number | null;
    lastUpdated: number | null; // Timestamp (ms) of the last update event or calculation
}

interface MatchCalendarProps {
    currentMatchId?: string; // Keep for highlighting the current page's match
    leagueId: number; // Required prop
    leagueName?: string; // Optional league name for the header
}

// --- Constants ---
const REFRESH_INTERVAL_MS = 60000; // 1 minute for timer updates
const MAX_FETCH_RETRIES = 3; // Number of times to retry fetching
const RETRY_DELAY_MS = 1500; // Delay between retries in milliseconds

// --- Helper Functions ---
const formatMatchTime = (dateString: string | null): string => {
    if (!dateString) return '--:--';
    try {
        return format(parseISO(dateString), 'HH:mm');
    } catch {
        return '--:--';
    }
};

const formatMatchDate = (dateString: string | null): string => {
    if (!dateString) return 'Ukjent dato';
    try {
        const date = parseISO(dateString);
        if (isToday(date)) return 'I dag';
        // Add other relative formats if desired (e.g., 'I morgen', 'I går')
        return format(date, 'EEE dd. MMM', { locale: nb }); // e.g., "Søn 21. apr"
    } catch {
        return 'Ukjent dato';
    }
};

// Simple function to get Supabase client (ensure env vars are public)
const getSupabaseClient = (): SupabaseClient | null => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
        // Create a new client instance if one doesn't exist or reuse?
        // For simplicity here, creating new on each call, but could be memoized.
        return createClient(supabaseUrl, supabaseAnonKey);
    } else {
        console.error("🔴 ERROR: Supabase URL or Anon Key missing in environment variables.");
        return null;
    }
};

// Simple delay function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Component ---
export default function MatchCalendar({
    currentMatchId = "",
    leagueId,
    leagueName = "Liga Kamper" // Default name if not provided
}: MatchCalendarProps) {
    const [pastMatches, setPastMatches] = useState<LeagueFixture[]>([]);
    const [upcomingMatches, setUpcomingMatches] = useState<LeagueFixture[]>([]);
    const [liveUpdates, setLiveUpdates] = useState<{ [key: number]: LiveMatchUpdate }>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(() => new Date()); // For live timer calculation
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming'); // State for active tab

    const supabaseRef = useRef<SupabaseClient | null>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // --- Initialize Supabase Client ---
    useEffect(() => {
        if (!supabaseRef.current) {
            supabaseRef.current = getSupabaseClient();
            if (!supabaseRef.current) {
                setError("Failed to initialize Supabase client.");
                setIsLoading(false);
            }
        }
    }, []);

    // --- Fetch Initial Data ---
    const fetchLeagueMatches = useCallback(async (attempt = 1) => { // Add attempt counter
        if (!supabaseRef.current || !leagueId) return;

        // Set loading true only on the first attempt, keep it true during retries
        if (attempt === 1) {
            setIsLoading(true);
            setError(null); // Clear previous errors on new fetch/retry sequence
        }

        const now = new Date();
        const oneWeekAgo = subDays(now, 7);
        const nowISO = now.toISOString();
        const oneWeekAgoISO = oneWeekAgo.toISOString();

        try {
            console.log(`DEBUG: [MatchCalendar] Attempt ${attempt} to fetch matches for league ${leagueId}...`);
            const { data, error: dbError } = await supabaseRef.current
                .from('fixtures')
                .select(`
                    id,
                    league_id,
                    fixture,
                    teams,
                    goals,
                    status,
                    details_last_updated_at
                `)
                .eq('league_id', leagueId)
                .gte('fixture->>date', oneWeekAgoISO) // Get matches from the last week onwards
                .order('fixture->>date', { ascending: true }); // Order by date

            if (dbError) throw dbError; // Throw error to be caught by catch block

            // --- Success Case ---
            const fetchedMatches: LeagueFixture[] = data || [];
            const past: LeagueFixture[] = [];
            const upcoming: LeagueFixture[] = [];
            const initialLiveUpdates: { [key: number]: LiveMatchUpdate } = {};

            fetchedMatches.forEach(match => {
                const matchDateStr = match.fixture?.date;
                if (!matchDateStr) return; // Skip if no date

                try {
                    const matchDate = parseISO(matchDateStr);
                    const statusShort = match.status?.short ?? match.fixture?.status?.short ?? null;
                    const isLiveStatus = statusShort && ['1H', 'HT', '2H', 'ET', 'P', 'LIVE', 'SUSP', 'INT'].includes(statusShort);

                    // Initialize live updates for potentially live matches
                    if (isLiveStatus || statusShort === 'NS') { // Include NS for potential future live updates
                         initialLiveUpdates[match.id] = {
                            statusShort: statusShort,
                            elapsed: match.status?.elapsed ?? match.fixture?.status?.elapsed ?? null,
                            goalsHome: match.goals?.home ?? null,
                            goalsAway: match.goals?.away ?? null,
                            lastUpdated: match.details_last_updated_at ? parseISO(match.details_last_updated_at).getTime() : null
                         };
                    }


                    if (isPast(matchDate) && statusShort !== 'NS' && !isLiveStatus) { // Consider past if not 'Not Started' and not currently live
                        past.push(match);
                    } else { // Includes today's non-past, future, and potentially live matches
                        upcoming.push(match);
                    }
                } catch (e) {
                    console.warn(`Could not parse date for match ${match.id}: ${matchDateStr}`, e);
                }
            });

            // Sort past matches descending (most recent first)
            past.sort((a, b) => (parseISO(b.fixture!.date).getTime() - parseISO(a.fixture!.date).getTime()));
            // Upcoming already sorted ascending by query

            setPastMatches(past);
            setUpcomingMatches(upcoming);
            setLiveUpdates(prev => ({ ...prev, ...initialLiveUpdates })); // Merge initial updates
            setError(null); // Clear error on success
            setIsLoading(false); // Set loading false on success
            console.log(`✅ [MatchCalendar] Successfully fetched matches for league ${leagueId} on attempt ${attempt}.`);
            // --- End Success Case ---

        } catch (err: any) {
            console.error(`🔴 Error fetching league matches (Attempt ${attempt}/${MAX_FETCH_RETRIES}):`, err);

            // --- Retry Logic ---
            if (attempt < MAX_FETCH_RETRIES) {
                console.warn(`🟠 [MatchCalendar] Retrying fetch for league ${leagueId} in ${RETRY_DELAY_MS}ms...`);
                await delay(RETRY_DELAY_MS); // Wait before retrying
                fetchLeagueMatches(attempt + 1); // Call recursively for the next attempt
            } else {
                // --- Failure Case (Max retries reached) ---
                console.error(`🔴 [MatchCalendar] Max fetch retries (${MAX_FETCH_RETRIES}) reached for league ${leagueId}. Setting error state.`);
                setError(`Failed to load matches after ${MAX_FETCH_RETRIES} attempts. Please try again later.`);
                setIsLoading(false); // Set loading false after final failure
                // Clear data potentially loaded from previous attempts if needed
                // setPastMatches([]);
                // setUpcomingMatches([]);
                // setLiveUpdates({});
                // --- End Failure Case ---
            }
            // --- End Retry Logic ---
        }
        // Note: 'finally' block removed as isLoading is now handled within try/catch/retry logic
    }, [leagueId]); // Keep only leagueId as dependency for useCallback

    useEffect(() => {
        if (supabaseRef.current && leagueId) {
            fetchLeagueMatches(); // Initial call (attempt 1)
        }
        // Cleanup function for fetchLeagueMatches is not strictly needed here
        // as the component unmount/leagueId change will trigger new fetches/subscriptions.
    }, [leagueId, fetchLeagueMatches]); // Fetch when leagueId changes or fetchLeagueMatches function reference changes (due to leagueId change)

    // --- Realtime Subscription ---
    useEffect(() => {
        // Ensure Supabase client is initialized and leagueId is present
        if (!supabaseRef.current || !leagueId) return;

        // If a channel already exists for this leagueId (e.g., from a previous render),
        // ensure it's properly cleaned up before creating a new one.
        // This check might be redundant if the cleanup function works perfectly,
        // but adds a layer of safety.
        if (channelRef.current && channelRef.current.topic !== `realtime:public:fixtures:league_id=eq.${leagueId}`) {
             console.log(`DEBUG: [MatchCalendar] Topic mismatch or existing channel found. Cleaning up before resubscribing.`);
             supabaseRef.current.removeChannel(channelRef.current)
                 .catch(error => console.error("🔴 [MatchCalendar] Error removing channel during mismatch check:", error));
             channelRef.current = null;
        }

        // Only proceed if there's no active channel for the current leagueId
        if (!channelRef.current) {
            const supabase = supabaseRef.current;
            const channel = supabase.channel(`league-fixtures-${leagueId}`);
            channelRef.current = channel;

            console.log(`DEBUG: [MatchCalendar] Setting up subscription for league ${leagueId}`);

            channel
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'fixtures',
                        filter: `league_id=eq.${leagueId}`,
                    },
                    (payload) => {
                        console.log('DEBUG: [MatchCalendar] Realtime UPDATE received:', payload);
                        const updatedFixture = payload.new as LeagueFixture;
                        const fixtureId = updatedFixture.id;

                        // Update live state directly using the fixtureId
                        // No need to check against existing state keys here,
                        // just update based on the incoming ID.
                        const newStatus = updatedFixture.status?.short ?? updatedFixture.fixture?.status?.short ?? null;
                        const newElapsed = updatedFixture.status?.elapsed ?? updatedFixture.fixture?.status?.elapsed ?? null;
                        const newGoalsHome = updatedFixture.goals?.home ?? null;
                        const newGoalsAway = updatedFixture.goals?.away ?? null;
                        const newLastUpdated = updatedFixture.details_last_updated_at
                            ? parseISO(updatedFixture.details_last_updated_at).getTime()
                            : Date.now(); // Use current time if timestamp is missing

                        console.log(`DEBUG: [MatchCalendar] Updating live state for ${fixtureId}: S=${newStatus} E=${newElapsed} G=(${newGoalsHome}-${newGoalsAway}) U=${newLastUpdated}`);

                        // Use functional update form for safety, though direct update might also work
                        setLiveUpdates(prev => ({
                            ...prev,
                            [fixtureId]: {
                                statusShort: newStatus,
                                elapsed: newElapsed,
                                goalsHome: newGoalsHome,
                                goalsAway: newGoalsAway,
                                lastUpdated: newLastUpdated,
                            },
                        }));

                        // Note: Moving matches between upcoming/past based on realtime
                        // status changes (e.g., NS -> 1H -> FT) is not implemented here
                        // to keep the logic simpler. The initial fetch categorizes them.
                    }
                )
                .subscribe((status, err) => {
                    // Log different statuses for better debugging
                    switch (status) {
                        case 'SUBSCRIBED':
                            console.log(`✅ [MatchCalendar] Subscribed successfully to league ${leagueId}`);
                            break;
                        case 'CHANNEL_ERROR':
                            console.error(`🔴 [MatchCalendar] Channel error for league ${leagueId}:`, err);
                            setError(`Realtime channel error: ${err?.message || 'Unknown error'}`);
                            break;
                        case 'TIMED_OUT':
                            console.warn(`🟠 [MatchCalendar] Subscription timed out for league ${leagueId}. Retrying...`);
                            // Supabase client attempts auto-reconnect
                            break;
                        case 'CLOSED':
                            console.log(`ℹ️ [MatchCalendar] Channel closed for league ${leagueId}.`);
                            // This might happen during cleanup or if connection is lost.
                            break;
                        default:
                             console.log(`ℹ️ [MatchCalendar] Channel status [league-${leagueId}]: ${status}`);
                    }
                     // Log the specific error object if present
                     if (err) {
                         console.error(`🔴 [MatchCalendar] Subscription error details [league-${leagueId}]:`, err);
                         // Set error state only for critical errors like initial connection failure
                         if (status === 'CHANNEL_ERROR') {
                            setError(`Realtime connection error: ${err.message}`);
                         }
                     }
                });
        }

        // Cleanup function: This runs when the component unmounts OR BEFORE the effect runs again due to dependency changes.
        return () => {
            if (channelRef.current) {
                console.log(`DEBUG: [MatchCalendar] Cleaning up subscription for league ${leagueId}`);
                // Use a temporary variable to avoid race conditions if the ref changes quickly
                const currentChannel = channelRef.current;
                channelRef.current = null; // Clear the ref immediately
                supabaseRef.current?.removeChannel(currentChannel)
                    .then(status => console.log(`DEBUG: [MatchCalendar] Unsubscribe status for league ${leagueId}: ${status}`))
                    .catch(error => console.error("🔴 [MatchCalendar] Error during unsubscribe:", error));
            }
        };
    // IMPORTANT: Only depend on leagueId and the presence of the supabase client.
    // Do NOT include liveUpdates or upcomingMatches here.
    }, [leagueId, supabaseRef.current]); // Re-run only if leagueId changes or supabase client initializes

    // --- Live Timer Update Interval ---
     useEffect(() => {
        // Clear existing interval if running
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
        }

        // Start new interval
        timerIntervalRef.current = setInterval(() => {
            setCurrentTime(new Date());
        }, REFRESH_INTERVAL_MS); // Update current time every minute

        // Cleanup interval on unmount
        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        };
    }, []); // Run only once on mount

    // --- Get Display Status & Timer ---
    const getMatchDisplayData = (match: LeagueFixture) => {
        const liveData = liveUpdates[match.id];
        const fixtureData = match.fixture;
        const initialStatus = match.status?.short ?? fixtureData?.status?.short ?? 'TBD';
        const currentStatus = liveData?.statusShort ?? initialStatus;

        const isFinished = ['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'AWD', 'WO'].includes(currentStatus);
        const isLive = !isFinished && ['1H', 'HT', '2H', 'ET', 'P', 'LIVE', 'SUSP', 'INT'].includes(currentStatus);
        const isUpcoming = !isFinished && !isLive && ['NS', 'TBD'].includes(currentStatus); // Simplified upcoming

        const homeScore = liveData?.goalsHome ?? match.goals?.home ?? null;
        const awayScore = liveData?.goalsAway ?? match.goals?.away ?? null;

        let displayStatus: string | React.ReactNode = currentStatus; // Default to status code
        let timerComponent: React.ReactNode = null;

        if (isFinished) {
            displayStatus = 'FT'; // Or map specific codes if needed
        } else if (isLive) {
            const officialElapsedMins = liveData?.elapsed ?? fixtureData?.status?.elapsed ?? 0;
            const lastUpdatedTime = liveData?.lastUpdated ?? (match.details_last_updated_at ? parseISO(match.details_last_updated_at).getTime() : null);
            let calculatedSeconds = officialElapsedMins * 60;

            if (lastUpdatedTime && currentStatus !== 'HT') { // Don't advance timer during half-time
                const secondsSinceUpdate = Math.max(0, Math.floor((currentTime.getTime() - lastUpdatedTime) / 1000));
                calculatedSeconds += secondsSinceUpdate;
            }

            // Basic capping
            if (currentStatus === '1H' && calculatedSeconds > 45 * 60) calculatedSeconds = 45 * 60;
            if (currentStatus === '2H' && calculatedSeconds > 90 * 60) calculatedSeconds = 90 * 60;
            // Add more capping for ET if needed

            const minutes = Math.floor(calculatedSeconds / 60);
            // const seconds = calculatedSeconds % 60; // Seconds usually not shown in simple timers

            if (currentStatus === 'HT') {
                displayStatus = 'Pause';
            } else {
                 // Format with prime symbol
                 const displayMinutes = minutes; // Use calculated minutes
                 displayStatus = `${displayMinutes}'`;

                 // Add extra time indicator if applicable
                 const extraTimeValue = fixtureData?.status?.extra ?? 0;
                 let extraTimeDisplay: string | null = null;
                 if (extraTimeValue > 0) {
                     if (currentStatus === '1H' && officialElapsedMins >= 45) extraTimeDisplay = `+${extraTimeValue}`;
                     else if (currentStatus === '2H' && officialElapsedMins >= 90) extraTimeDisplay = `+${extraTimeValue}`;
                     // Add ET logic if needed
                 }
                 if (extraTimeDisplay) {
                     displayStatus = (
                         <>
                             {displayStatus}
                             <span className="ml-1 opacity-80">{extraTimeDisplay}</span>
                         </>
                     );
                 }
            }
             // Render timer with live color
             timerComponent = (
                 <span style={{ color: '#00985f' }} className="block text-sm font-semibold whitespace-nowrap">
                     {displayStatus}
                 </span>
             );
             displayStatus = ''; // Clear text status if timer is shown


        } else if (isUpcoming) {
            displayStatus = formatMatchTime(fixtureData?.date);
        }

        return {
            displayStatus, // Text status (FT, Pause, 15:00) or empty if timer shown
            timerComponent, // The live timer component (e.g., 45'+2)
            isLive,
            isFinished,
            isUpcoming,
            homeScore,
            awayScore,
            matchDateStr: formatMatchDate(fixtureData?.date),
            kickOffTime: formatMatchTime(fixtureData?.date), // Keep for potential use
            isToday: fixtureData?.date ? isToday(parseISO(fixtureData.date)) : false,
        };
    };

    // --- Tooltip Content Helper ---
    const renderTooltipContent = (providers: StreamingProvider[]) => (
        <div className="p-2 bg-white rounded-md shadow-lg text-xs border border-gray-200 max-w-xs">
             <div className="font-semibold mb-1 text-gray-800">Se kampen på:</div>
             <div className="space-y-1">
                 {providers.map((provider) => (
                     <div key={provider.name} className="flex items-center">
                         <div className="relative h-4 w-4 mr-1.5 flex-shrink-0">
                             {provider.icon && <Image src={provider.icon} alt={provider.name} fill className="object-contain" unoptimized />}
                         </div>
                         <span className="text-[11px] text-gray-700">{provider.name}</span>
                         {provider.package && <span className="text-gray-500 ml-1 text-[10px]">({provider.package})</span>}
                     </div>
                 ))}
             </div>
         </div>
    );

    // --- Render Helper for Match Rows ---
    const renderMatchRow = (match: LeagueFixture, isPastSection: boolean) => {
        const {
            displayStatus,
            timerComponent,
            isLive,
            isFinished,
            isUpcoming,
            homeScore,
            awayScore,
            matchDateStr,
            kickOffTime,
            isToday,
        } = getMatchDisplayData(match);

        const streamingProviders = getStreamingProviders(leagueId);
        const hasStreamingProviders = streamingProviders.length > 0;
        const fixtureIdStr = match.id.toString();
        const isCurrentPageMatch = currentMatchId === fixtureIdStr;
        const linkHref = `/fotball/kamp/${match.id}`;

        // Unique ID for the tooltip anchor based on match ID
        const tooltipId = `match-${match.id}-tooltip-anchor`;

        return (
            <Link
                key={`${isPastSection ? 'past' : 'upcoming'}-${match.id}`}
                href={linkHref}
                className={`block hover:bg-gray-50 transition-colors ${isCurrentPageMatch ? 'bg-gray-100 font-semibold' : ''}`}
            >
                <div className="flex justify-between items-center px-3 py-3 border-b border-gray-100">
                    {/* Left side: Date/Teams/Scores */}
                    <div className={`flex-grow pr-3 ${isFinished || isLive ? 'border-r border-gray-100' : ''}`}>
                        {/* Date Header (only for the first item in upcoming or if date changes) - Simplified: Show for all */}
                        {!isPastSection && (
                             <div className="text-xs text-gray-500 mb-1.5">{matchDateStr}</div>
                        )}
                         {isPastSection && (
                             <div className="text-xs text-gray-500 mb-1.5">{matchDateStr}</div>
                        )}

                        {/* Home Team Row */}
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center min-w-0">
                                <div className="relative w-4 h-4 mr-1.5 flex-shrink-0">
                                    {match.teams?.home?.logo && (
                                        <Image 
                                            src={match.teams.home.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')} 
                                            alt={match.teams.home.name} 
                                            fill 
                                            className="object-contain" 
                                            unoptimized 
                                        />
                                    )}
                                </div>
                                <span className={`text-sm truncate ${isCurrentPageMatch ? 'font-semibold' : 'font-normal'}`}>{match.teams?.home?.name ?? 'N/A'}</span>
                            </div>
                            <span className={`text-sm ml-2 ${isFinished || isLive ? (isLive ? 'font-bold text-gray-900' : 'font-medium text-gray-700') : 'font-normal text-gray-400'}`}>
                                {(isFinished || isLive) && homeScore !== null ? homeScore : ''}
                            </span>
                        </div>
                        {/* Away Team Row */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center min-w-0">
                                <div className="relative w-4 h-4 mr-1.5 flex-shrink-0">
                                    {match.teams?.away?.logo && (
                                        <Image 
                                            src={match.teams.away.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')} 
                                            alt={match.teams.away.name} 
                                            fill 
                                            className="object-contain" 
                                            unoptimized 
                                        />
                                    )}
                                </div>
                                <span className={`text-sm truncate ${isCurrentPageMatch ? 'font-semibold' : 'font-normal'}`}>{match.teams?.away?.name ?? 'N/A'}</span>
                            </div>
                             <span className={`text-sm ml-2 ${isFinished || isLive ? (isLive ? 'font-bold text-gray-900' : 'font-medium text-gray-700') : 'font-normal text-gray-400'}`}>
                                {(isFinished || isLive) && awayScore !== null ? awayScore : ''}
                            </span>
                        </div>
                    </div>

                    {/* Right side: Status/Time & TV Icon */}
                    <div className="flex-shrink-0 text-center w-[70px] pl-3"> {/* Wider width */}
                        {timerComponent ? (
                            timerComponent // Render live timer component
                        ) : (
                            <span className={`block text-sm ${isFinished ? 'font-normal text-gray-500' : 'font-medium text-gray-800'}`}>
                                {displayStatus} {/* Render FT, Pause, 15:00 etc. */}
                            </span>
                        )}

                        {/* TV Icon - Show only for upcoming matches with providers */}
                        {isUpcoming && hasStreamingProviders && (
                            <div
                                data-tooltip-id="streaming-provider-tooltip" // Use the common ID
                                data-tooltip-content={JSON.stringify(streamingProviders)}
                                data-tooltip-place="top-end"
                                className="mt-1 text-gray-400 flex justify-center relative"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                        )}
                    </div>
                </div>
            </Link>
        );
    };


    // --- Main Render ---
    if (!leagueId) {
        return (
            <div className="bg-white rounded-lg shadow-md p-4 text-center text-gray-500">
                Ingen liga valgt.
            </div>
        );
    }

    // Update league logo URL format
    const leagueLogoUrl = `https://viasport.b-cdn.net/football/leagues/${leagueId}.png`;

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* === League Header === */}
            <div className="flex items-center p-4 border-b border-gray-100 bg-white">
                <div className="relative w-6 h-6 mr-2 flex-shrink-0">
                    <Image
                        src={leagueLogoUrl}
                        alt={leagueName}
                        fill
                        className="object-contain"
                        unoptimized
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                </div>
                <h2 className="text-base font-semibold text-gray-800 truncate">
                    {leagueName}
                </h2>
            </div>
            {/* === End League Header === */}

            {/* === Tabs === */}
            <div className="flex border-b border-gray-100">
                <button
                    onClick={() => setActiveTab('upcoming')}
                    className={`flex-1 py-2 px-4 text-sm font-medium text-center focus:outline-none ${
                        activeTab === 'upcoming'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    Kommende ({upcomingMatches.length})
                </button>
                <button
                    onClick={() => setActiveTab('past')}
                    className={`flex-1 py-2 px-4 text-sm font-medium text-center focus:outline-none ${
                        activeTab === 'past'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    Resultater ({pastMatches.length})
                </button>
            </div>
            {/* === End Tabs === */}


            {isLoading && (
                <div className="p-4 text-center text-gray-500">Laster kamper...</div>
            )}
            {error && (
                <div className="p-4 text-center text-red-600">{error}</div>
            )}

            {/* Match List Container */}
            {!isLoading && !error && (
                 // Added overflow-x-hidden to prevent horizontal scrollbar
                <div className="max-h-[400px] overflow-y-auto overflow-x-hidden">
                    {/* Upcoming Matches Section (Conditional) */}
                    {activeTab === 'upcoming' && (
                        <>
                            {upcomingMatches.length > 0 ? (
                                <div>
                                    {upcomingMatches.map(match => renderMatchRow(match, false))}
                                </div>
                            ) : (
                                <div className="p-4 text-center text-gray-500 text-sm">Ingen kommende kamper.</div>
                            )}
                        </>
                    )}

                    {/* Past Matches Section (Conditional) */}
                    {activeTab === 'past' && (
                         <>
                            {pastMatches.length > 0 ? (
                                <div>
                                    {pastMatches.map(match => renderMatchRow(match, true))}
                                </div>
                             ) : (
                                <div className="p-4 text-center text-gray-500 text-sm">Ingen nylige resultater.</div>
                             )}
                        </>
                    )}
                </div>
            )}

            {/* === Add the Tooltip Component Here === */}
            <Tooltip
                 id="streaming-provider-tooltip"
                 render={({ content }) => { // Now this can access renderTooltipContent
                     if (!content) return null;
                     try {
                         const providers = JSON.parse(content) as StreamingProvider[];
                         // Call the helper function defined in the component scope
                         return renderTooltipContent(providers);
                     } catch (e) {
                         console.error("Failed to parse tooltip content", e);
                         return null;
                     }
                 }}
                 clickable
                 style={{ backgroundColor: 'transparent', padding: 0, zIndex: 50 }}
            />
             {/* === End Tooltip Component === */}
        </div>
    );
} 
