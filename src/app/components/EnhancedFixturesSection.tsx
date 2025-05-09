"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  format, parseISO, isSameDay, isValid as isValidDateFns,
  addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, getDate, getYear, getMonth
} from 'date-fns';
import { nb } from 'date-fns/locale';
import { getStreamingProviders } from '@/utils/channelUtils';
import { useRouter, usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';

interface EnhancedFixturesSectionProps {
  fixtures: {[key: string]: any[]};
  formattedDates: {[key: string]: string};
  totalFixtureCount: {[key: string]: number};
  popularLeagueIds: number[];
  initialSelectedDateString: string;
}

type FilterType = 'today' | 'live' | 'tv' | 'upcoming';

interface LiveMatch {
  id: number;
  status: {
    short: string;
    elapsed: number | null;
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  lastUpdated: number; // timestamp of when this data was last updated
}

export default function EnhancedFixturesSection({
  fixtures: newFixtures,
  formattedDates,
  totalFixtureCount,
  popularLeagueIds,
  initialSelectedDateString
}: EnhancedFixturesSectionProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [activeFilter, setActiveFilter] = useState<FilterType>('today');
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const parsedInitial = parseISO(initialSelectedDateString);
    return isValidDateFns(parsedInitial) ? parsedInitial : new Date();
  });
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [liveMatches, setLiveMatches] = useState<{[key: number]: LiveMatch}>({});
  const [isLoadingLiveData, setIsLoadingLiveData] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const parsedDate = parseISO(initialSelectedDateString);
    if (isValidDateFns(parsedDate) && !isSameDay(selectedDate, parsedDate)) {
      setSelectedDate(parsedDate);
    }
  }, [initialSelectedDateString, selectedDate]);

  const fetchMatchData = async () => {
    try {
      setIsLoadingLiveData(true);
      
      const response = await fetch('/api/football/live');
      
      if (!response.ok) {
        throw new Error('Failed to fetch match data');
      }
      
      const data = await response.json();
      // console.log('API Response:', data); // Debug: Log the full response
      
      const newLiveMatchesMap: {[key: number]: LiveMatch} = {};
      const now = Date.now();
      
      // Process live matches
      data.live?.forEach((match: any) => {
        // console.log('Processing live match:', match.league.id, match.fixture.id); // Debug
        if (popularLeagueIds.includes(match.league.id)) {
          newLiveMatchesMap[match.fixture.id] = {
            id: match.fixture.id,
            status: {
              short: match.fixture.status.short,
              elapsed: match.fixture.status.elapsed
            },
            goals: {
              home: match.goals.home,
              away: match.goals.away
            },
            lastUpdated: now
          };
        }
      });
      
      // Process finished matches
      data.finished?.forEach((match: any) => {
        // console.log('Processing finished match:', match.league.id, match.fixture.id); // Debug
        if (popularLeagueIds.includes(match.league.id)) {
          newLiveMatchesMap[match.fixture.id] = {
            id: match.fixture.id,
            status: {
              short: match.fixture.status.short,
              elapsed: null
            },
            goals: {
              home: match.goals.home,
              away: match.goals.away
            },
            lastUpdated: now
          };
        }
      });
      
      // console.log('Processed match data:', newLiveMatchesMap); // Debug
      // console.log('Popular league IDs:', popularLeagueIds); // Debug
      
      setLiveMatches(newLiveMatchesMap);
      
    } catch (error) {
      console.error('Error fetching match data:', error);
    } finally {
      setIsLoadingLiveData(false);
    }
  };

  useEffect(() => {
    fetchMatchData();
    
    // Set up interval for regular updates
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      fetchMatchData();
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [popularLeagueIds]);

  const handleDateOrFilterChange = (newDate: Date, newFilter?: FilterType) => {
    setSelectedDate(newDate);
    if (newFilter) {
      setActiveFilter(newFilter);
    } else {
      setActiveFilter('today');
    }

    const newSearchParams = new URLSearchParams();
    newSearchParams.set('date', format(newDate, 'yyyy-MM-dd'));

    router.push(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
  };

  const groupFixturesByLeague = (dateFixtures: any[]) => {
    if (!Array.isArray(dateFixtures)) return {};
    return dateFixtures.reduce((acc, fixture) => {
      if (!fixture?.league?.id) return acc;
      const leagueId = fixture.league.id;
      if (!acc[leagueId]) {
        acc[leagueId] = {
          league: fixture.league,
          fixtures: []
        };
      }
      acc[leagueId].fixtures.push(fixture);
      return acc;
    }, {});
  };

  const getSectionTitle = () => {
    const todayDate = new Date();
    const tomorrowDate = new Date();
    tomorrowDate.setDate(todayDate.getDate() + 1);

    if (activeFilter === 'live') return 'Pågående kamper';
    if (activeFilter === 'tv') return 'Kamper på TV';
    if (activeFilter === 'upcoming' && isSameDay(selectedDate, tomorrowDate)) return 'Kamper i morgen';
    if (activeFilter === 'today' && isSameDay(selectedDate, todayDate)) return 'Kamper i dag';
    
    return 'Kamper';
  };

  const getFormattedDate = () => {
    return format(selectedDate, 'd. MMMM yyyy', { locale: nb });
  };

  const getMatchStatus = (fixture: any) => {
    const fixtureId = fixture.fixture.id;
    const liveMatch = liveMatches[fixtureId];
    
    console.log('Match status check:', {
      fixtureId,
      hasLiveData: !!liveMatch,
      liveMatchData: liveMatch,
      timestamp: new Date().toISOString()
    });
    
    const isFinished = liveMatch?.status.short === 'FT';
    const isLive = liveMatch && ['1H', 'HT', '2H', 'ET', 'P', 'LIVE'].includes(liveMatch.status.short);
    
    return { isLive, isFinished };
  };

  const getMatchData = (fixture: any) => {
    const fixtureId = fixture.fixture.id;
    const liveMatch = liveMatches[fixtureId];
    
    if (liveMatch) {
      return {
        id: fixtureId,
        status: liveMatch.status,
        goals: liveMatch.goals,
        lastUpdated: Date.now()
      };
    }
    
    return null;
  };

  const getFixturesToDisplay = () => {
    const currentDayFixtures = newFixtures.today || [];
    const nextDayFixtures = newFixtures.day1 || [];

    switch (activeFilter) {
      case 'today':
        return currentDayFixtures;
      case 'live':
        return currentDayFixtures.filter(fixture => getMatchStatus(fixture).isLive);
      case 'tv':
        return currentDayFixtures.filter(fixture =>
          getStreamingProviders(fixture.league.id).length > 0
        );
      case 'upcoming':
        return nextDayFixtures;
      default:
        return currentDayFixtures;
    }
  };

  const fixturesToDisplay = getFixturesToDisplay();
  const groupedFixtures = groupFixturesByLeague(fixturesToDisplay);

  useEffect(() => {
    console.log('Current fixtures (from props):', newFixtures);
    console.log('Live matches state:', liveMatches);
    console.log('Fixtures to display (processed):', fixturesToDisplay.length);
    console.log('Selected Date in Client:', selectedDate);
  }, [newFixtures, liveMatches, fixturesToDisplay, selectedDate]);

  const CalendarIcon = () => {
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [viewingMonthDate, setViewingMonthDate] = useState(selectedDate || new Date());
    const [isClient, setIsClient] = useState(false);
    const [isMobileView, setIsMobileView] = useState(false);

    useEffect(() => {
      setIsClient(true);
      const handleResize = () => {
        setIsMobileView(window.innerWidth < 640);
      };
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
      if (selectedDate && (getMonth(selectedDate) !== getMonth(viewingMonthDate) || getYear(selectedDate) !== getYear(viewingMonthDate))) {
        setViewingMonthDate(selectedDate);
      }
    }, [selectedDate]);

    const toggleCalendar = () => setIsCalendarOpen(!isCalendarOpen);

    const goToPreviousMonth = () => {
      setViewingMonthDate(prev => subMonths(prev, 1));
    };

    const goToNextMonth = () => {
      setViewingMonthDate(prev => addMonths(prev, 1));
    };

    const handleDayClick = (day: Date) => {
      handleDateOrFilterChange(day);
      setIsCalendarOpen(false);
    };

    const firstDayOfViewingMonth = startOfMonth(viewingMonthDate);
    const lastDayOfViewingMonth = endOfMonth(viewingMonthDate);

    const daysInCalendar = eachDayOfInterval({
      start: startOfWeek(firstDayOfViewingMonth, { locale: nb }),
      end: endOfWeek(lastDayOfViewingMonth, { locale: nb }),
    });

    const today = new Date();

    const weekdays = eachDayOfInterval({
      start: startOfWeek(new Date(), { locale: nb }),
      end: endOfWeek(new Date(), { locale: nb }),
    }).map(day => format(day, 'EEE', { locale: nb }).toUpperCase());

    const calendarActualContent = (
      <div
        className="w-[19rem] bg-white dark:bg-[#2C2C2E] rounded-lg shadow-xl p-3 border border-gray-200 dark:border-neutral-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-1 pt-1 pb-3">
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {format(viewingMonthDate, 'MMMM yyyy', { locale: nb })}
          </div>
          <div className="flex">
            <button
              onClick={goToPreviousMonth}
              className="p-1.5 rounded-full text-gray-600 hover:text-black hover:bg-gray-200 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous month"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button
              onClick={goToNextMonth}
              className="p-1.5 rounded-full text-gray-600 hover:text-black hover:bg-gray-200 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed ml-1"
              aria-label="Next month"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px text-center mb-2">
          {weekdays.map(weekday => (
            <div key={weekday} className="text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase py-1">
              {weekday.substring(0,3)}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px">
          {daysInCalendar.map((day, index) => {
            const dayNumber = getDate(day);
            const isCurrentMonthDay = isSameMonth(day, viewingMonthDate);
            const isDaySelected = selectedDate && isSameDay(day, selectedDate);
            const isDayToday = isSameDay(day, today);

            let dayClasses = "text-sm rounded-full w-8 h-8 flex items-center justify-center transition-colors duration-150 cursor-pointer";

            if (isDaySelected) {
              dayClasses += " bg-[#ff6b00] text-white font-semibold dark:bg-white dark:text-black dark:font-medium";
            } else if (isCurrentMonthDay) {
              dayClasses += " text-gray-700 hover:bg-gray-100 dark:text-white dark:hover:bg-neutral-700";
              if (isDayToday) {
                dayClasses += " font-semibold dark:ring-1 dark:ring-neutral-600";
              }
            } else {
              dayClasses += " text-gray-400 dark:text-neutral-500 cursor-default";
            }
            
            return (
              <button
                key={index}
                onClick={() => isCurrentMonthDay && handleDayClick(day)}
                className={dayClasses}
                disabled={!isCurrentMonthDay && !isDaySelected}
              >
                {dayNumber}
              </button>
            );
          })}
        </div>
      </div>
    );

    const calendarButton = (
        <button
          onClick={toggleCalendar}
          className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-full transition-colors duration-150"
          aria-label="Open date picker"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 dark:text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </button>
    );

    let calendarPopup = null;
    if (isCalendarOpen && isClient) {
      if (isMobileView) {
        calendarPopup = createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm bg-black/70"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsCalendarOpen(false);
              }
            }}
          >
            {calendarActualContent}
          </div>,
          document.body
        );
      } else {
        calendarPopup = (
          <div
            className="absolute right-0 mt-2 z-20"
          >
            {calendarActualContent}
          </div>
        );
      }
    }

    return (
      <div className="relative inline-block">
        {calendarButton}
        {calendarPopup}
      </div>
    );
  };

  return (
    <div className="relative">
      <div className="border-b border-gray-200 dark:border-[#333333]">
        <div className="flex justify-between items-center">
          <div className="flex overflow-x-auto">
            <button
              className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap ${
                activeFilter === 'today' && isSameDay(selectedDate, new Date())
                  ? 'text-[#ff6b00] dark:text-white border-b-2 border-[#ff6b00] dark:border-[#ff6b00]'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
              }`}
              onClick={() => handleDateOrFilterChange(new Date(), 'today')}
            >
              I dag
            </button>
            <button
              className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap ${
                activeFilter === 'live'
                  ? 'text-[#ff6b00] dark:text-white border-b-2 border-[#ff6b00] dark:border-[#ff6b00]'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
              }`}
              onClick={() => handleDateOrFilterChange(new Date(), 'live')}
            >
              Pågående
            </button>
            <button
              className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap ${
                activeFilter === 'tv'
                  ? 'text-[#ff6b00] dark:text-white border-b-2 border-[#ff6b00] dark:border-[#ff6b00]'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
              }`}
              onClick={() => handleDateOrFilterChange(new Date(), 'tv')}
            >
              På TV
            </button>
            <button
              className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap ${
                activeFilter === 'upcoming' && isSameDay(selectedDate, (() => { const t = new Date(); t.setDate(t.getDate() + 1); return t; })())
                  ? 'text-[#ff6b00] dark:text-white border-b-2 border-[#ff6b00] dark:border-[#ff6b00]'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
              }`}
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(new Date().getDate() + 1);
                handleDateOrFilterChange(tomorrow, 'upcoming');
              }}
            >
              I morgen
            </button>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-[#333333]">
        <div className="px-3 lg:px-4 py-2 lg:py-3 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-[#181818]/90 backdrop-blur-sm z-10">
          <div className="flex items-baseline">
            <h2 className="text-base lg:text-lg font-semibold dark:text-white">{getSectionTitle()}</h2>
            <span className="ml-2 text-xs lg:text-sm text-gray-500 dark:text-gray-400">{getFormattedDate()}</span>
          </div>
          <CalendarIcon />
        </div>
        
        {isLoadingLiveData && <div className="p-4 text-center text-gray-500 dark:text-gray-400">Laster live data...</div>}
        
        {!isLoadingLiveData && Object.keys(groupedFixtures).length === 0 ? (
          <div className="p-6 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Ingen kamper</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Det er ingen kamper å vise for valgt dato eller filter.
            </p>
          </div>
        ) : (
          Object.values(groupedFixtures).map((group: any) => (
            <div key={group.league.id} className="py-3">
              <div className="px-3 lg:px-4 pb-2 flex items-center">
                {group.league.logo && (
                  <Image src={group.league.logo} alt={group.league.name} width={16} height={16} className="mr-2 h-4 w-4"/>
                )}
                <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">
                  {group.league.name}
                </h3>
              </div>
              <div className="space-y-px">
                {group.fixtures.map((fixture: any) => {
                  const matchData = getMatchData(fixture);
                  const { isLive, isFinished } = getMatchStatus(fixture);
                  const fixtureId = fixture.fixture.id;
                  const fixtureHref = `/fotball/kamp/${fixtureId}`;

                  return (
                    <Link 
                      key={fixtureId}
                      href={fixtureHref}
                      className="flex items-center justify-between px-3 lg:px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#2C2C2E] transition-colors duration-150"
                    >
                      <div className="w-8 lg:w-10 text-center flex-shrink-0 mr-1 lg:mr-2"> 
                        {isLive && matchData ? (
                          <span className="text-xs lg:text-sm font-semibold text-[#099460] dark:text-[#ff6b00]"> 
                            {matchData.status.elapsed !== null ? `${matchData.status.elapsed}'` : matchData.status.short}
                          </span>
                        ) : isFinished && matchData ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] lg:text-xs font-semibold bg-gray-100 dark:bg-[#333333] text-gray-700 dark:text-gray-300 border border-gray-200/80 dark:border-[#444444]">
                            {matchData.status.short}
                          </span>
                        ) : (
                          <span className="text-xs lg:text-sm font-medium text-gray-500 dark:text-gray-400">
                            {fixture.formattedTime}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex-1 grid grid-cols-[1fr,auto,1fr] items-center gap-1 lg:gap-2 min-w-0"> 
                        <div className="flex items-center justify-end space-x-1.5 lg:space-x-2 truncate">
                          <span className="text-xs lg:text-sm font-medium text-right truncate text-gray-800 dark:text-[#AAAAAA]">
                            {fixture.teams.home.name}
                          </span>
                          <div className="relative h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0">
                            <Image
                              src={fixture.teams.home.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')}
                              alt={fixture.teams.home.name}
                              fill
                              sizes="(max-width: 1024px) 16px, 20px"
                              className="object-contain dark:brightness-110"
                              unoptimized
                            />
                          </div>
                        </div>
                        
                        <div className="w-10 lg:w-12 text-center flex-shrink-0">
                          {(isLive || isFinished) && matchData ? (
                            <span className="text-xs lg:text-sm font-bold text-gray-800 dark:text-gray-100"> 
                              {matchData.goals.home !== null && matchData.goals.away !== null 
                                ? `${matchData.goals.home} - ${matchData.goals.away}` 
                                : '-'}
                            </span>
                          ) : (
                            <span className="text-xs lg:text-sm text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-start space-x-1.5 lg:space-x-2 truncate">
                          <div className="relative h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0">
                            <Image
                              src={fixture.teams.away.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')}
                              alt={fixture.teams.away.name}
                              fill
                              sizes="(max-width: 1024px) 16px, 20px"
                              className="object-contain dark:brightness-110"
                              unoptimized
                            />
                          </div>
                          <span className="text-xs lg:text-sm font-medium text-left truncate text-gray-800 dark:text-[#AAAAAA]">
                            {fixture.teams.away.name}
                          </span>
                        </div>
                      </div>
                      
                      {getStreamingProviders(fixture.league.id).length > 0 && (
                        <div className="ml-1 lg:ml-2 relative group flex-shrink-0">
                          <div className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 lg:h-5 lg:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          
                          <div className="absolute z-20 right-0 w-48 p-2 mt-1 bg-white dark:bg-[#222222] rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 text-xs border border-gray-200 dark:border-[#333333]">
                            <div className="font-semibold mb-1 dark:text-gray-100">Se kampen på:</div>
                            <div className="space-y-1">
                              {getStreamingProviders(fixture.league.id).map((provider, index) => (
                                <div key={index} className="flex items-center">
                                  <div className="relative h-4 w-4 mr-1.5">
                                    <Image
                                      src={provider.icon}
                                      alt={provider.name}
                                      fill
                                      className="object-contain dark:brightness-110"
                                      unoptimized
                                    />
                                  </div>
                                  <span className="text-[11px] dark:text-gray-200">{provider.name}</span>
                                  {provider.package && (
                                    <span className="text-gray-500 dark:text-gray-400 ml-1 text-[10px]">({provider.package})</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 