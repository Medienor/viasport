'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';

// Define the structure of an event (adjust based on your actual data)
interface MatchEvent {
  time: {
    elapsed: number;
    extra?: number | null;
  };
  team: {
    id: number;
    name: string;
    logo: string;
  };
  player: {
    id: number | null;
    name: string | null;
  };
  assist: {
    id: number | null;
    name: string | null;
  };
  type: 'Goal' | 'Card' | 'subst' | string; // Add other types as needed
  detail?: string; // e.g., "Yellow Card", "Red Card", "Normal Goal"
  comments?: string | null; // e.g., "Penalty", "Own Goal"
}

interface LiveMatchEventsProps {
  matchId: number;
  initialEvents: MatchEvent[]; // Pass initial data from server component
  homeTeamId: number;
  awayTeamId: number;
  isLive: boolean;
}

// NEW: Define the Yellow Card SVG component
const YellowCardIcon = ({ width = 12, height = 12, className = "" }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 20 20" // Adjust viewBox if needed based on original SVG dimensions
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Use a fill color directly or via CSS variable if --EventIcons-yellow is defined globally */}
    <path
      d="M12.9092 2.96924H7.091C5.88601 2.96924 4.90918 3.94607 4.90918 5.15106V14.8478C4.90918 16.0528 5.88601 17.0296 7.091 17.0296H12.9092C14.1142 17.0296 15.091 16.0528 15.091 14.8478V5.15106C15.091 3.94607 14.1142 2.96924 12.9092 2.96924Z"
      fill="#facc15" // Example: Tailwind's yellow-400. Replace with your desired yellow or var(--EventIcons-yellow) if defined
    />
  </svg>
);

// NEW: Define the Goal Icon SVG component - Outer circle removed
const GoalIcon = ({ width = 20, height = 20, className = "" }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 20 20" // Keep viewBox, scaling is handled by width/height
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* REMOVED: <rect x="0.5" y="0.5" width="19" height="19" rx="9.5" fill="transparent" /> */}
    {/* REMOVED: <rect x="0.5" y="0.5" width="19" height="19" rx="9.5" stroke="var(--EventIcons-borderColor, #e5e7eb)" /> */}
    {/* Keep the inner football pattern */}
    <g clipPath="url(#clip0_8773_27874)">
      <circle cx="10" cy="10" r="6" fill="white" />
      <path d="M12.1527 12.8534C11.9667 12.8534 11.7807 12.8407 11.5947 12.822C11.535 12.8105 11.4791 12.7847 11.4316 12.7469C11.3841 12.709 11.3465 12.6603 11.322 12.6047C11.13 11.8914 10.944 11.2154 10.764 10.558C10.7309 10.4722 10.7289 10.3774 10.7584 10.2902C10.7878 10.203 10.8469 10.1289 10.9253 10.0807L12.488 8.68071C12.5533 8.62378 12.637 8.59242 12.7237 8.59242C12.8103 8.59242 12.894 8.62378 12.9593 8.68071C13.4836 8.9669 13.9538 9.34256 14.3487 9.79071C14.4382 9.90152 14.4884 10.0389 14.4913 10.1814C14.4945 10.9616 14.2622 11.7247 13.8247 12.3707C13.8202 12.3888 13.8118 12.4056 13.8 12.42C13.7185 12.5308 13.6096 12.6183 13.484 12.674C13.0528 12.7989 12.6055 12.8596 12.1567 12.854L12.1527 12.8534Z" fill="var(--GlobalColorScheme-DefaultColor-black, black)" />
      <path d="M7.10465 11.34C7.02984 11.3408 6.95733 11.3142 6.90065 11.2654C6.41141 10.9692 5.98548 10.5793 5.64732 10.118C5.59205 10.04 5.56182 9.947 5.56065 9.85137C5.56036 9.12375 5.75289 8.40905 6.11865 7.78004C6.12338 7.75725 6.13677 7.73718 6.15598 7.72404C6.2112 7.67488 6.27685 7.63886 6.34798 7.61871C6.777 7.45131 7.23347 7.3654 7.69398 7.36537C7.83638 7.35297 7.97959 7.35297 8.12198 7.36537C8.20282 7.37405 8.27826 7.41012 8.33574 7.46761C8.39323 7.5251 8.42931 7.60054 8.43798 7.68137C8.54932 8.16537 8.67332 8.66137 8.79132 9.15737L8.88465 9.55737C8.90016 9.61795 8.89912 9.68158 8.88165 9.74162C8.86418 9.80166 8.83091 9.85591 8.78532 9.89871L7.34065 11.2534C7.31059 11.2834 7.27481 11.3072 7.23542 11.3232C7.19603 11.3393 7.15384 11.3472 7.11132 11.3467H7.10465V11.34Z" fill="var(--GlobalColorScheme-DefaultColor-black, black)" />
      <path d="M10.0007 3.33337C8.68211 3.33337 7.39318 3.72437 6.29685 4.45691C5.20052 5.18945 4.34604 6.23064 3.84146 7.44882C3.33687 8.66699 3.20485 10.0074 3.46209 11.3006C3.71932 12.5938 4.35426 13.7817 5.28661 14.7141C6.21896 15.6464 7.40685 16.2814 8.70005 16.5386C9.99326 16.7958 11.3337 16.6638 12.5519 16.1592C13.7701 15.6547 14.8112 14.8002 15.5438 13.7038C16.2763 12.6075 16.6673 11.3186 16.6673 10C16.6673 8.23193 15.9649 6.53624 14.7147 5.286C13.4645 4.03575 11.7688 3.33337 10.0007 3.33337ZM10.0813 14.9487L10.044 14.8154C10.0313 14.7242 9.986 14.6407 9.91652 14.5803C9.84704 14.5199 9.75806 14.4866 9.66599 14.4867C8.90137 14.4739 8.1582 14.2319 7.53265 13.792C7.46899 13.7605 7.39905 13.7436 7.32799 13.7427C7.28427 13.7388 7.24023 13.744 7.1986 13.7579C7.15697 13.7718 7.11864 13.7941 7.08599 13.8234L6.63332 14.2514C5.76947 13.5707 5.13338 12.6431 4.8097 11.592C4.48602 10.5409 4.49009 9.41611 4.82138 8.36738C5.15267 7.31864 5.79546 6.39566 6.66423 5.72124C7.53299 5.04683 8.58653 4.65296 9.68465 4.59204L9.75132 4.82737C9.79577 4.9576 9.83288 5.08782 9.86265 5.21804C9.88329 5.27852 9.91751 5.33347 9.9627 5.37866C10.0079 5.42385 10.0628 5.45808 10.1233 5.47871H10.1793C10.9222 5.59096 11.6436 5.81576 12.3187 6.14537C12.3661 6.17132 12.4202 6.18224 12.474 6.17671C12.548 6.17726 12.6207 6.15792 12.6847 6.12071L13.2927 5.69271C14.1813 6.36716 14.8399 7.2998 15.178 8.36295C15.5162 9.4261 15.5175 10.5678 15.1818 11.6317C14.846 12.6956 14.1897 13.6298 13.3025 14.3063C12.4154 14.9828 11.3408 15.3685 10.226 15.4107L10.0813 14.9487Z" fill="var(--GlobalColorScheme-DefaultColor-black, black)" />
    </g>
    <defs>
      <clipPath id="clip0_8773_27874">
        <rect width="16" height="16" fill="transparent" transform="translate(2 2)" />
      </clipPath>
    </defs>
  </svg>
);

// NEW: Define the Substitution Icon SVG component - Border removed
const SubstitutionIcon = ({ width = 20, height = 20, className = "" }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 26 26" // Use the viewBox from the provided SVG
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* REMOVED: <rect x="0.5" y="0.5" width="25" height="25" rx="12.5" stroke="var(--EventIcons-borderColor, #e5e7eb)" /> */}
    <g clipPath="url(#clip0_8880_781)">
      <path d="M17.4168 16.7972H11.5504C11.2915 16.7972 11.0432 16.6944 10.8601 16.5113C10.6771 16.3282 10.5742 16.0799 10.5742 15.821C10.5742 15.5621 10.6771 15.3138 10.8601 15.1308C11.0432 14.9477 11.2915 14.8449 11.5504 14.8449H17.4168V13.0971C17.4154 13.0002 17.4432 12.9052 17.4966 12.8243C17.5499 12.7435 17.6264 12.6805 17.716 12.6437C17.8055 12.6068 17.9042 12.5978 17.999 12.6177C18.0938 12.6377 18.1804 12.6856 18.2476 12.7554L20.959 15.4794C21.0481 15.5727 21.0978 15.6967 21.0978 15.8257C21.0978 15.9547 21.0481 16.0787 20.959 16.172L18.2465 18.897C18.1789 18.9658 18.0924 19.0128 17.9979 19.0321C17.9035 19.0515 17.8054 19.0422 17.7162 19.0055C17.6271 18.9689 17.5509 18.9064 17.4973 18.8263C17.4438 18.7461 17.4154 18.6518 17.4157 18.5554L17.4168 16.7972Z" fill="var(--EventIcons-red, #dc2626)" /> {/* Added fallback red */}
      <path d="M5.05903 9.62234L7.78297 6.8984C7.85014 6.8286 7.93676 6.78062 8.03157 6.76069C8.12637 6.74076 8.22498 6.74981 8.31457 6.78665C8.40417 6.8235 8.48061 6.88644 8.53396 6.9673C8.58732 7.04816 8.61512 7.1432 8.61375 7.24007V8.98783H14.4791C14.738 8.98783 14.9863 9.09068 15.1694 9.27374C15.3524 9.45681 15.4553 9.7051 15.4553 9.964C15.4553 10.2229 15.3524 10.4712 15.1694 10.6543C14.9863 10.8373 14.738 10.9402 14.4791 10.9402H8.61271V12.6879C8.61408 12.7848 8.58628 12.8798 8.53293 12.9607C8.47957 13.0416 8.40313 13.1045 8.31353 13.1414C8.22394 13.1782 8.12533 13.1872 8.03053 13.1673C7.93572 13.1474 7.84911 13.0994 7.78193 13.0296L5.05903 10.3057C4.96985 10.2143 4.91992 10.0917 4.91992 9.964C4.91992 9.83632 4.96985 9.71371 5.05903 9.62234Z" fill="var(--EventIcons-green, #16a34a)" /> {/* Added fallback green */}
    </g>
    <defs>
      <clipPath id="clip0_8880_781">
        <rect width="18" height="18" fill="white" transform="translate(4 4)" />
      </clipPath>
    </defs>
  </svg>
);

// NEW: Define the Red Card Icon SVG component
const RedCardIcon = ({ width = 20, height = 20, className = "" }) => (
  <svg
    width={width}
    height={height}
    // Adjusted viewBox to contain both rectangles based on their coords/dims
    viewBox="0 -2 11 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className} // Pass className for opacity
  >
    {/* Using the provided group, added fallback colors */}
    <g id="yellow-red-card-icon">
      {/* First rectangle (often yellow in a yellow-red scenario, but using yellow var) */}
      <rect id="Rectangle_2316" fill="var(--EventIcons-yellow, #facc15)" fillRule="nonzero" x="0" y="1" width="8" height="11" rx="2"></rect>
      {/* Second rectangle (red) */}
      <rect id="Rectangle_3201" fill="var(--EventIcons-red, #dc2626)" fillRule="nonzero" x="3" y="-2" width="8" height="11" rx="2"></rect>
    </g>
  </svg>
);

// Helper to get event icon OR component
const getEventIcon = (event: MatchEvent): React.ReactElement | string => {
  if (event.type === 'Goal') return <GoalIcon />;
  if (event.type === 'Card') {
    if (event.detail === 'Yellow Card') return <YellowCardIcon />;
    if (event.detail === 'Red Card') return <RedCardIcon />;
    return "/images/channels/red.svg";
  }
  if (event.type === 'subst') return <SubstitutionIcon />;
  return "/images/channels/whistle.svg";
};

// Helper to render event details - Accepts alignment prop
const renderEventDetails = (event: MatchEvent, align: 'left' | 'right' = 'left') => {
  const scoreRegex = /(\d+\s*-\s*\d+)/;
  const scoreMatch = event.comments?.match(scoreRegex);
  const score = scoreMatch ? scoreMatch[1] : null;
  // Determine alignment class based on the prop
  const alignmentClass = align === 'right' ? 'justify-end' : 'justify-start';

  switch (event.type) {
    case 'Goal':
      return (
        <div className="flex flex-col gap-0.5">
          <div className={`flex items-center gap-2 ${alignmentClass}`}>
            <Link
              href={event.player.id ? `/spillerprofil/${event.player.id}` : '#'}
              className={`text-sm font-medium ${event.player.id ? 'hover:text-blue-600 dark:hover:text-blue-400' : 'pointer-events-none'} dark:text-gray-200`}
            >
              {event.player.name || 'Ukjent Spiller'}
            </Link>
            {score && (
              <span className="text-sm font-semibold text-green-600">({score})</span>
            )}
          </div>
          {event.assist?.name && (
            <div className={`flex items-center gap-1 ${alignmentClass}`}>
              <span className="text-xs text-gray-500 dark:text-gray-400">assist by</span>
              <Link
                href={event.assist.id ? `/spillerprofil/${event.assist.id}` : '#'}
                className={`text-xs text-gray-600 dark:text-gray-300 font-medium ${event.assist.id ? 'hover:text-blue-600 dark:hover:text-blue-400' : 'pointer-events-none'}`}
              >
                {event.assist.name}
              </Link>
            </div>
          )}
        </div>
      );
    case 'Card':
      return (
        <div className={`flex items-center gap-2 ${alignmentClass}`}>
          <Link
            href={event.player.id ? `/spillerprofil/${event.player.id}` : '#'}
            className={`text-sm font-medium ${event.player.id ? 'hover:text-blue-600 dark:hover:text-blue-400' : 'pointer-events-none'} dark:text-gray-200`}
          >
            {event.player.name || 'Ukjent Spiller'}
          </Link>
        </div>
      );
    case 'subst':
      return (
        <div className="flex flex-col gap-1">
          <div className={`flex items-center gap-2 ${alignmentClass}`}>
            <Link
              href={event.assist?.id ? `/spillerprofil/${event.assist.id}` : '#'}
              className={`text-sm text-green-600 ${event.assist?.id ? 'hover:text-green-700 dark:hover:text-green-500' : 'pointer-events-none'}`}
            >
              {event.assist?.name || 'Ukjent Spiller'}
            </Link>
          </div>
          <div className={`flex items-center gap-2 ${alignmentClass}`}>
            <Link
              href={event.player.id ? `/spillerprofil/${event.player.id}` : '#'}
              className={`text-sm text-red-600 ${event.player.id ? 'hover:text-red-700 dark:hover:text-red-500' : 'pointer-events-none'}`}
            >
              {event.player.name || 'Ukjent Spiller'}
            </Link>
          </div>
        </div>
      );
    default:
      return <span className={`block text-sm text-gray-500 dark:text-gray-400 ${align === 'right' ? 'text-right' : 'text-left'}`}>{event.type} - {event.detail || event.comments || ''}</span>;
  }
};

const LiveMatchEvents: React.FC<LiveMatchEventsProps> = ({
  matchId,
  initialEvents,
  homeTeamId,
  awayTeamId,
  isLive,
}) => {
  const supabase = useMemo(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [events, setEvents] = useState<MatchEvent[]>(initialEvents || []);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const timeA = (a.time.elapsed || 0) + (a.time.extra || 0);
      const timeB = (b.time.elapsed || 0) + (b.time.extra || 0);
      return timeA - timeB;
    });
  }, [events]);

  useEffect(() => {
    setEvents(initialEvents || []);

    console.log(`Setting up real-time subscription for fixture: ${matchId}`);

    const channel = supabase
      .channel(`fixture_events_${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'fixtures',
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          console.log('Real-time event update received:', payload);
          if (payload.new && payload.new.event_data) {
             const newEvents = Array.isArray(payload.new.event_data) ? payload.new.event_data : [];
             console.log('Updating events state with:', newEvents);
             setEvents(newEvents as MatchEvent[]);
          } else {
             console.log('No event_data found in payload or payload.new is missing.');
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Successfully subscribed to fixture ${matchId} events!`);
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error(`Subscription error for fixture ${matchId}:`, status, err);
        }
      });

    return () => {
      console.log(`Unsubscribing from fixture ${matchId} events.`);
      supabase.removeChannel(channel);
    };
  }, [matchId, initialEvents]);

  const showKickoff = true;
  const timeCircleBaseClasses = "flex items-center justify-center w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex-shrink-0";
  const timeTextClasses = "text-sm font-semibold text-black dark:text-gray-100";

  return (
    <div className="mt-2 bg-white dark:bg-[#222222] rounded-lg p-4">
      <div className="text-center mb-4">
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 inline-block">
          Kamphendelser
          {isLive && (
            <span className="text-[10px] text-green-600 font-bold align-middle ml-1.5 tracking-wide">
              LIVE
            </span>
          )}
        </h3>
      </div>
      <div className="relative flex flex-col items-center">
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-gray-200 dark:bg-gray-700 transform -translate-x-1/2 z-0 hidden md:block" />

        <div className="w-full space-y-4 relative z-10 px-2">
          {showKickoff && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center my-2"
            >
              <div className="flex md:hidden justify-self-start text-sm text-gray-500 dark:text-gray-400 py-2">
                 Avspark
              </div>
              <div className="hidden md:flex justify-center md:col-start-2 z-10">
                 <div className={`${timeCircleBaseClasses}`}>
                    <span className={timeTextClasses}>0'</span>
                 </div>
              </div>
               <div className="flex md:hidden justify-self-end"></div>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {sortedEvents.map((event, index) => {
              const isHomeEvent = event.team.id === homeTeamId;
              const key = `${event.time.elapsed}-${event.type}-${event.player.name}-${index}`;
              const iconElementOrPath = getEventIcon(event);
              const isSvgComponent = typeof iconElementOrPath !== 'string';

              let iconSize = 12;
              let wrapperSize = 'w-6 h-6';
              if (isSvgComponent) {
                 if (event.type === 'Goal') { iconSize = 20; wrapperSize = 'w-8 h-8'; }
                 else if (event.type === 'Card') { iconSize = 20; wrapperSize = 'w-8 h-8'; }
                 else if (event.type === 'subst') { iconSize = 22; wrapperSize = 'w-8 h-8'; }
              }
              const iconWrapperClasses = `flex-shrink-0 flex items-center justify-center ${wrapperSize} rounded-full border border-gray-200 dark:border-gray-500 bg-white dark:bg-gray-700`;
              const eventTimeText = `${event.time.elapsed}'${event.time.extra ? `+${event.time.extra}` : ''}`;

              return (
                <motion.div
                  key={key}
                  layout
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-x-2 md:gap-x-4"
                >
                  <div className={`flex items-center gap-2 ${isHomeEvent ? 'justify-self-start md:col-start-1 md:justify-self-auto justify-start md:justify-end' : 'opacity-0 pointer-events-none justify-self-start md:col-start-1'}`}>
                    {isHomeEvent && (
                      <>
                        <div className={`${timeCircleBaseClasses} flex md:hidden order-1`}>
                          <span className={timeTextClasses}>{eventTimeText}</span>
                        </div>
                        <div className={`${iconWrapperClasses} order-2`}>
                          {isSvgComponent ? React.cloneElement(iconElementOrPath as React.ReactElement, { width: iconSize, height: iconSize }) : <Image src={iconElementOrPath as string} alt={event.type} width={iconSize} height={iconSize} />}
                        </div>
                        <div className="order-3 md:order-1 md:text-right flex-grow">
                          {renderEventDetails(event, 'right')}
                        </div>
                      </>
                    )}
                     {!isHomeEvent && <div className="md:hidden">&nbsp;</div>}
                  </div>

                  <div className="hidden md:flex justify-center z-10 md:col-start-2">
                     <div className={timeCircleBaseClasses}>
                        <span className={timeTextClasses}>{eventTimeText}</span>
                     </div>
                  </div>

                  <div className={`flex items-center gap-2 ${!isHomeEvent ? 'justify-self-end md:col-start-3 md:justify-self-auto justify-end md:justify-start' : 'opacity-0 pointer-events-none justify-self-end md:col-start-3'}`}>
                    {!isHomeEvent && (
                      <>
                        <div className="order-1 md:order-2 md:text-left flex-grow">
                          {renderEventDetails(event, 'left')}
                        </div>
                        <div className={`${iconWrapperClasses} order-2 md:order-1`}>
                           {isSvgComponent ? React.cloneElement(iconElementOrPath as React.ReactElement, { width: iconSize, height: iconSize }) : <Image src={iconElementOrPath as string} alt={event.type} width={iconSize} height={iconSize} />}
                        </div>
                        <div className={`${timeCircleBaseClasses} flex md:hidden order-3`}>
                           <span className={timeTextClasses}>{eventTimeText}</span>
                        </div>
                      </>
                    )}
                     {isHomeEvent && <div className="md:hidden">&nbsp;</div>}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default LiveMatchEvents;
