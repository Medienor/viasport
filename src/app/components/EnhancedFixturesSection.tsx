"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface FixtureStatus {
  short: string;
  elapsed: number | null;
  long?: string | null;
}

interface FixtureGoals {
  home: number | null;
  away: number | null;
}

interface FixtureScore {
  halftime: FixtureGoals | null;
  fulltime: FixtureGoals | null;
  extratime?: FixtureGoals | null;
  penalty?: FixtureGoals | null;
}

interface FixtureData {
  fixture: {
    id: number;
    date: string;
    status: FixtureStatus;
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    round?: string;
  };
  teams: {
    home: { id: number; name: string; logo: string };
    away: { id: number; name: string; logo: string };
  };
  goals: FixtureGoals;
  score?: FixtureScore;
  formattedTime: string;
  event_data?: any[];
}

interface EnhancedFixturesSectionProps {
  fixtures: {[key: string]: FixtureData[]};
  formattedDates: {[key: string]: string};
  totalFixtureCount: {[key: string]: number};
  popularLeagueIds: number[];
  initialSelectedDateString: string;
}

type FilterType = 'today' | 'live' | 'tv' | 'upcoming' | 'favorites';

interface LiveMatch {
  id: number;
  status: FixtureStatus;
  goals: FixtureGoals;
  lastUpdated: number;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cdynfbwdwdfsiwkgixua.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

let supabase: SupabaseClient | null = null;
if (typeof window !== 'undefined') {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

// Helper function to safely manage localStorage
const manageFavorites = {
  save: (favorites: Set<number>) => {
    if (typeof window === 'undefined') return;
    
    try {
      const favoritesArray = Array.from(favorites);
      
      // Limit to reasonable number of favorites (e.g., 500)
      const limitedFavorites = favoritesArray.slice(-500);
      
      const dataToStore = JSON.stringify(limitedFavorites);
      
      // Check if data size is reasonable (less than 1MB)
      if (dataToStore.length > 1024 * 1024) {
        console.warn('Favorites data too large, limiting to 100 most recent');
        const veryLimitedFavorites = favoritesArray.slice(-100);
        localStorage.setItem('viasport-favorites', JSON.stringify(veryLimitedFavorites));
        return new Set(veryLimitedFavorites);
      }
      
      localStorage.setItem('viasport-favorites', dataToStore);
      return favorites;
      
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, cleaning up...');
        
        try {
          // Clear other potential localStorage items that might be taking space
          const keysToCheck = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key !== 'viasport-favorites') {
              keysToCheck.push(key);
            }
          }
          
          // Remove old/large items
          keysToCheck.forEach(key => {
            try {
              const item = localStorage.getItem(key);
              if (item && item.length > 10000) { // Remove items larger than 10KB
                localStorage.removeItem(key);
              }
            } catch (e) {
              localStorage.removeItem(key);
            }
          });
          
          // Try again with limited favorites
          const limitedFavorites = Array.from(favorites).slice(-50);
          localStorage.setItem('viasport-favorites', JSON.stringify(limitedFavorites));
          return new Set(limitedFavorites);
          
        } catch (retryError) {
          console.error('Failed to save favorites after cleanup:', retryError);
          return favorites;
        }
      } else {
        console.error('Error saving favorites:', error);
        return favorites;
      }
    }
  },
  
  load: (): Set<number> => {
    if (typeof window === 'undefined') return new Set();
    
    try {
      const savedFavorites = localStorage.getItem('viasport-favorites');
      if (savedFavorites) {
        const favoriteIds = JSON.parse(savedFavorites);
        
        // Validate the data
        if (Array.isArray(favoriteIds) && favoriteIds.every(id => typeof id === 'number' && id > 0)) {
          return new Set(favoriteIds);
        } else {
          console.warn('Invalid favorites data format, clearing...');
          localStorage.removeItem('viasport-favorites');
        }
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      try {
        localStorage.removeItem('viasport-favorites');
      } catch (clearError) {
        console.error('Error clearing corrupted favorites:', clearError);
      }
    }
    
    return new Set();
  }
};

export default function EnhancedFixturesSection({
  fixtures: initialFixtures,
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
  const [liveMatches, setLiveMatches] = useState<{[key: number]: LiveMatch}>({});
  const [isClient, setIsClient] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [currentFixtures, setCurrentFixtures] = useState(initialFixtures);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [tooltipData, setTooltipData] = useState<{
    show: boolean;
    text: string;
    x: number;
    y: number;
  }>({ show: false, text: '', x: 0, y: 0 });
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    showViewButton: boolean;
  }>({ show: false, message: '', showViewButton: false });

  useEffect(() => {
    setCurrentFixtures(initialFixtures);
  }, [initialFixtures]);

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

  useEffect(() => {
    if (!supabase) {
      console.warn("Supabase client not initialized. Realtime updates disabled.");
      return;
    }

    const handleFixtureUpdate = (payload: any) => {
      console.log('Realtime update received:', payload);
      const updatedFixture = payload.new;
      if (updatedFixture && updatedFixture.id) {
        const supStatus = updatedFixture.status as { short: string; elapsed: number | null; long?: string; extra?: any } | null;
        const supScore = updatedFixture.score as FixtureScore | null;
        const supGoals = updatedFixture.goals as FixtureGoals | null;

        let currentGoals: FixtureGoals = { home: null, away: null };
        let statusShort = supStatus?.short || 'NS';
        let elapsed = supStatus?.elapsed ?? null;

        if (statusShort === 'FT' && supScore?.fulltime) {
          currentGoals = supScore.fulltime;
        } else if (statusShort === 'HT' && supScore?.halftime) {
          currentGoals = supScore.halftime;
        } else if (supGoals) {
          currentGoals = supGoals;
        }

        setLiveMatches(prevLiveMatches => ({
          ...prevLiveMatches,
          [updatedFixture.id]: {
            id: updatedFixture.id,
            status: {
              short: statusShort,
              elapsed: elapsed,
              long: supStatus?.long
            },
            goals: currentGoals,
            lastUpdated: Date.now()
          }
        }));

        setCurrentFixtures(prevFixtures => {
            const newFixtures = { ...prevFixtures };
            for (const dayKey in newFixtures) {
                const dayFixtures = newFixtures[dayKey];
                const fixtureIndex = dayFixtures.findIndex(f => f.fixture.id === updatedFixture.id);
                if (fixtureIndex !== -1) {
                    const updatedDayFixture = {
                        ...dayFixtures[fixtureIndex],
                        fixture: {
                            ...dayFixtures[fixtureIndex].fixture,
                            status: { short: statusShort, elapsed: elapsed, long: supStatus?.long },
                        },
                        goals: currentGoals,
                        score: supScore || dayFixtures[fixtureIndex].score,
                    };
                    newFixtures[dayKey] = [
                        ...dayFixtures.slice(0, fixtureIndex),
                        updatedDayFixture,
                        ...dayFixtures.slice(fixtureIndex + 1),
                    ];
                    break; 
                }
            }
            return newFixtures;
        });
      }
    };

    const fixturesChannel = supabase
      .channel('realtime-fixtures')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'fixtures' },
        handleFixtureUpdate
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'fixtures' },
        (payload) => {
            console.log('Realtime insert received:', payload);
        }
       )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to Supabase Realtime fixtures updates!');
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error('Supabase Realtime subscription error/closed:', status, err);
        }
      });

    return () => {
      if (fixturesChannel) {
        supabase?.removeChannel(fixturesChannel);
        console.log('Unsubscribed from Supabase Realtime fixtures updates.');
      }
    };
  }, [supabase]);

  // Load favorites from localStorage on mount
  useEffect(() => {
    const loadedFavorites = manageFavorites.load();
    setFavorites(loadedFavorites);
  }, []);

  // Save favorites to localStorage whenever favorites change
  useEffect(() => {
    const updatedFavorites = manageFavorites.save(favorites);
    if (updatedFavorites !== favorites) {
      setFavorites(updatedFavorites);
    }
  }, [favorites]);

  // Handle tooltip hide with immediate effect
  const hideTooltip = useCallback(() => {
    setTooltipData(prev => ({ ...prev, show: false }));
  }, []);

  // Toggle favorite status with notification and hide tooltip
  const toggleFavorite = useCallback((fixtureId: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Immediately hide tooltip when clicking
    setTooltipData(prev => ({ ...prev, show: false }));
    
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      const wasAdded = !newFavorites.has(fixtureId);
      
      if (newFavorites.has(fixtureId)) {
        newFavorites.delete(fixtureId);
        setNotification({
          show: true,
          message: 'Fjernet fra favoritter',
          showViewButton: false
        });
      } else {
        newFavorites.add(fixtureId);
        setNotification({
          show: true,
          message: 'Lagt til favoritter',
          showViewButton: true
        });
      }
      
      setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 4000);
      
      return newFavorites;
    });
  }, []);

  // Handle tab/filter changes and hide tooltip
  const handleDateOrFilterChange = useCallback((date?: Date, filter?: FilterType) => {
    // Hide tooltip when changing tabs
    setTooltipData(prev => ({ ...prev, show: false }));
    
    if (date) {
      setSelectedDate(date);
    }
    if (filter) {
      setActiveFilter(filter);
    }
  }, []);

  // Separate function for just filter changes
  const handleFilterChange = useCallback((filter: FilterType) => {
    setTooltipData(prev => ({ ...prev, show: false }));
    setActiveFilter(filter);
  }, []);

  // Separate function for just date changes
  const handleDateChange = useCallback((date: Date) => {
    setTooltipData(prev => ({ ...prev, show: false }));
    setSelectedDate(date);
  }, []);

  // Handle "Vis" button click in notification
  const handleViewFavorites = useCallback(() => {
    handleFilterChange('favorites');
    setNotification(prev => ({ ...prev, show: false }));
  }, [handleFilterChange]);

  const groupFixturesByLeague = useCallback((dateFixtures: FixtureData[]) => {
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
  }, []);

  const getSectionTitle = () => {
    if (activeFilter === 'favorites') {
      return `Favoritter (${favorites.size})`;
    }
    
    switch (activeFilter) {
      case 'today':
        return 'Dagens kamper';
      case 'live':
        return 'Pågående kamper';
      case 'tv':
        return 'Kamper på TV';
      case 'upcoming':
        return 'Kommende kamper';
      default:
        return 'Kamper';
    }
  };

  const getFormattedDate = () => {
    return format(selectedDate, 'd. MMMM yyyy', { locale: nb });
  };

  const getMatchData = useCallback((fixture: FixtureData) => {
    const fixtureId = fixture.fixture.id;
    const liveMatch = liveMatches[fixtureId];

    if (liveMatch) {
      return {
        id: fixtureId,
        status: liveMatch.status,
        goals: liveMatch.goals,
        lastUpdated: liveMatch.lastUpdated
      };
    }
    return {
      id: fixtureId,
      status: fixture.fixture.status,
      goals: fixture.goals,
      lastUpdated: 0
    };
  }, [liveMatches]);

  const getFixturesToDisplay = useCallback(() => {
    let dateKey = 'today';
    const today = new Date();
    if (isSameDay(selectedDate, today)) {
      dateKey = 'today';
    } else {
      const diffTime = selectedDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0 && diffDays <= 6) {
        dateKey = `day${diffDays}`;
      } else {
        const dayKeys = Object.keys(currentFixtures);
        const targetDateStr = format(selectedDate, 'yyyy-MM-dd');

        for (const key of dayKeys) {
          if (currentFixtures[key] && currentFixtures[key].length > 0) {
            const fixtureDateStr = format(parseISO(currentFixtures[key][0].fixture.date), 'yyyy-MM-dd');
            if (fixtureDateStr === targetDateStr) {
              dateKey = key;
              break;
            }
          }
        }
      }
    }
    
    const relevantDayFixtures = currentFixtures[dateKey] || [];

    switch (activeFilter) {
      case 'today':
        return currentFixtures.today || [];
      case 'live':
        return (currentFixtures.today || []).filter(f => {
          const matchData = getMatchData(f);
          return matchData && ['1H', 'HT', '2H', 'ET', 'P', 'LIVE'].includes(matchData.status.short);
        });
      case 'tv':
        return (currentFixtures.today || []).filter(fixture =>
          getStreamingProviders(fixture.league.id).length > 0
        );
      case 'upcoming':
        return currentFixtures.day1 || [];
      case 'favorites':
        // Get all fixtures from all days and filter by favorites
        const allFixtures = Object.values(currentFixtures).flat();
        const favoriteFixtures = allFixtures.filter(fixture => 
          favorites.has(fixture.fixture.id)
        );
        
        // Clean up favorites that no longer exist in current fixtures
        const existingFixtureIds = new Set(allFixtures.map(f => f.fixture.id));
        const validFavorites = new Set(
          Array.from(favorites).filter(id => existingFixtureIds.has(id))
        );
        
        // Update favorites if we found invalid ones
        if (validFavorites.size !== favorites.size) {
          setFavorites(validFavorites);
        }
        
        return favoriteFixtures;
      default:
        return relevantDayFixtures;
    }
  }, [currentFixtures, selectedDate, activeFilter, favorites, setFavorites]);

  const fixturesToDisplay = getFixturesToDisplay();
  const groupedFixtures = groupFixturesByLeague(fixturesToDisplay);

  useEffect(() => {
    console.log('Current fixtures (state):', currentFixtures);
    console.log('Live matches state:', liveMatches);
    console.log('Fixtures to display (processed):', fixturesToDisplay.length);
    console.log('Selected Date in Client:', selectedDate);
  }, [currentFixtures, liveMatches, fixturesToDisplay, selectedDate]);

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
      handleDateChange(day);
      setIsCalendarOpen(false);
      
      // Navigate to the new date to trigger server-side data fetch
      const dateString = format(day, 'yyyy-MM-dd');
      router.push(`${pathname}?date=${dateString}`);
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
        className="w-[19rem] bg-white dark:bg-[#2C2C2E] rounded-lg shadow-xl p-3 border border-gray-200 dark:border-neutral-700 animate-in slide-in-from-top-2 fade-in duration-200"
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
          className="p-2 hover:bg-gray-100 dark:hover:bg-[#222] rounded-full transition-colors duration-150"
          aria-label="Open date picker"
        >
          <div className="relative w-5 h-5 sm:w-6 sm:h-6">
            <svg 
              className="w-full h-full text-gray-600 dark:text-gray-300" 
              viewBox="0 0 323.358 323.358" 
              fill="currentColor"
            >
              <path d="m48.863 323.358h225.632c23.653 0 42.875-19.222 42.875-42.875v-213.656c0-23.653-19.222-42.875-42.875-42.875h-17.006v-11.976c0-6.587-5.39-11.976-11.977-11.976s-11.976 5.389-11.976 11.976v11.976h-143.714v-11.976c0-6.587-5.39-11.976-11.977-11.976s-11.976 5.389-11.976 11.976v11.976h-17.006c-23.653 0-42.875 19.222-42.875 42.875v213.656c0 23.653 19.222 42.875 42.875 42.875zm-18.922-256.531c0-10.419 8.503-18.922 18.922-18.922h17.006v11.976c0 6.587 5.389 11.976 11.976 11.976s11.976-5.389 11.976-11.976v-11.976h143.715v11.976c0 6.587 5.389 11.976 11.976 11.976s11.976-5.389 11.976-11.976v-11.976h17.006c10.419 0 18.922 8.503 18.922 18.922v34.971h-263.475zm0 58.923h263.477v154.733c0 10.419-8.503 18.922-18.922 18.922h-225.633c-10.419 0-18.922-8.503-18.922-18.922z"/>
            </svg>
            
            {/* Day number positioned in the lower area of the calendar */}
            <div className="absolute inset-0 flex items-center justify-center" style={{ marginTop: '30%' }}>
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300 leading-none">
                {format(selectedDate, 'd')}
              </span>
            </div>
          </div>
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
            className="absolute right-0 mt-2 z-20 animate-in slide-in-from-top-2 fade-in duration-200"
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

  // Handle tooltip show
  const showTooltip = useCallback((event: React.MouseEvent, isFavorite: boolean) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipData({
      show: true,
      text: isFavorite ? 'Fjern kampen fra favoritter' : 'Legg kampen til favoritter',
      x: rect.left + rect.width / 2,
      y: rect.top - 16
    });
  }, []);

  return (
    <div className="relative">
      {/* Top header section with tabs and title - stays in original container */}
      <div className="border-b border-gray-200 dark:border-[#333333]">
        <div className="flex justify-between items-center">
          <div className="flex overflow-x-auto">
            <button
              className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap ${
                activeFilter === 'today' && isSameDay(selectedDate, new Date())
                  ? 'text-[#ff6b00] dark:text-white border-b-2 border-[#ff6b00] dark:border-[#ff6b00]'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
              }`}
              onClick={() => {
                const today = new Date();
                handleDateChange(today);
                handleFilterChange('today');
                
                // Navigate to today's date to trigger server-side data fetch
                const dateString = format(today, 'yyyy-MM-dd');
                router.push(`${pathname}?date=${dateString}`);
              }}
            >
              I dag
            </button>
            <button
              className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap ${
                activeFilter === 'live'
                  ? 'text-[#ff6b00] dark:text-white border-b-2 border-[#ff6b00] dark:border-[#ff6b00]'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
              }`}
              onClick={() => {
                setSelectedDate(new Date());
                handleFilterChange('live');
              }}
            >
              Pågående
            </button>
            <button
              className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap ${
                activeFilter === 'tv'
                  ? 'text-[#ff6b00] dark:text-white border-b-2 border-[#ff6b00] dark:border-[#ff6b00]'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
              }`}
              onClick={() => {
                setSelectedDate(new Date());
                handleFilterChange('tv');
              }}
            >
              På TV
            </button>
            <button
              className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap ${
                activeFilter === 'favorites'
                  ? 'text-[#ff6b00] dark:text-white border-b-2 border-[#ff6b00] dark:border-[#ff6b00]'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
              }`}
              onClick={() => handleFilterChange('favorites')}
            >
              Favoritter {favorites.size > 0 && (
                <span className="ml-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-[#ff6b00] rounded-full">
                  {favorites.size}
                </span>
              )}
            </button>
            <button
              className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap ${
                isSameDay(selectedDate, (() => { const t = new Date(); t.setDate(t.getDate() + 1); return t; })())
                  ? 'text-[#ff6b00] dark:text-white border-b-2 border-[#ff6b00] dark:border-[#ff6b00]'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
              }`}
              onClick={() => {
                const tomorrow = new Date(selectedDate);
                tomorrow.setDate(selectedDate.getDate() + 1);
                handleDateChange(tomorrow);
                
                // Navigate to tomorrow's date to trigger server-side data fetch
                const dateString = format(tomorrow, 'yyyy-MM-dd');
                router.push(`${pathname}?date=${dateString}`);
              }}
            >
              I morgen
            </button>
          </div>
        </div>
      </div>

      {/* Title section with date and calendar */}
      <div className="px-3 lg:px-4 py-2 lg:py-3 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-[#141414]/90 backdrop-blur-sm z-10">
        <div className="flex items-baseline">
          <h2 className="text-base lg:text-lg font-semibold dark:text-white">{getSectionTitle()}</h2>
          <span className="ml-2 text-xs lg:text-sm text-gray-500 dark:text-gray-400">{getFormattedDate()}</span>
        </div>
        <CalendarIcon />
      </div>

      {/* League and fixtures sections - completely separate */}
      {Object.keys(groupedFixtures).length === 0 ? (
        <div className="p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            {activeFilter === 'favorites' ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            ) : (
              <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            )}
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {activeFilter === 'favorites' ? 'Ingen favoritter' : 'Ingen kamper'}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {activeFilter === 'favorites' 
              ? 'Du har ikke lagt til noen favoritter ennå.'
              : 'Det er ingen kamper å vise for valgt dato eller filter.'
            }
          </p>
        </div>
      ) : (
        Object.values(groupedFixtures).map((group: any) => (
          <div key={group.league.id}>
            {/* League header */}
            <div className="py-3 bg-[#f9fafb] dark:bg-[#111111]">
              <div className="px-3 lg:px-4 pb-2 flex items-center pt-2">
                {group.league.logo && (
                  <Image src={group.league.logo} alt={group.league.name} width={16} height={16} className="mr-3 h-4 w-4"/>
                )}
                <div className="flex-1">
                  <h3 className="text-xs font-semibold uppercase text-black dark:text-[#fdfdfd] tracking-wider">
                    {group.league.name}
                  </h3>
                  {(group.league.country || group.league.round) && (
                    <div className="text-[#868686] dark:text-[#aaa]" style={{ fontSize: '11px' }}>
                      {group.league.country && group.league.round 
                        ? `${group.league.country} | ${group.league.round}`
                        : group.league.country || group.league.round
                      }
                    </div>
                  )}
                </div>
                
                {/* TV indicator for the league */}
                {getStreamingProviders(group.league.id).length > 0 && (
                  <div className="ml-2 relative group">
                    <div className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 512 512" fill="currentColor">
                        <g>
                          <g>
                            <g>
                              <path d="M256,0C114.616,0,0,114.616,0,256s114.616,256,256,256c141.394,0,256-114.616,256-256S397.394,0,256,0z M256,460.8
                                c-112.927,0-204.8-91.873-204.8-204.8S143.073,51.2,256,51.2S460.8,143.073,460.8,256S368.927,460.8,256,460.8z"></path>
                              <path d="M349.112,238.08l-124.15-71.68c-17.07-9.851-31.037-1.792-31.037,17.92v143.36c0,19.712,13.967,27.781,31.037,17.92
                                l124.15-71.68C366.182,264.069,366.182,247.931,349.112,238.08z"></path>
                            </g>
                          </g>
                        </g>
                      </svg>
                    </div>
                    
                    <div className="absolute z-20 right-0 w-48 p-2 mt-1 bg-white dark:bg-[#222222] rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 text-xs border border-gray-200 dark:border-[#333333]">
                      <div className="font-semibold mb-1 dark:text-gray-100">Se kampen på:</div>
                      <div className="space-y-1">
                        {getStreamingProviders(group.league.id).map((provider, index) => (
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
              </div>
            </div>
            
            {/* Fixtures container */}
            <div className="space-y-2 px-3 lg:px-4 bg-[#f9fafb] dark:bg-[#111111]" style={{ paddingRight: '0.2rem', paddingBottom: '0.2rem' }}>
              {group.fixtures.map((fixture: FixtureData) => {
                const matchData = getMatchData(fixture);
                const fixtureId = fixture.fixture.id;
                const fixtureHref = `/fotball/kamp/${fixtureId}`;
                const isFavorite = favorites.has(fixtureId);

                const isLive = matchData && ['1H', 'HT', '2H', 'ET', 'P', 'LIVE'].includes(matchData.status.short);
                const isFinished = matchData && matchData.status.short === 'FT';

                return (
                  <Link 
                    key={fixtureId}
                    href={fixtureHref}
                    className={`flex items-center border-l-4 border-transparent hover:bg-gray-50 dark:hover:bg-[#222222] transition-colors duration-150 py-3 mr-3 rounded-lg bg-white dark:bg-[#181818] shadow-sm dark:shadow-none ${
                      isLive 
                        ? 'border-l-green-500 dark:border-l-[#ff6b00] rounded-l-lg' 
                        : ''
                    }`}
                  >
                    {/* Time/Status */}
                    <div className="w-16 flex items-center justify-center flex-shrink-0">
                      {isLive ? (
                        <span className="text-xs font-semibold text-green-600 dark:text-orange-500">
                          {matchData.status.elapsed !== null ? `${matchData.status.elapsed}'` : matchData.status.short}
                        </span>
                      ) : isFinished ? (
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                          {matchData.status.short}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {fixture.formattedTime}
                        </span>
                      )}
                    </div>
                    
                    {/* Teams stacked vertically */}
                    <div className="flex-1 flex items-center px-2">
                      <div className="flex flex-col space-y-1 flex-1 min-w-0">
                        {/* Home team */}
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 flex-shrink-0 relative">
                            <Image
                              src={fixture.teams.home.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')}
                              alt={fixture.teams.home.name}
                              fill
                              className="object-contain"
                              unoptimized
                            />
                          </div>
                          <span className="truncate text-[#656565] dark:text-[#aaa]" style={{ fontSize: '14px', fontWeight: '400' }}>
                            {fixture.teams.home.name}
                          </span>
                          {/* Red card indicator for home team */}
                          {fixture.event_data && fixture.event_data.filter((event: any) => 
                            event.team.id === fixture.teams.home.id && event.type === 'Card' && event.detail === 'Red Card'
                          ).length > 0 && (
                            <div className="flex space-x-1">
                              {fixture.event_data.filter((event: any) => 
                                event.team.id === fixture.teams.home.id && event.type === 'Card' && event.detail === 'Red Card'
                              ).map((redCard, index) => (
                                <div 
                                  key={index} 
                                  className="bg-red-600 flex-shrink-0 relative group cursor-help" 
                                  style={{ width: '.3rem', height: '.6rem', borderRadius: '0.09rem' }}
                                >
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-50">
                                    {redCard.time.elapsed}{redCard.time.extra ? `+${redCard.time.extra}` : ''}" - {redCard.player.name}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Away team */}
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 flex-shrink-0 relative">
                            <Image
                              src={fixture.teams.away.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net')}
                              alt={fixture.teams.away.name}
                              fill
                              className="object-contain"
                              unoptimized
                            />
                          </div>
                          <span className="truncate text-[#656565] dark:text-[#aaa]" style={{ fontSize: '14px', fontWeight: '400' }}>
                            {fixture.teams.away.name}
                          </span>
                          {/* Red card indicator for away team */}
                          {fixture.event_data && fixture.event_data.filter((event: any) => 
                            event.team.id === fixture.teams.away.id && event.type === 'Card' && event.detail === 'Red Card'
                          ).length > 0 && (
                            <div className="flex space-x-1">
                              {fixture.event_data.filter((event: any) => 
                                event.team.id === fixture.teams.away.id && event.type === 'Card' && event.detail === 'Red Card'
                              ).map((redCard, index) => (
                                <div 
                                  key={index} 
                                  className="bg-red-600 flex-shrink-0 relative group cursor-help" 
                                  style={{ width: '.3rem', height: '.6rem', borderRadius: '0.09rem' }}
                                >
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-50">
                                    {redCard.time.elapsed}{redCard.time.extra ? `+${redCard.time.extra}` : ''}" - {redCard.player.name}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Score on the right */}
                      <div className="flex flex-col items-center justify-center ml-6 flex-shrink-0">
                        {(isLive || isFinished) && matchData.goals ? (
                          <>
                            <span className="font-bold text-[#2b2b2b] dark:text-gray-100" style={{ fontSize: '14px' }}>
                              {matchData.goals.home !== null ? matchData.goals.home : '-'}
                            </span>
                            <span className="font-bold text-[#2b2b2b] dark:text-gray-100" style={{ fontSize: '14px' }}>
                              {matchData.goals.away !== null ? matchData.goals.away : '-'}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-[#2b2b2b] dark:text-gray-400" style={{ fontSize: '14px' }}>-</span>
                            <span className="text-[#2b2b2b] dark:text-gray-400" style={{ fontSize: '14px' }}>-</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Right side icons: Only Favorite now */}
                    <div className="flex items-center flex-shrink-0">
                      {/* Favorite button */}
                      <div className="w-6 flex items-center justify-center">
                        <button
                          onClick={(e) => toggleFavorite(fixtureId, e)}
                          onMouseEnter={(e) => showTooltip(e, isFavorite)}
                          onMouseLeave={hideTooltip}
                          onMouseDown={hideTooltip}
                          className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors duration-150"
                          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-3 w-3 transition-colors duration-150 ${
                              isFavorite 
                                ? 'text-yellow-500 fill-current' 
                                : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                            }`}
                            fill={isFavorite ? 'currentColor' : 'none'}
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Notification */}
      {notification.show && isClient && createPortal(
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-[#222222] text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 animate-slide-up">
            <span className="text-sm">{notification.message}</span>
            {notification.showViewButton && (
              <button
                onClick={handleViewFavorites}
                className="text-[#ff6b00] hover:text-[#ff8533] font-medium text-sm transition-colors duration-150"
              >
                Vis
              </button>
            )}
            <button
              onClick={() => setNotification(prev => ({ ...prev, show: false }))}
              className="text-gray-400 hover:text-white transition-colors duration-150"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Portal Tooltip */}
      {tooltipData.show && isClient && createPortal(
        <div
          className="fixed z-50 px-2 py-1 bg-[#222222] text-white rounded whitespace-nowrap pointer-events-none transition-opacity duration-200"
          style={{
            left: tooltipData.x,
            top: tooltipData.y,
            transform: 'translateX(-50%)',
            fontSize: '10px'
          }}
        >
          {tooltipData.text}
          <div 
            className="absolute left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#222222]"
            style={{ top: '100%' }}
          ></div>
        </div>,
        document.body
      )}
    </div>
  );
} 