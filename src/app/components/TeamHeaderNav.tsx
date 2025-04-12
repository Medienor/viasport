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
  tabs: Tab[];
}

export default function TeamHeaderNav({ teamLogo, teamName, tabs }: TeamHeaderNavProps) {
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
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative h-16 w-16">
            <Image
              src={teamLogo || '/images/team-placeholder.png'}
              alt={teamName}
              fill
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold">{teamName}</h1>
        </div>
        {/* This div is observed */}
        <div ref={originalNavRef}>
          <TabNav tabs={tabs} />
        </div>
      </div>

      {/* Sticky TabNav (Visible only on mobile/tablet when original is scrolled past) */}
      {isStickyNavVisible && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-md lg:hidden">
          {/* Apply similar padding and overflow handling */}
          <div className="px-4 sm:px-0 overflow-x-auto no-scrollbar">
            <TabNav tabs={tabs} />
          </div>
        </div>
      )}
    </>
  );
} 