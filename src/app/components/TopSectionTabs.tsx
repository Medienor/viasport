'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface TopSectionTabsProps {
  match: any;
}

export default function TopSectionTabs({ match }: TopSectionTabsProps) {
  const [activeTab, setActiveTab] = useState('fakta');
  const [showStickyClone, setShowStickyClone] = useState(false);
  const [tooltipData, setTooltipData] = useState<{
    show: boolean;
    text: string;
    x: number;
    y: number;
  }>({ show: false, text: '', x: 0, y: 0 });
  const tabsRef = useRef<HTMLDivElement>(null);

  // Calculate match timing
  const matchDateString = match.fixture?.date || match.date;
  const matchDate = matchDateString ? new Date(matchDateString) : null;
  const now = new Date();
  
  const isLive = ['1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE', 'INT', 'SUSP'].includes(match.status?.short || '');
  const isFinished = ['FT', 'AET', 'PEN', 'ABD', 'AWD', 'WO', 'CANC'].includes(match.status?.short || '');
  
  // Calculate time until match starts (in minutes)
  const minutesUntilMatch = matchDate ? Math.floor((matchDate.getTime() - now.getTime()) / (1000 * 60)) : 0;
  const isWithin10Minutes = minutesUntilMatch <= 10 && minutesUntilMatch > 0;

  // Tab availability logic
  const getTabAvailability = (tabId: string) => {
    switch (tabId) {
      case 'referat':
      case 'lag':
        return isFinished || isLive || isWithin10Minutes;
      case 'statistikk':
        return isFinished || isLive;
      default:
        return true; // fakta, tabell, lag-vs-lag are always available
    }
  };

  // Helper function to format time until availability
  const formatTimeUntil = (minutes: number) => {
    if (minutes <= 0) return '';
    
    if (minutes < 60) {
      return `${minutes} minutt${minutes !== 1 ? 'er' : ''}`;
    }
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} time${hours !== 1 ? 'r' : ''}`;
    }
    
    const days = Math.floor(hours / 24);
    if (days < 7) {
      return `${days} dag${days !== 1 ? 'er' : ''}`;
    }
    
    const weeks = Math.floor(days / 7);
    if (weeks < 4) {
      return `${weeks} uke${weeks !== 1 ? 'r' : ''}`;
    }
    
    const months = Math.floor(days / 30);
    return `${months} måned${months !== 1 ? 'er' : ''}`;
  };

  // Tooltip messages for disabled tabs
  const getTooltipMessage = (tabId: string) => {
    if (getTabAvailability(tabId)) return '';
    
    switch (tabId) {
      case 'referat':
      case 'lag':
        if (minutesUntilMatch > 10) {
          const timeUntilAvailable = minutesUntilMatch - 10;
          // If less than 30 minutes until match starts, show "snart"
          if (minutesUntilMatch < 30) {
            return 'Tilgjengelig snart';
          }
          return `Tilgjengelig om ${formatTimeUntil(timeUntilAvailable)}`;
        }
        return 'Tilgjengelig 10 minutter før kampstart';
      case 'statistikk':
        if (minutesUntilMatch > 0) {
          // If less than 30 minutes until match starts, show "snart"
          if (minutesUntilMatch < 30) {
            return 'Tilgjengelig snart';
          }
          return `Tilgjengelig om ${formatTimeUntil(minutesUntilMatch)}`;
        }
        return 'Tilgjengelig under live kamper';
      default:
        return '';
    }
  };

  // Handle tooltip show
  const showTooltip = useCallback((event: React.MouseEvent, text: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipData({
      show: true,
      text,
      x: rect.left + rect.width / 2,
      y: rect.top - 25
    });
  }, []);

  // Handle tooltip hide
  const hideTooltip = useCallback(() => {
    setTooltipData(prev => ({ ...prev, show: false }));
  }, []);

  const tabs = [
    { id: 'fakta', label: 'Fakta' },
    { id: 'referat', label: 'Referat' },
    { id: 'lag', label: 'Lag' },
    { id: 'tabell', label: 'Tabell' },
    { id: 'statistikk', label: 'Statistikk' },
    { id: 'lag-vs-lag', label: 'Lag vs Lag' }
  ];

  // Sort tabs: available first, then disabled
  const sortedTabs = [...tabs].sort((a, b) => {
    const aAvailable = getTabAvailability(a.id);
    const bAvailable = getTabAvailability(b.id);
    
    // If both have same availability, keep original order
    if (aAvailable === bAvailable) {
      return tabs.indexOf(a) - tabs.indexOf(b);
    }
    
    // Available tabs come first
    return bAvailable ? 1 : -1;
  });

  useEffect(() => {
    document.body.setAttribute('data-active-tab', activeTab);
  }, [activeTab]);

  // Listen for external tab changes
  useEffect(() => {
    const handleTabChange = () => {
      const currentTab = document.body.getAttribute('data-active-tab');
      if (currentTab && currentTab !== activeTab) {
        setActiveTab(currentTab);
      }
    };

    // Listen for attribute changes on body
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-active-tab') {
          handleTabChange();
        }
      });
    });

    observer.observe(document.body, { attributes: true });

    return () => observer.disconnect();
  }, [activeTab]);

  // Handle tab click with availability check
  const handleTabClick = (tabId: string, isFromStickyClone: boolean = false) => {
    if (getTabAvailability(tabId)) {
      setActiveTab(tabId);
      
      // Auto-scroll to content when changing tabs on mobile sticky clone
      if (isFromStickyClone && tabsRef.current && window.innerWidth < 1024) {
        // Get the position of the original tabs
        const tabsRect = tabsRef.current.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Calculate the position just below the original tabs
        const targetPosition = scrollTop + tabsRect.bottom + 40; // 40px padding for better spacing
        
        // Smooth scroll to the target position
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
        
        console.log('Auto-scrolling to content for tab:', tabId, 'at position:', targetPosition);
      }
    }
  };

  // Auto-switch to fakta if current tab becomes unavailable
  useEffect(() => {
    if (!getTabAvailability(activeTab)) {
      setActiveTab('fakta');
    }
  }, [minutesUntilMatch, isLive, isFinished, activeTab]);

  // Show/hide sticky clone based on scroll position
  useEffect(() => {
    if (!tabsRef.current) return;
    
    let isScrolling = false;
    
    const handleScroll = () => {
      if (!tabsRef.current || isScrolling) return;
      
      isScrolling = true;
      requestAnimationFrame(() => {
        if (!tabsRef.current) {
          isScrolling = false;
          return;
        }
        
        const tabsRect = tabsRef.current.getBoundingClientRect();
        const navbarHeight = 49;
        
        // Check if tabs have scrolled past the navbar on mobile
        if (window.innerWidth < 1024) {
          // Simple logic: Show clone when original tabs go behind navbar
          const shouldShowClone = tabsRect.bottom <= navbarHeight;
          
          setShowStickyClone(prevState => {
            if (prevState !== shouldShowClone) {
              console.log('Clone state change:', {
                from: prevState,
                to: shouldShowClone,
                tabsBottom: tabsRect.bottom,
                navbarHeight,
                reason: shouldShowClone ? 'tabs hidden' : 'tabs visible'
              });
              return shouldShowClone;
            }
            return prevState;
          });
        } else {
          // Desktop - always hide clone
          setShowStickyClone(prevState => {
            if (prevState) {
              console.log('Hiding clone on desktop');
              return false;
            }
            return prevState;
          });
        }
        
        isScrolling = false;
      });
    };

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setShowStickyClone(prevState => {
          if (prevState) {
            console.log('Hiding clone on resize to desktop');
            return false;
          }
          return prevState;
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    
    // Check initial position
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []); // Empty dependency array

  return (
    <>
      {/* Original tabs - always in natural position */}
      <div 
        ref={tabsRef}
        className="bg-white dark:bg-[#181818]"
      >
        {/* Tab Navigation */}
        <div className="dark:border-dark-border">
          <nav className="-mb-px flex space-x-8 overflow-x-auto px-4 md:px-6">
            {sortedTabs.map((tab) => {
              const isAvailable = getTabAvailability(tab.id);
              const tooltipMessage = getTooltipMessage(tab.id);
              
              return (
                <div
                  key={tab.id}
                  onMouseEnter={(event) => {
                    if (!isAvailable) {
                      showTooltip(event, tooltipMessage);
                    }
                  }}
                  onMouseLeave={() => {
                    if (!isAvailable) {
                      hideTooltip();
                    }
                  }}
                >
                  <button
                    onClick={() => handleTabClick(tab.id)}
                    disabled={!isAvailable}
                    className={`whitespace-nowrap py-3 px-1 border-b-[4px] font-medium text-[13px] sm:text-sm transition-colors ${
                      activeTab === tab.id && isAvailable
                        ? 'border-black dark:border-[#ff6b00] text-black dark:text-[#ff6b00] rounded-t-md'
                        : isAvailable
                        ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 cursor-pointer'
                        : 'border-transparent text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Sticky clone - only visible when scrolled past original */}
      {showStickyClone && (
        <div className="fixed top-[49px] left-0 right-0 z-40 lg:hidden bg-white dark:bg-[#181818]">
          {/* Tab Navigation Clone */}
          <div className="dark:border-dark-border">
            <nav className="-mb-px flex space-x-8 overflow-x-auto px-4 md:px-6">
              {sortedTabs.map((tab) => {
                const isAvailable = getTabAvailability(tab.id);
                
                return (
                  <div key={`clone-${tab.id}`}>
                    <button
                      onClick={() => handleTabClick(tab.id, true)}
                      disabled={!isAvailable}
                      className={`whitespace-nowrap py-3 px-1 border-b-[4px] font-medium text-[13px] sm:text-sm transition-colors ${
                        activeTab === tab.id && isAvailable
                          ? 'border-black dark:border-[#ff6b00] text-black dark:text-[#ff6b00] rounded-t-md'
                          : isAvailable
                          ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 cursor-pointer'
                          : 'border-transparent text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  </div>
                );
              })}
            </nav>
          </div>
        </div>
      )}
      
      {/* Spacer when clone is visible to prevent content jump */}
      {showStickyClone && (
        <div className="h-[52px] lg:hidden" />
      )}

      {/* Custom Tooltip */}
      {tooltipData.show && (
        <div
          className="fixed z-50 bg-[#222222] text-white rounded-lg shadow-lg pointer-events-none"
          style={{
            left: tooltipData.x,
            top: tooltipData.y,
            transform: 'translateX(-50%)',
            fontSize: '10px',
            padding: '8px 12px'
          }}
        >
          {tooltipData.text}
          <div 
            className="absolute left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#222222]"
            style={{ top: '100%' }}
          ></div>
        </div>
      )}
    </>
  );
} 