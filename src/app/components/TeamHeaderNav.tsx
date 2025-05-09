'use client'; // This component needs client-side hooks

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import TabNav from '@/app/components/TabNav'; // Import the existing TabNav

interface Tab {
  name: string;
  href: string;
}

interface TeamHeaderNavProps {
  teamLogo: string | null;
  teamName: string;
  teamCountry?: string;
  tabs: Tab[];
}

export default function TeamHeaderNav({ teamLogo, teamName, teamCountry, tabs }: TeamHeaderNavProps) {
  const [isStickyNavVisible, setIsStickyNavVisible] = useState(false);
  const originalNavRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show sticky nav only if the original nav is NOT intersecting AND window width is less than lg breakpoint (1024px)
        // We check width here to avoid showing sticky on desktop even if scrolled past
        const isMobileOrTablet = window.innerWidth < 1024;
        setIsStickyNavVisible(!entry.isIntersecting && isMobileOrTablet);
      },
      {
        root: null,
        threshold: 0,
        rootMargin: '-1px 0px 0px 0px' // Trigger just before it's fully out
      }
    );

    const currentRef = originalNavRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    // Optional: Add resize listener to hide sticky nav if window becomes large
    const handleResize = () => {
        if (window.innerWidth >= 1024 && isStickyNavVisible) {
            setIsStickyNavVisible(false);
        }
        // Re-evaluate visibility on resize if the observer isn't intersecting
        else if (currentRef && !observer.takeRecords()[0]?.isIntersecting && window.innerWidth < 1024) {
             setIsStickyNavVisible(true);
        } else if (currentRef && observer.takeRecords()[0]?.isIntersecting) {
             setIsStickyNavVisible(false); // Hide if original becomes visible again
        }
    };

    window.addEventListener('resize', handleResize);


    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
       window.removeEventListener('resize', handleResize);
    };
    // Re-run effect if isStickyNavVisible changes (for the resize listener logic)
  }, [isStickyNavVisible]);

  return (
    <>
      {/* Original Header and TabNav Section */}
      {/* Updated dark:bg-[#222222] and removed border in dark mode */}
      <div className="bg-white dark:bg-[#222222] rounded-lg border border-gray-200 dark:border-none pt-4 sm:pt-6 px-4 sm:px-6 mb-6">
        {/* Header Section: Logo, Name, Country */}
        {/* Use flex, justify-between for potential right-side content later */}
        {/* Keep bottom margin here for spacing between header and tabs */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3"> {/* Gap between logo and text */}
            <div className="relative h-10 w-10 flex-shrink-0"> {/* Adjusted logo size */}
              <Image
                src={teamLogo || '/images/team-placeholder.png'}
                alt={teamName}
                fill
                className="object-contain"
                priority // Prioritize loading the main team logo
              />
            </div>
            <div className="flex flex-col">
              {/* Added dark:text-white for dark mode */}
              <h1 className="text-xl font-bold leading-tight dark:text-white">{teamName}</h1> {/* Adjusted text size */}
              {teamCountry && (
                <span className="text-sm text-gray-500 dark:text-gray-400">{teamCountry}</span>
              )}
            </div>
          </div>
          {/* Placeholder for potential right-side buttons like 'Follow' */}
          {/* <div className="flex items-center gap-2"></div> */}
        </div>

        {/* Tab Navigation - Observed for sticky behavior */}
        {/* Removed top margin (mt-6) as spacing is handled by header's bottom margin (mb-6) */}
        {/* TabNav will now extend to the bottom padding edge of the parent */}
        <div ref={originalNavRef}>
          <TabNav tabs={tabs} />
        </div>
      </div>

      {/* Sticky TabNav (Visible only on mobile/tablet when original is scrolled past) */}
      {isStickyNavVisible && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#222222] border-t border-gray-200 dark:border-none shadow-md lg:hidden">
          {/* Apply similar padding and overflow handling */}
          <div className="px-4 sm:px-0 overflow-x-auto no-scrollbar">
            <TabNav tabs={tabs} />
          </div>
        </div>
      )}
    </>
  );
} 