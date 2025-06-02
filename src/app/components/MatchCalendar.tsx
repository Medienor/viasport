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
    hasTopScorersAbove?: boolean; // Add this prop
}

interface RelatedLeague {
    id: number;
    name: string;
    country: string;
    logo?: string;
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
    leagueName = "Liga Kamper", // Default name if not provided
    hasTopScorersAbove = false // Default to false
}: MatchCalendarProps) {
    const [pastMatches, setPastMatches] = useState<LeagueFixture[]>([]);
    const [upcomingMatches, setUpcomingMatches] = useState<LeagueFixture[]>([]);
    const [liveUpdates, setLiveUpdates] = useState<{ [key: number]: LiveMatchUpdate }>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(() => new Date()); // For live timer calculation
    const [relatedLeagues, setRelatedLeagues] = useState<RelatedLeague[]>([]);
    const [isLoadingRelated, setIsLoadingRelated] = useState(false);

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

    // --- Realtime Subscription for Live Updates ---
    useEffect(() => {
        if (!leagueId || !supabaseRef.current) return;

        let channel: RealtimeChannel | null = null;
        let reconnectTimeout: NodeJS.Timeout | null = null;
        let isSubscribed = false;

        const setupChannel = () => {
            // Clean up existing channel
            if (channel) {
                channel.unsubscribe();
                channel = null;
            }

            try {
                channel = supabaseRef.current!
                    .channel(`league_${leagueId}_live_updates`, {
                        config: {
                            presence: { key: `league_${leagueId}` },
                            broadcast: { self: false },
                        }
                    })
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'live_match_updates',
                        filter: `league_id=eq.${leagueId}`
                    }, (payload) => {
                        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                            const update = payload.new as LiveMatchUpdate;
                            setLiveUpdates(prev => ({
                                ...prev,
                                [update.fixture_id]: update
                            }));
                        } else if (payload.eventType === 'DELETE') {
                            const deletedUpdate = payload.old as LiveMatchUpdate;
                            setLiveUpdates(prev => {
                                const newUpdates = { ...prev };
                                delete newUpdates[deletedUpdate.fixture_id];
                                return newUpdates;
                            });
                        }
                    })
                    .on('subscribe', (status) => {
                        if (status === 'SUBSCRIBED') {
                            console.log(`✅ [MatchCalendar] Subscribed successfully to league ${leagueId}`);
                            isSubscribed = true;
                        }
                    })
                    .on('error', (error) => {
                        console.error(`🔴 [MatchCalendar] Channel error for league ${leagueId}:`, error);
                        isSubscribed = false;
                        
                        // Only attempt reconnection if we're still mounted and have a valid leagueId
                        if (leagueId && !reconnectTimeout) {
                            reconnectTimeout = setTimeout(() => {
                                console.log(`🔄 [MatchCalendar] Attempting to reconnect to league ${leagueId}`);
                                reconnectTimeout = null;
                                setupChannel();
                            }, 3000); // Wait 3 seconds before reconnecting
                        }
                    });

                channel.subscribe();
            } catch (error) {
                console.error(`🔴 [MatchCalendar] Failed to setup channel for league ${leagueId}:`, error);
            }
        };

        setupChannel();

        return () => {
            isSubscribed = false;
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
            }
            if (channel) {
                channel.unsubscribe();
                channel = null;
            }
        };
    }, [leagueId, supabaseRef.current]);

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
                 <span className="block font-semibold whitespace-nowrap text-[#00985f] dark:text-[#ff6b00]" style={{ fontSize: '12px' }}>
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
        <div className="p-2 bg-white dark:bg-dark-nav rounded-md shadow-lg text-xs border border-gray-200 dark:border-dark-border max-w-xs">
             <div className="font-semibold mb-1 text-gray-800 dark:text-gray-100">Se kampen på:</div>
             <div className="space-y-1">
                 {providers.map((provider) => (
                     <div key={provider.name} className="flex items-center">
                         <div className="relative h-4 w-4 mr-1.5 flex-shrink-0">
                             {provider.icon && <Image src={provider.icon} alt={provider.name} fill className="object-contain" unoptimized />}
                         </div>
                         <span className="text-[11px] text-gray-700 dark:text-gray-300">{provider.name}</span>
                         {provider.package && <span className="text-gray-500 dark:text-gray-400 ml-1 text-[10px]">({provider.package})</span>}
                     </div>
                 ))}
             </div>
         </div>
    );

    // --- Render Helper for Match Rows ---
    const renderMatchCard = (match: LeagueFixture) => {
        const {
            displayStatus,
            timerComponent,
            isLive,
            isFinished,
            isUpcoming,
            homeScore,
            awayScore,
        } = getMatchDisplayData(match);

        const fixtureIdStr = match.id.toString();
        const isCurrentPageMatch = currentMatchId === fixtureIdStr;
        const linkHref = `/fotball/kamp/${match.id}`;

        return (
            <div key={match.id} className="border border-[#f3f4f6] dark:border-[#232323] rounded-lg overflow-hidden">
                <Link
                    href={linkHref}
                    className={`flex items-center hover:bg-gray-50 dark:hover:bg-[#222222] transition-colors duration-150 py-3 bg-white dark:bg-[#181818] ${
                        isLive ? 'border-l-4 border-l-green-500 dark:border-l-[#ff6b00]' : 'border-l-4 border-l-transparent'
                    }`}
                >
                    {/* Time/Status */}
                    <div className="w-16 flex items-center justify-center flex-shrink-0">
                        {timerComponent ? (
                            timerComponent
                        ) : isFinished ? (
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                {displayStatus}
                            </span>
                        ) : (
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                {displayStatus}
                            </span>
                        )}
                    </div>
                    
                    {/* Teams stacked vertically - with fixed width constraint */}
                    <div className="flex items-center px-2" style={{ width: 'calc(100% - 120px)' }}>
                        <div className="flex flex-col space-y-1 w-full">
                            {/* Home team */}
                            <div className="flex items-center space-x-2">
                                <div className="w-5 h-5 flex-shrink-0 relative">
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
                                <span 
                                    className="text-[#656565] dark:text-[#aaa] overflow-hidden text-ellipsis whitespace-nowrap block"
                                    style={{ fontSize: '14px', fontWeight: '400', maxWidth: 'calc(100% - 32px)' }}
                                    title={match.teams?.home?.name ?? 'N/A'}
                                >
                                    {match.teams?.home?.name ?? 'N/A'}
                                </span>
                            </div>
                            
                            {/* Away team */}
                            <div className="flex items-center space-x-2">
                                <div className="w-5 h-5 flex-shrink-0 relative">
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
                                <span 
                                    className="text-[#656565] dark:text-[#aaa] overflow-hidden text-ellipsis whitespace-nowrap block"
                                    style={{ fontSize: '14px', fontWeight: '400', maxWidth: 'calc(100% - 32px)' }}
                                    title={match.teams?.away?.name ?? 'N/A'}
                                >
                                    {match.teams?.away?.name ?? 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Scores - Fixed position on the right */}
                    <div className="flex flex-col items-center justify-center flex-shrink-0 w-12 ml-auto">
                        {(isFinished || isLive) ? (
                            <>
                                <span className="font-medium text-[#2b2b2b] dark:text-gray-100" style={{ fontSize: '14px' }}>
                                    {homeScore ?? '-'}
                                </span>
                                <span className="font-medium text-[#2b2b2b] dark:text-gray-100" style={{ fontSize: '14px' }}>
                                    {awayScore ?? '-'}
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="text-[#2b2b2b] dark:text-gray-400" style={{ fontSize: '14px' }}>-</span>
                                <span className="text-[#2b2b2b] dark:text-gray-400" style={{ fontSize: '14px' }}>-</span>
                            </>
                        )}
                    </div>
                </Link>
            </div>
        );
    };

    // --- Fetch Related Leagues ---
    useEffect(() => {
        const fetchRelatedLeagues = async () => {
            if (!leagueId) return;
            
            setIsLoadingRelated(true);
            try {
                // First, get the current league's country
                const { data: currentLeague, error: currentLeagueError } = await supabaseRef.current
                    .from('leagues')
                    .select('country')
                    .eq('id', leagueId)
                    .single();

                if (currentLeagueError || !currentLeague) {
                    console.error('Error fetching current league:', currentLeagueError);
                    return;
                }

                // Don't show related leagues if country is "World"
                if (currentLeague.country === 'World') {
                    setRelatedLeagues([]);
                    return;
                }

                // Then, fetch other leagues from the same country (excluding current league)
                const { data: leagues, error: leaguesError } = await supabaseRef.current
                    .from('leagues')
                    .select('id, name, country')
                    .eq('country', currentLeague.country)
                    .neq('id', leagueId)
                    .limit(6); // Limit to 6 related leagues

                if (leaguesError) {
                    console.error('Error fetching related leagues:', leaguesError);
                    return;
                }

                setRelatedLeagues(leagues || []);
            } catch (error) {
                console.error('Error in fetchRelatedLeagues:', error);
            } finally {
                setIsLoadingRelated(false);
            }
        };

        fetchRelatedLeagues();
    }, [leagueId]);

    // Helper function to create league slug
    const createLeagueSlug = (name: string, id: number) => {
        const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .trim();
        return `${slug}-${id}`;
    };

    // --- Main Render ---
    if (!leagueId) {
        return (
            <div className="bg-white dark:bg-dark-nav rounded-lg shadow-md p-4 text-center text-gray-500">
                Ingen liga valgt.
            </div>
        );
    }

    const leagueLogoUrl = `https://viasport.b-cdn.net/football/leagues/${leagueId}.png`;
    
    // Show only first 5 fixtures
    const displayedFixtures = upcomingMatches.slice(0, 5);

    return (
        <div className="bg-[#f9fafb] dark:bg-[#111111] rounded-lg overflow-hidden !mt-0">
            {/* === League Header === */}
            <div className="flex items-center p-4 border-b border-gray-100 dark:border-transparent bg-white dark:bg-[#111111]">
                <div className="relative w-6 h-6 mr-3 flex-shrink-0">
                    <Image
                        src={leagueLogoUrl}
                        alt={leagueName}
                        fill
                        className="object-contain"
                        unoptimized
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                </div>
                <div>
                    <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                        {leagueName}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Kommende kamper
                    </p>
                </div>
            </div>
            {/* === End League Header === */}

            {isLoading && (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">Laster kamper...</div>
            )}
            {error && (
                <div className="p-4 text-center text-red-600 dark:text-red-400">{error}</div>
            )}

            {/* Fixtures Container */}
            {!isLoading && !error && (
                <>
                    {upcomingMatches.length > 0 ? (
                        <div className="space-y-3 pt-3 pb-3">
                            {displayedFixtures.map(match => renderMatchCard(match))}
                        </div>
                    ) : (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                            <div className="text-base font-medium mb-1">Sesongen er ferdig</div>
                            <div className="text-sm">Ny sesong data kommer snart</div>
                        </div>
                    )}
                </>
            )}

            {/* === Related Leagues Section === */}
            {relatedLeagues.length > 0 && (
                <div className="border-t border-gray-100 dark:border-transparent">
                    <div className="pt-4 pb-4">
                        <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-6 tracking-wide">
                            Relevante ligaer
                        </h3>
                        <div className="space-y-1.5">
                            {relatedLeagues.map(league => (
                                <Link
                                    key={league.id}
                                    href={`/fotball/liga/${createLeagueSlug(league.name, league.id)}`}
                                    className="flex items-center p-3 bg-white dark:bg-[#181818] hover:bg-gray-100 dark:hover:bg-[#333333] rounded-lg transition-colors duration-150 border border-[#f3f4f6] dark:border-[#232323]"
                                >
                                    <div className="relative w-8 h-8 mr-3 flex-shrink-0">
                                        <Image
                                            src={`https://viasport.b-cdn.net/football/leagues/${league.id}.png`}
                                            alt={league.name}
                                            fill
                                            className="object-contain dark:brightness-110"
                                            unoptimized
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    </div>
                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                                        {league.name}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* === Tooltip Component === */}
            <Tooltip
                id="streaming-provider-tooltip"
                render={({ content }) => {
                    if (!content) return null;
                    try {
                        const providers = JSON.parse(content) as StreamingProvider[];
                        return renderTooltipContent(providers);
                    } catch (e) {
                        console.error("Failed to parse tooltip content", e);
                        return null;
                    }
                }}
                clickable
                style={{ backgroundColor: 'transparent', padding: 0, zIndex: 50 }}
            />
        </div>
    );
} 
