'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Label,
  Text,
} from 'recharts';
import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import Image from 'next/image';

// --- Interfaces ---
interface MatchEventAssist {
  id: number | null;
  name: string | null;
}

interface MatchEventPlayer {
  id: number | null;
  name: string | null;
}

interface MatchEventTeam {
  id: number;
  name: string;
  logo?: string;
}

interface MatchEvent {
  time: {
    elapsed: number;
    extra?: number | null;
  };
  team: MatchEventTeam;
  type: string;
  detail?: string;
  player?: MatchEventPlayer;
  assist?: MatchEventAssist;
  comments?: string | null;
}

interface PossessionDataPoint {
  time: number;
  /** Home Possession % - 50%. Positive = Home > 50%, Negative = Away > 50% */
  value: number;
}

interface RawPossessionDataPoint {
  time: number;
  home: number | null;
  away: number | null;
}

interface ProcessedPossessionDataPoint {
  time: number;
  value: number;
}

interface MomentumChartProps {
  matchId: number;
  homeTeamId: number;
  awayTeamId: number;
  teamColors: {
    home: string;
    away: string;
  };
  matchStatusShort: string | null | undefined;
  matchStartDate: string | null | undefined;
}

// --- Constants ---
const BASE_MAX_TIME = 90; // Base max time for regular match
const ET_MAX_TIME = 120; // Max time if extra time occurs

// --- Component ---
export default function MomentumChart({
  matchId,
  homeTeamId,
  awayTeamId,
  teamColors,
  matchStatusShort,
  matchStartDate,
}: MomentumChartProps) {
  const [possessionData, setPossessionData] = useState<RawPossessionDataPoint[]>([]);
  const [eventData, setEventData] = useState<MatchEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentElapsedTime, setCurrentElapsedTime] = useState<number | null>(null);
  const [activeTime, setActiveTime] = useState<string | number | null>(null);
  const [activeX, setActiveX] = useState<number | null>(null);
  const [chartWidth, setChartWidth] = useState(0);
  const [timelineVisible, setTimelineVisible] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Add state for the custom tooltip
  const [activeGoal, setActiveGoal] = useState<{
    player: string;
    playerId: number | null;
    team: string;
    score: string;
    position: { x: number, y: number };
  } | null>(null);

  const isLive = useMemo(() =>
    matchStatusShort && ['1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE', 'INT', 'SUSP'].includes(matchStatusShort),
    [matchStatusShort]
  );

  // Refs for Supabase client and channel
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Data Fetching and Realtime Subscription ---
  useEffect(() => {
    // Initialize Supabase client if not already done
    if (!supabaseRef.current) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.error("🔴 ERROR: Supabase URL or Public Anon Key is missing.");
        setError("Configuration error: Missing Supabase URL or Key.");
        setIsLoading(false);
        return;
      }
      supabaseRef.current = createClient(supabaseUrl, supabaseAnonKey);
    }
    const supabase = supabaseRef.current;

    setIsLoading(true);
    setError(null);
    setPossessionData([]);
    setEventData([]);

    // --- Function to set up subscription (for retries) ---
    const setupSubscription = () => {
      // Clean up existing channel before creating a new one
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current).catch(err => console.warn("Error removing previous channel:", err));
        channelRef.current = null;
      }
      // Clear any pending retry timeouts
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      console.log(`Attempting to subscribe to realtime channel for match ${matchId}...`);
      channelRef.current = supabase
        .channel(`match_updates_${matchId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'fixtures',
            filter: `id=eq.${matchId}`,
          },
          (payload) => {
            console.log('Realtime update received:', payload);
            setError(null); // Clear error on successful message

            // Handle possession data updates
            const newPossessionData = payload.new?.ball_possession;
            if (newPossessionData && Array.isArray(newPossessionData)) {
              setPossessionData(newPossessionData as RawPossessionDataPoint[]);
            }

            // Handle event data updates
            const newEventData = payload.new?.event_data;
            if (newEventData && Array.isArray(newEventData)) {
              setEventData(newEventData as MatchEvent[]);
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log(`✅ Realtime channel subscribed for match ${matchId}`);
            setError(null); // Clear error on successful subscription
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error(`❌ Realtime channel error for match ${matchId}: Status: ${status}`, err); // Log specific error
            setError(`Realtime connection issue (${status}). Retrying...`); // Update error message

            // --- Simple Retry Logic ---
            // Clear existing timeout before setting a new one
            if (retryTimeoutRef.current) {
              clearTimeout(retryTimeoutRef.current);
            }
            // Retry after 5 seconds
            retryTimeoutRef.current = setTimeout(() => {
              console.log(`Retrying subscription for match ${matchId}...`);
              setupSubscription();
            }, 5000);
            // --- End Retry Logic ---
          }
          if (status === 'CLOSED') {
             console.log(`Realtime channel closed for match ${matchId}.`);
             // Optionally attempt retry on explicit close as well, depending on desired behavior
          }
        });
    };
    // --- End Function to set up subscription ---


    // Fetch initial data
    const fetchInitialData = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('fixtures')
          .select('ball_possession, event_data')
          .eq('id', matchId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: Row not found, not necessarily an error here
          console.error('Error fetching initial data:', fetchError);
          setError('Could not load initial match data.');
          setPossessionData([]);
          setEventData([]);
        } else if (data) {
          // Handle possession data
          if (Array.isArray(data.ball_possession)) {
            setPossessionData(data.ball_possession as RawPossessionDataPoint[]);
          } else {
            console.warn("Fetched ball_possession is not an array:", data.ball_possession);
            setPossessionData([]);
          }
          // Handle event data
          if (Array.isArray(data.event_data)) {
            setEventData(data.event_data as MatchEvent[]);
          } else {
            console.warn("Fetched event_data is not an array:", data.event_data);
            setEventData([]);
          }
        } else {
          // No data found (e.g., PGRST116)
          setPossessionData([]);
          setEventData([]);
        }
      } catch (e) {
         console.error("Exception during initial data fetch:", e);
         setError("Failed to process initial data.");
      } finally {
         setIsLoading(false); // Ensure loading is set to false
      }
    };

    fetchInitialData().then(() => {
        // Only set up subscription after initial data attempt
        if (!channelRef.current) { // Avoid setting up multiple times if effect runs fast
            setupSubscription();
        }
    });


    // Cleanup function
    return () => {
      console.log(`Cleaning up realtime channel for match ${matchId}...`);
      // Clear any pending retry timeout on cleanup
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      // Remove the channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
          .then(() => console.log(`Realtime channel successfully removed for match ${matchId}`))
          .catch(err => console.error("Error removing channel on cleanup:", err));
        channelRef.current = null;
      }
    };
  }, [matchId]); // Re-run effect if matchId changes

  // --- Live Timer ---
  useEffect(() => {
    let timerId: NodeJS.Timeout | null = null;
    const calculateElapsedTime = () => {
      if (!matchStartDate || !matchStatusShort) return null;
      const start = new Date(matchStartDate).getTime();
      const now = Date.now();
      let elapsedMillis = now - start;

      // Simplified pause handling (needs refinement for accuracy)
      if (matchStatusShort === '2H' || matchStatusShort === 'ET' || matchStatusShort === 'P') {
         const halfTimeBreakMillis = 15 * 60 * 1000;
         // Estimate start of 2nd half (more accurate with HT event time if available)
         const estimatedStartSecondHalf = start + 45 * 60 * 1000 + halfTimeBreakMillis;
         if (now >= estimatedStartSecondHalf) {
             elapsedMillis = (45 * 60 * 1000) + (now - estimatedStartSecondHalf);
         } else {
             elapsedMillis = 45 * 60 * 1000; // Still in HT break
         }
      }
      const elapsedMinutes = Math.floor(elapsedMillis / (60 * 1000));
      if (matchStatusShort === '1H' && elapsedMinutes > 45) return 45;
      if (matchStatusShort === 'HT') return 45;
      if (matchStatusShort === '2H' && elapsedMinutes > 90) return 90;
      // Add caps for ET etc.
      return Math.max(0, elapsedMinutes);
    };

    if (isLive && matchStatusShort !== 'HT') {
      setCurrentElapsedTime(calculateElapsedTime());
      timerId = setInterval(() => {
        setCurrentElapsedTime(calculateElapsedTime());
      }, 30000);
    } else if (matchStatusShort === 'HT') {
        setCurrentElapsedTime(45);
    } else {
      setCurrentElapsedTime(null);
    }
    return () => { if (timerId) clearInterval(timerId); };
  }, [isLive, matchStartDate, matchStatusShort]);

  // --- Update chart width on resize ---
  useEffect(() => {
    const updateChartWidth = () => {
      if (chartContainerRef.current) {
        const width = chartContainerRef.current.offsetWidth;
        setChartWidth(width);
        
        // Only show timeline when we have a valid width
        if (width > 0 && !timelineVisible) {
          setTimelineVisible(true);
        }
      }
    };

    // Initial width
    updateChartWidth();
    
    // Force multiple updates to ensure markers are positioned correctly
    const timers = [
      setTimeout(updateChartWidth, 100),
      setTimeout(updateChartWidth, 300),
      setTimeout(updateChartWidth, 500)
    ];

    // Add resize listener
    window.addEventListener('resize', updateChartWidth);
    
    return () => {
      window.removeEventListener('resize', updateChartWidth);
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [timelineVisible]);

  // --- Constants for Rendering ---
  const chartHeight = 230;
  const timelineHeight = 40; // Height for the timeline overlay
  const margin = { top: 20, right: 15, left: 15, bottom: 30 };
  const xAxisDy = 15;
  const dynamicLabelY = chartHeight - margin.bottom + xAxisDy;

  // --- Process Data for Chart & Calculate Domains ---
  const { processedData, yDomain, maxTimeInData, chartMaxTime } = useMemo(() => {
    // Ensure possessionData is valid before processing
    if (!Array.isArray(possessionData) || possessionData.length === 0) {
      return { processedData: [], yDomain: [-30, 30] as [number, number], maxTimeInData: 0, chartMaxTime: BASE_MAX_TIME };
    }

    // Filter, transform, and sort
    const validData: ProcessedPossessionDataPoint[] = possessionData
      .filter(p => p.time !== null && p.time >= 0 && p.home !== null && p.away !== null)
      .map(p => {
        // Calculate the difference from 50% but amplify smaller differences
        // This creates more visible variations in the chart
        const rawValue = p.home! - 50;
        
        // Apply a non-linear transformation to amplify smaller differences
        // This makes the chart more dynamic with more visible ups and downs
        let amplifiedValue = rawValue;
        
        // For small values (between -15 and 15), amplify them to create more variation
        if (Math.abs(rawValue) < 15) {
          // Amplify small differences more aggressively
          amplifiedValue = rawValue * 1.5;
        } else {
          // For larger differences, apply a more moderate amplification
          const sign = Math.sign(rawValue);
          amplifiedValue = sign * (15 + (Math.abs(rawValue) - 15) * 0.8);
        }
        
        return {
          time: p.time,
          value: amplifiedValue,
        };
      })
      .sort((a, b) => a.time - b.time);
    
    // Check if we need to add initial data points
    let dataWithFilledGaps = [...validData];
    
    // If the first data point is not at minute 0, add initial points
    if (validData.length > 0 && validData[0].time > 0) {
      const firstPoint = validData[0];
      const initialValue = firstPoint.value; // Use the first available value
      
      // Add points at 0 and halfway to the first point
      dataWithFilledGaps = [
        { time: 0, value: initialValue },
        { time: firstPoint.time / 2, value: initialValue },
        ...validData
      ];
    }
    
    // Apply smoothing for better visual appearance but preserve more variation
    const smoothedData = dataWithFilledGaps.map((point, index, array) => {
      if (index === 0 || index === array.length - 1) return point;
      
      // Use a weighted average that preserves more of the current point's value
      // This creates smoother transitions while maintaining more variation
      const prevValue = array[index - 1].value;
      const nextValue = array[index + 1].value;
      
      return {
        time: point.time,
        // Weight the current point more heavily (50%) to preserve variations
        value: (prevValue * 0.25 + point.value * 0.5 + nextValue * 0.25)
      };
    });

    // Add more variation by introducing small oscillations
    const enhancedData = smoothedData.map((point, index, array) => {
      if (index === 0 || index === array.length - 1) return point;
      
      // Add a small oscillation based on the point's position in the array
      // This creates more natural-looking waves
      const oscillation = Math.sin(index * 0.5) * 2; // Small sine wave oscillation
      
      return {
        time: point.time,
        value: point.value + oscillation
      };
    });

    if (enhancedData.length === 0) {
       // Default domain if no valid data after filtering
       return { processedData: [], yDomain: [-30, 30] as [number, number], maxTimeInData: 0, chartMaxTime: BASE_MAX_TIME };
    }

    // Rest of the function remains the same
    const dataValues = enhancedData.map(p => p.value);
    const latestDataPoint = enhancedData[enhancedData.length - 1];
    const currentMaxTimeInData = latestDataPoint ? latestDataPoint.time : 0;

    // Fixed domain for consistent scaling
    const yMin = -30;
    const yMax = 30;
    const finalYDomain = [yMin, yMax] as [number, number];

    // --- Determine X-Axis Max Time ---
    let potentialMaxTime = BASE_MAX_TIME; // Default to 90
    if (currentMaxTimeInData > BASE_MAX_TIME + 2 || ['ET', 'P', 'BT', 'AET', 'PEN'].includes(matchStatusShort ?? '')) {
        potentialMaxTime = ET_MAX_TIME; // Extend to 120 if ET likely/confirmed or data goes beyond 92
    }

    // Ensure the chart always shows slightly beyond the latest data point or live time
    const liveTimeCap = currentElapsedTime ? Math.min(currentElapsedTime + 2, potentialMaxTime) : 0;
    const dataTimeCap = Math.min(currentMaxTimeInData + 2, potentialMaxTime);
    const finalChartMaxTime = Math.max(potentialMaxTime, dataTimeCap, liveTimeCap, 10);

    return {
      processedData: enhancedData,
      yDomain: finalYDomain,
      maxTimeInData: currentMaxTimeInData,
      chartMaxTime: finalChartMaxTime,
    };
  }, [possessionData, matchStatusShort, currentElapsedTime]);

  // --- X-Axis Ticks and Formatting ---
  const xAxisTicks = useMemo(() => {
      const ticks = [0, 45, 90];
      // Filter ticks to be within the chart's max time
      return ticks.filter(t => t <= chartMaxTime);
  }, [chartMaxTime]);

  const formatXAxis = (tickItem: number) => {
    if (tickItem === 0) return "0'";
    if (tickItem === 45) return 'HT';
    if (tickItem === 90) return 'FT';
    return `${tickItem}'`;
  };

  // --- Render Timeline Markers Directly ---
  const renderTimelineMarkers = () => {
    if (chartWidth <= 0) return null;
    
    const startX = margin.left;
    const endX = chartWidth - margin.right;
    const availableWidth = endX - startX;
    
    const timeToPosition = (time: number) => {
      return startX + (time / chartMaxTime) * availableWidth;
    };
    
    const markers = [];
    const markerSize = 6;
    const startY = chartHeight - timelineHeight/2;
    
    const keyMoments = [0, 15, 30, 45, 60, 75, 90];
    
    for (let time = 0; time <= chartMaxTime; time += 5) {
      const isKeyMoment = keyMoments.includes(time);
      const xPos = timeToPosition(time);
      
      markers.push(
        <div 
          key={`marker-${time}`}
          style={{
            position: 'absolute',
            left: `${xPos}px`,
            top: `${startY - (isKeyMoment ? markerSize/2 : markerSize/4)}px`,
            width: `${isKeyMoment ? markerSize : markerSize/2}px`,
            height: `${isKeyMoment ? markerSize : markerSize/2}px`,
            borderRadius: '50%',
            backgroundColor: isKeyMoment ? '#333' : '#aaa',
            transform: 'translate(-50%, -50%)',
            zIndex: isKeyMoment ? 2 : 1,
            opacity: activeTime !== null ? 
              (Math.abs((activeTime as number) - time) < 2.5 ? 1 : 0.3) : 
              (isKeyMoment ? 1 : 0.5),
            transition: 'opacity 0.2s ease',
            fontFamily: 'Geist, sans-serif'
          }}
        />
      );
      
      if (isKeyMoment) {
        let label = time === 45 ? 'HT' : time === 90 ? 'FT' : `${time}'`;
        markers.push(
          <div
            key={`label-${time}`}
            style={{
              position: 'absolute',
              left: `${xPos}px`,
              top: `${startY + markerSize + 2}px`,
              fontSize: '10px',
              fontWeight: 'bold',
              color: '#333',
              transform: 'translate(-50%, 0)',
              opacity: activeTime !== null ? 
                (Math.abs((activeTime as number) - time) < 10 ? 1 : 0.3) : 1,
              transition: 'opacity 0.2s ease',
              fontFamily: 'Geist, sans-serif'
            }}
          >
            {label}
          </div>
        );
      }
    }
    
    return markers;
  };

  // --- Mouse Handlers for Hover Label ---
  const handleMouseMove = (state: any) => {
    if (state.isTooltipActive && state.activeCoordinate && state.activeLabel) {
      const timeLabel = typeof state.activeLabel === 'string' ? parseFloat(state.activeLabel) : state.activeLabel;
      // Only show hover label if it's within the actual data range
      if (timeLabel <= maxTimeInData) {
          setActiveX(state.activeCoordinate.x);
          setActiveTime(timeLabel);
      } else {
          setActiveX(null);
          setActiveTime(null);
      }
    } else {
      setActiveX(null);
      setActiveTime(null);
    }
  };
  
  const handleMouseLeave = () => {
    setActiveX(null);
    setActiveTime(null);
  };

  // Add a new CSS class for the blinking animation
  useEffect(() => {
    // Add the CSS for the blinking animation to the document head
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes blink-animation {
        0% { opacity: 1; }
        50% { opacity: 0.4; }
        100% { opacity: 1; }
      }
      .live-indicator {
        animation: blink-animation 2s infinite;
      }
    `;
    document.head.appendChild(style);
    
    // Clean up
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Add a function to render event markers
  const renderEventMarkers = useCallback(() => {
    if (!eventData || eventData.length === 0 || chartWidth <= 0) return null;
    
    const startX = margin.left;
    const endX = chartWidth - margin.right;
    const availableWidth = endX - startX;
    
    const timeToPosition = (time: number) => {
      return startX + (time / chartMaxTime) * availableWidth;
    };
    
    // Filter for goals only
    const goalEvents = eventData.filter(event => event.type === 'Goal');
    
    // Sort goals by time to calculate score
    const sortedGoals = [...goalEvents].sort((a, b) => 
      (a.time.elapsed + (a.time.extra || 0)) - (b.time.elapsed + (b.time.extra || 0))
    );
    
    // Calculate running score for each goal
    let homeScore = 0;
    let awayScore = 0;
    const goalsWithScore = sortedGoals.map(goal => {
      if (goal.team.id === homeTeamId) {
        homeScore++;
      } else {
        awayScore++;
      }
      return {
        ...goal,
        score: `${homeScore} - ${awayScore}`
      };
    });
    
    return goalsWithScore.map((event, index) => {
      const time = event.time.elapsed + (event.time.extra || 0);
      const xPos = timeToPosition(time);
      const isHomeTeam = event.team.id === homeTeamId;
      
      // Position at the bottom of the chart
      const yPos = chartHeight - timelineHeight - 20;
      
      // Slight horizontal offset based on team to prevent overlap
      const teamOffset = isHomeTeam ? -5 : 5;
      
      const playerName = event.player?.name || 'Unknown';
      const playerId = event.player?.id || null;
      const teamName = event.team.name;
      const score = event.score;
      
      return (
        <div
          key={`goal-${index}-${event.time.elapsed}`}
          style={{
            position: 'absolute',
            left: `${xPos + teamOffset}px`,
            top: `${yPos}px`,
            width: '22px', // Increased size to accommodate border
            height: '22px', // Increased size to accommodate border
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'translate(-50%, -50%)',
            zIndex: 6,
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
            backgroundColor: 'white', // White background
            borderRadius: '50%', // Make it circular
            border: '2px solid white', // 2px white border
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)' // Subtle shadow for depth
          }}
          onMouseEnter={() => setActiveGoal({
            player: playerName,
            playerId: playerId,
            team: teamName,
            score: score,
            position: { x: xPos + teamOffset, y: yPos - 10 }
          })}
          onMouseLeave={() => setActiveGoal(null)}
        >
          <Image 
            src="/images/channels/ball.svg" 
            alt="Goal" 
            width={14} 
            height={14} 
          />
        </div>
      );
    });
  }, [eventData, chartWidth, chartMaxTime, margin.left, margin.right, homeTeamId, chartHeight, timelineHeight]);

  // --- Render ---
  if (isLoading) {
    return <div style={{ height: chartHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontFamily: 'Geist, sans-serif' }}>Loading possession data...</div>;
  }
  if (error) {
     return <div style={{ height: chartHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red', fontFamily: 'Geist, sans-serif' }}>{error}</div>;
  }

  return (
    <div 
      ref={chartContainerRef}
      style={{ 
        width: '100%', 
        height: '210px', // Reduced from 270px to 210px
        position: 'relative',
        marginBottom: '10px',
        fontFamily: 'Geist, sans-serif'
      }}
    >
      <div 
        style={{ 
          width: '100%', 
          height: `${(chartHeight / (chartHeight + timelineHeight)) * 100}%`, // Maintain chart proportion
          position: 'relative',
          minWidth: '0px'
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={processedData}
            margin={margin}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <XAxis
              dataKey="time"
              type="number"
              domain={[0, chartMaxTime]}
              ticks={xAxisTicks}
              tickFormatter={formatXAxis}
              axisLine={false}
              tickLine={false}
              tick={false}
              height={30}
              padding={{ left: 10, right: 10 }}
              allowDataOverflow={true}
            />

            <YAxis
              hide
              domain={yDomain}
              allowDataOverflow={true}
            />

            {/* Custom tooltip that doesn't render anything visible */}
            <Tooltip 
              cursor={false}
              content={() => null}
              isAnimationActive={false}
              filterNull={true}
            />

            {/* Reference lines */}
            <ReferenceLine x={45} stroke="#e0e0e0" strokeDasharray="3 3" />
            <ReferenceLine y={0} stroke="#e0e0e0" strokeWidth={1} />

            {/* Home Team Area (Positive Values) */}
            <Area
              type="monotone"
              dataKey={(dataPoint) => dataPoint.value > 0 ? dataPoint.value : 0}
              stroke="none"
              fill={teamColors.home}
              fillOpacity={0.95}
              isAnimationActive={false}
              baseValue={0}
              connectNulls={true}
            />
            
            {/* Away Team Area (Negative Values) */}
            <Area
              type="monotone"
              dataKey={(dataPoint) => dataPoint.value < 0 ? dataPoint.value : 0}
              stroke="none"
              fill={teamColors.away}
              fillOpacity={0.95}
              isAnimationActive={false}
              baseValue={0}
              connectNulls={true}
            />

            {/* Live Time Indicator Line */}
            {isLive && currentElapsedTime !== null && currentElapsedTime <= chartMaxTime && (
              <ReferenceLine
                x={currentElapsedTime}
                stroke="rgba(0, 0, 0, 0.5)"
                strokeWidth={1}
                strokeDasharray="3 3"
                key={`live-${currentElapsedTime}`}
              >
                <Label 
                  value={`${currentElapsedTime}'`} 
                  position="top" 
                  fill="rgba(0, 0, 0, 0.7)" 
                  fontSize={10} 
                  dy={-5} 
                />
              </ReferenceLine>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* Event markers */}
      {renderEventMarkers()}
      
      {/* Custom Goal Tooltip */}
      {activeGoal && (
        <div
          style={{
            position: 'absolute',
            left: `${activeGoal.position.x}px`,
            top: `${activeGoal.position.y - 10}px`,
            transform: 'translate(-50%, -100%)',
            backgroundColor: 'white',
            borderRadius: '6px',
            padding: '8px 12px',
            boxShadow: 'rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.04) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.04) 0px 6px 6px -3px, rgba(14, 63, 126, 0.04) 0px 12px 12px -6px, rgba(14, 63, 126, 0.04) 0px 24px 24px -12px',
            zIndex: 10,
            minWidth: '140px',
            pointerEvents: 'none',
            border: '1px solid rgba(0,0,0,0.1)',
            fontFamily: 'Geist, sans-serif',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          {/* Player Image */}
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '50%',
            overflow: 'hidden',
            flexShrink: 0,
            backgroundColor: '#f3f4f6',
            border: '1px solid #e5e7eb' // Very light grey border
          }}>
            {activeGoal.playerId ? (
              <Image
                src={`https://media.api-sports.io/football/players/${activeGoal.playerId}.png`}
                alt={activeGoal.player}
                width={32}
                height={32}
                style={{ objectFit: 'cover' }}
                onError={(e) => {
                  // Fallback if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <div style={{ 
                width: '100%', 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '12px',
                color: '#9ca3af'
              }}>
                ?
              </div>
            )}
          </div>
          
          {/* Goal Info */}
          <div>
            <div style={{ 
              fontWeight: 'bold', 
              fontSize: '14px',
              marginBottom: '2px',
              color: '#333'
            }}>
              Goal ({activeGoal.score})
            </div>
            <div style={{ 
              fontSize: '13px',
              color: '#555'
            }}>
              {activeGoal.player}
            </div>
          </div>
        </div>
      )}
      
      {/* Live indicator dot - positioned at the right edge of the chart */}
      {isLive && currentElapsedTime !== null && currentElapsedTime <= chartMaxTime && chartWidth > 0 && (
        <div
          className="live-indicator"
          style={{
            position: 'absolute',
            left: `${margin.left + (currentElapsedTime / chartMaxTime) * (chartWidth - margin.left - margin.right)}px`,
            top: `${chartHeight - timelineHeight - 10}px`, // Position at the bottom edge of the chart area
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#22c55e', // Green color
            border: '1px solid rgba(255, 255, 255, 0.7)',
            boxShadow: '0 0 4px rgba(34, 197, 94, 0.7)',
            transform: 'translate(-50%, -50%)',
            zIndex: 5
          }}
        />
      )}
      
      {/* Timeline overlay with markers and events */}
      <div
        style={{
          position: 'static',
          width: '100%',
          height: `${timelineHeight}px`,
          bottom: 0,
          marginTop: '5px',
          display: 'block',
          visibility: 'visible',
          overflow: 'visible'
        }}
      >
        {/* Force render timeline markers directly */}
        {chartWidth > 0 && renderTimelineMarkers()}
        
        {/* Fixed position tooltip that follows only X-axis */}
        {activeTime !== null && activeX !== null && (
          <div style={{
            position: 'absolute',
            left: `${activeX}px`,
            top: '0',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            zIndex: 10
          }}>
            <div style={{
              width: '1px',
              height: '100%',
              backgroundColor: 'rgba(0,0,0,0.2)',
            }} />
            <div style={{
              position: 'absolute',
              top: '0',
              left: '50%',
              transform: 'translate(-50%, 0)',
              backgroundColor: 'white',
              color: '#333',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid rgba(0,0,0,0.05)',
              fontFamily: 'Geist, sans-serif'
            }}>
              {`${Math.round(activeTime as number)}' minute`}
            </div>
          </div>
        )}
      </div>
      
      {/* Show message overlay if chart is rendered but has no data yet */}
      {processedData.length === 0 && !isLoading && !error && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: timelineHeight,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#999', fontSize: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
          fontFamily: 'Geist, sans-serif'
        }}>
          Waiting for possession data...
        </div>
      )}
    </div>
  );
}